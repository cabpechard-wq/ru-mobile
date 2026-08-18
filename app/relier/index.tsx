import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { GrandesFiltresBar } from "../../src/components/GrandesFiltresBar";
import { PageHeader } from "../../src/components/PageHeader";
import {
  DEFAULT_RELIER_SERIES,
  RelierSeriesPicker,
  resolveRelierBatchSize,
  type RelierSeriesSize,
} from "../../src/components/RelierSeriesPicker";
import {
  decisionFromRelierLike,
  EMPTY_ARRETS_FILTERS,
  filterDecisions,
  hasActiveArretsFilters,
  matchDecision,
  type ArretsFilters,
} from "../../src/data/arrets";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { fondsRatio, useFondsMeta } from "../../src/data/fondsMeta";
import { useManuelData } from "../../src/data/ManuelProvider";
import { useRelierData } from "../../src/data/RelierProvider";
import { pickBatch, type RelierItem } from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { TRAIL } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

export default function RelierSetupScreen() {
  const router = useRouter();
  const { cours } = useLocalSearchParams<{ cours?: string }>();
  const relierState = useRelierData();
  const fonds = useFondsMeta();
  const manuel = useManuelData();
  const chrono = useChronologieData();
  const { setSession } = useRelierSession();
  const [filters, setFilters] = useState<ArretsFilters>(EMPTY_ARRETS_FILTERS);
  const [seriesSize, setSeriesSize] =
    useState<RelierSeriesSize>(DEFAULT_RELIER_SERIES);
  const chronoDecisions = chrono.status === "ready" ? chrono.decisions : [];

  const chapterExercises =
    cours && manuel.status === "ready" ? manuel.exercises[cours] : undefined;

  const chapterItems: RelierItem[] | undefined = useMemo(() => {
    if (!cours || relierState.status !== "ready" || !chapterExercises) return undefined;
    const names = new Set(chapterExercises.jurisprudence);
    return relierState.data.allItems.filter((i) => names.has(i.recto));
  }, [cours, chapterExercises, relierState]);

  const filteredItems = useMemo(() => {
    if (relierState.status !== "ready") return [];
    const base = chapterItems ?? relierState.data.allItems;
    if (!hasActiveArretsFilters(filters)) return base;
    const mapped = base.map((item) =>
      decisionFromRelierLike(
        item,
        matchDecision(chronoDecisions, { id: item.id, nom: item.recto })
      )
    );
    const kept = new Set(filterDecisions(mapped, filters).map((d) => d.id));
    return base.filter((i) => kept.has(i.id));
  }, [relierState, chapterItems, filters, chronoDecisions]);

  const start = () => {
    const n = resolveRelierBatchSize(seriesSize, filteredItems.length);
    if (n < 2) return;
    setSession({
      items: pickBatch(filteredItems, n),
      pack: "arrets",
      pool: filteredItems,
      batchSize: n,
    });
    router.push("/relier/session");
  };

  const mappedForBar = useMemo(() => {
    if (relierState.status !== "ready") return [];
    const base = chapterItems ?? relierState.data.allItems;
    return base.map((item) =>
      decisionFromRelierLike(
        item,
        matchDecision(chronoDecisions, { id: item.id, nom: item.recto })
      )
    );
  }, [relierState, chapterItems, chronoDecisions]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[...TRAIL.relationsArrets]} />
      {relierState.status === "loading" ? <LoadingScreen /> : null}
      {relierState.status === "error" ? (
        <ErrorScreen message={relierState.message} onRetry={relierState.reload} />
      ) : null}
      {relierState.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>Relations</Text>
          <Text style={styles.title}>Relations — Grands arrêts</Text>
          <Text style={styles.sub}>
            {chapterExercises ? (
              `Fonds du chapitre « ${chapterExercises.title} » (${chapterItems?.length ?? 0} arrêt(s)).`
            ) : (
              <>
                Hub Relations : Grands arrêts ·{" "}
                <Text
                  style={styles.inlineLink}
                  onPress={() => router.push("/relier/notions" as never)}
                >
                  Grandes notions
                </Text>
                . Associez chaque décision (
                {fondsRatio(
                  relierState.data.allItems.length,
                  fonds.jurisprudence,
                  relierState.source !== "demo"
                )}
                ) à son objet. Touchez un élément à gauche, puis sa
                correspondance à droite.
              </>
            )}
          </Text>

          <View style={styles.card}>
            <GrandesFiltresBar
              decisions={mappedForBar}
              filters={filters}
              onChange={setFilters}
            />

            <Text style={styles.count}>
              <Text style={styles.countNum}>{filteredItems.length}</Text> carte(s)
            </Text>

            {chapterItems && chapterItems.length < 2 ? (
              <Text style={styles.hint}>
                Pas assez d'arrêts dans ce chapitre pour un exercice Relier.
              </Text>
            ) : null}

            <RelierSeriesPicker
              selected={seriesSize}
              onSelect={setSeriesSize}
              poolLength={filteredItems.length}
              onStart={start}
              startTestID="relier-start"
            />
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.title,
    marginBottom: 6,
    fontFamily: "serif",
  },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  inlineLink: { color: colors.accent, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 10,
  },
  count: { fontSize: 15, fontWeight: "600", color: colors.ink, marginTop: 4 },
  countNum: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "serif",
  },
  hint: { color: colors.muted, fontSize: 13 },
});
