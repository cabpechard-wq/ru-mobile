import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorScreen } from "../../src/components/DataStatus";
import { GrandesFiltresBar } from "../../src/components/GrandesFiltresBar";
import { PageHeader } from "../../src/components/PageHeader";
import {
  EMPTY_ARRETS_FILTERS,
  filterDecisions,
  hasActiveArretsFilters,
  type ArretsFilters,
} from "../../src/data/arrets";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { displayNom, starsLabel, type Decision } from "../../src/data/decisions";
import { TRAIL } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

function DecisionRow({
  decision,
  onPress,
}: {
  decision: Decision;
  onPress: () => void;
}) {
  return (
    <Pressable testID={`arret-row-${decision.id}`} onPress={onPress} style={styles.row}>
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
        {decision.juridiction ? (
          <Text style={styles.rowJurid}>{decision.juridiction}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ArretsListScreen() {
  const router = useRouter();
  const state = useChronologieData();
  const [filters, setFilters] = useState<ArretsFilters>(EMPTY_ARRETS_FILTERS);

  const decisions = state.status === "ready" ? state.decisions : [];
  const filtersActive = hasActiveArretsFilters(filters);

  const filtered = useMemo(() => {
    if (!filtersActive) return [];
    return filterDecisions(decisions, filters);
  }, [decisions, filters, filtersActive]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[...TRAIL.arrets]} />
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
          <Text style={styles.centerTitle}>Fiches d'arrêts</Text>
          <Text style={styles.centerText}>
            Fonds complet : 995 décisions (~3 Mo).
          </Text>
          <Pressable testID="load-full" style={styles.btn} onPress={state.loadFull}>
            <Text style={styles.btnText}>Charger le fonds complet</Text>
          </Pressable>
        </View>
      ) : null}
      {state.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Fiches d'arrêts</Text>
          <Text style={styles.sub}>
            {filtersActive
              ? `${filtered.length} résultat(s) sur ${decisions.length}`
              : `${decisions.length} fiche(s) — choisissez un filtre pour afficher la liste`}
            {state.source === "demo" ? " · démo" : ""}.
          </Text>

          <GrandesFiltresBar
            decisions={decisions}
            filters={filters}
            onChange={setFilters}
          />

          {filtersActive ? (
            <View style={styles.list}>
              {filtered.map((d) => (
                <DecisionRow
                  key={d.id}
                  decision={d}
                  onPress={() =>
                    router.push(`/arrets/${d.slugFiche || d.id}` as never)
                  }
                />
              ))}
              {!filtered.length ? (
                <Text style={styles.empty}>
                  Aucune fiche ne correspond aux filtres.
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.empty}>
              Saisissez une recherche, une référence, ou ouvrez le filtre
              avancé pour afficher les fiches.
            </Text>
          )}
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
  filtersCard: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  list: { gap: 8 },
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
  rowJurid: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 12 },
});
