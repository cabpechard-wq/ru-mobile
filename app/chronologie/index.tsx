import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Accordion } from "../../src/components/Accordion";
import { ErrorScreen } from "../../src/components/DataStatus";
import { buildById, groupByDecade, relationCount, searchDecisions } from "../../src/data/chronologie";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { displayNom, starsLabel, type Decision } from "../../src/data/decisions";
import { colors } from "../../src/theme/colors";

function DecisionRow({
  decision,
  relCount,
  onPress,
}: {
  decision: Decision;
  relCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable testID={`decision-row-${decision.id}`} onPress={onPress} style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowNom} numberOfLines={1}>
          {displayNom(decision.nom, true)}
        </Text>
        {decision.objet ? (
          <Text style={styles.rowObjet} numberOfLines={1}>
            {decision.objet}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowMeta}>
        {starsLabel(decision.importance) ? (
          <Text style={styles.rowStars}>{starsLabel(decision.importance)}</Text>
        ) : null}
        {relCount > 0 ? (
          <Text style={styles.rowLinks}>🔗 {relCount}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ChronologieListScreen() {
  const router = useRouter();
  const state = useChronologieData();
  const [query, setQuery] = useState("");

  const byId = useMemo(
    () => (state.status === "ready" ? buildById(state.decisions) : new Map()),
    [state]
  );
  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    return searchDecisions(state.decisions, query);
  }, [state, query]);
  const groups = useMemo(() => groupByDecade(filtered), [filtered]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {state.status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.centerText}>Chargement…</Text>
        </View>
      ) : null}
      {state.status === "error" ? (
        <ErrorScreen message={state.message} onRetry={state.reload} />
      ) : null}
      {state.status === "idle-full" ? (
        <View style={styles.center}>
          <Text style={styles.centerTitle}>Chronologie</Text>
          <Text style={styles.centerText}>
            Fonds complet : 995 décisions liées entre elles (~3 Mo).
          </Text>
          <Pressable testID="load-full" style={styles.btn} onPress={state.loadFull}>
            <Text style={styles.btnText}>Charger le fonds complet</Text>
          </Pressable>
        </View>
      ) : null}
      {state.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Accueil</Text>
          </Pressable>
          <Text style={styles.title}>Chronologie</Text>
          <Text style={styles.sub}>
            {state.decisions.length} décisions, par ordre chronologique.
            Le repère 🔗 signale une décision liée à d'autres.
            {state.source === "demo" ? " (démo)" : ""}
          </Text>

          <TextInput
            style={styles.search}
            placeholder="Rechercher (nom, thème, notion…)"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />

          {groups.map((g) => (
            <Accordion key={g.decade} title={`${g.decade}s (${g.items.length})`}>
              <View style={styles.groupList}>
                {g.items.map((d) => (
                  <DecisionRow
                    key={d.id}
                    decision={d}
                    relCount={relationCount(byId, d.id)}
                    onPress={() => router.push(`/chronologie/${d.id}`)}
                  />
                ))}
              </View>
            </Accordion>
          ))}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  centerTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, fontFamily: "serif" },
  centerText: { color: colors.muted, fontSize: 14, textAlign: "center" },
  btn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  scroll: { padding: 16, paddingBottom: 40 },
  back: { paddingBottom: 12 },
  backText: { color: colors.accent, fontWeight: "600" },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.title,
    marginBottom: 6,
    fontFamily: "serif",
  },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.card,
    marginBottom: 14,
  },
  groupList: { gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowMain: { flex: 1, gap: 2 },
  rowNom: { fontWeight: "700", color: colors.ink, fontSize: 13 },
  rowObjet: { color: colors.muted, fontSize: 12 },
  rowMeta: { alignItems: "flex-end", gap: 2 },
  rowStars: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  rowLinks: { color: colors.muted, fontSize: 11, fontWeight: "600" },
});
