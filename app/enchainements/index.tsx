import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { GrandesFiltresBar } from "../../src/components/GrandesFiltresBar";
import { PageHeader } from "../../src/components/PageHeader";
import {
  buildById,
  EMPTY_CHRONO_FILTERS,
  filterChronologie,
  type ChronoFilters,
} from "../../src/data/chronologie";
import { useEnchainementsData } from "../../src/data/EnchainementsProvider";
import { useEnchainementsSession } from "../../src/data/EnchainementsSessionContext";
import { useManuelData } from "../../src/data/ManuelProvider";
import { displayNom, pickRandomChain, shuffledOrder, type Decision } from "../../src/data/enchainements";
import { TRAIL } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

export default function EnchainementsSetupScreen() {
  const router = useRouter();
  const { cours } = useLocalSearchParams<{ cours?: string }>();
  const state = useEnchainementsData();
  const manuel = useManuelData();
  const { setSession } = useEnchainementsSession();
  const [draw, setDraw] = useState<Decision[] | null>(null);
  const [empty, setEmpty] = useState(false);
  const [filters, setFilters] = useState<ChronoFilters>(EMPTY_CHRONO_FILTERS);

  const chapterExercises =
    cours && manuel.status === "ready" ? manuel.exercises[cours] : undefined;
  const pool =
    state.status === "ready"
      ? cours && chapterExercises
        ? state.decisions.filter((d) => chapterExercises.jurisprudence.includes(d.nom))
        : state.decisions
      : [];
  const byId = useMemo(() => buildById(pool), [pool]);
  const decisions = useMemo(
    () => filterChronologie(pool, byId, filters),
    [pool, byId, filters]
  );

  const tirer = () => {
    const chain = pickRandomChain(decisions);
    setEmpty(!chain);
    setDraw(chain);
  };

  const start = () => {
    if (!draw) return;
    setSession({ items: shuffledOrder(draw) });
    router.push("/enchainements/session");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[...TRAIL.enchainements]} />
      {state.status === "loading" ? <LoadingScreen /> : null}
      {state.status === "error" ? (
        <ErrorScreen message={state.message} onRetry={state.reload} />
      ) : null}
      {state.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Enchaînements (chrono)logiques</Text>
          <Text style={styles.sub}>
            {chapterExercises
              ? `Fonds du chapitre « ${chapterExercises.title} » (${decisions.length} arrêt(s)).`
              : "Remettez un enchaînement de décisions liées dans l'ordre chronologique — dates cachées."}
            {state.source === "demo" ? " (démo)" : ""}
          </Text>

          <GrandesFiltresBar
            decisions={pool}
            filters={filters}
            onChange={setFilters}
            extra={
              <Pressable
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    relatedOnly: !prev.relatedOnly,
                  }))
                }
                style={[
                  styles.relatedToggle,
                  filters.relatedOnly && styles.relatedToggleOn,
                ]}
              >
                <Text
                  style={[
                    styles.relatedToggleText,
                    filters.relatedOnly && styles.relatedToggleTextOn,
                  ]}
                >
                  Uniquement les décisions liées
                </Text>
              </Pressable>
            }
          />

          <View style={styles.card}>
            <Pressable
              testID="draw-chain"
              style={styles.btnOutline}
              onPress={tirer}
            >
              <Text style={styles.btnOutlineText}>Tirer un enchaînement</Text>
            </Pressable>

            {empty ? (
              <Text style={styles.hint}>
                Aucun enchaînement disponible dans ce jeu de données.
              </Text>
            ) : null}

            {draw ? (
              <View style={styles.preview}>
                <Text style={styles.previewTitle}>
                  {draw.length} décisions liées :
                </Text>
                {draw.map((d) => (
                  <Text key={d.id} style={styles.previewItem}>
                    • {displayNom(d.nom, false)}
                  </Text>
                ))}
                <Pressable testID="start-session" style={styles.btn} onPress={start}>
                  <Text style={styles.btnText}>Commencer</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.title,
    marginBottom: 6,
    fontFamily: "serif",
  },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  btnOutline: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnOutlineText: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  hint: { color: colors.muted, fontSize: 13 },
  preview: { marginTop: 8, gap: 6 },
  previewTitle: { fontWeight: "700", color: colors.ink },
  previewItem: { color: colors.muted, fontSize: 13 },
  btn: {
    marginTop: 10,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  relatedToggle: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  relatedToggleOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  relatedToggleText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  relatedToggleTextOn: { color: "#fff" },
});
