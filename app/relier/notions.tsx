import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Accordion } from "../../src/components/Accordion";
import { Chip } from "../../src/components/Chip";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { PageHeader } from "../../src/components/PageHeader";
import {
  DEFAULT_RELIER_SERIES,
  RelierSeriesPicker,
  resolveRelierBatchSize,
  type RelierSeriesSize,
} from "../../src/components/RelierSeriesPicker";
import { PAGE_TITLE_NOTIONS } from "../../src/data/config";
import {
  buildCoursIndex,
  catalogPresentFor,
  coursLabelsForTerm,
  type CoursTheme,
} from "../../src/data/coursThemes";
import { useDictionnaireData } from "../../src/data/DictionnaireProvider";
import { useManuelData } from "../../src/data/ManuelProvider";
import { useRelierDicoData } from "../../src/data/RelierDicoProvider";
import { filterRelierItems, pickBatch, type RelierItem } from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { SECTION } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

export default function RelierNotionsSetupScreen() {
  const router = useRouter();
  const { cours } = useLocalSearchParams<{ cours?: string }>();
  const relierState = useRelierDicoData();
  const dico = useDictionnaireData();
  const manuel = useManuelData();
  const { setSession } = useRelierSession();
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [selectedCours, setSelectedCours] = useState("");
  const [seriesSize, setSeriesSize] =
    useState<RelierSeriesSize>(DEFAULT_RELIER_SERIES);

  const chapterExercises =
    cours && manuel.status === "ready" ? manuel.exercises[cours] : undefined;

  useEffect(() => {
    if (chapterExercises?.title) setSelectedCours(chapterExercises.title);
  }, [chapterExercises?.title]);

  const { catalog, labelsForItem } = useMemo(() => {
    const empty = {
      catalog: [] as CoursTheme[],
      labelsForItem: (_item: RelierItem) => [] as string[],
    };
    if (dico.status !== "ready" || relierState.status !== "ready") return empty;
    const { byTerm, catalog: all } = buildCoursIndex(dico.entries);
    const labelsForItem = (item: RelierItem) =>
      coursLabelsForTerm(byTerm, item.recto, item.id, item.slug || "");
    const catalog = catalogPresentFor(all, (label) =>
      relierState.data.allItems.some((i) => labelsForItem(i).includes(label))
    );
    return { catalog, labelsForItem };
  }, [dico, relierState]);

  const filteredItems = useMemo(() => {
    if (relierState.status !== "ready") return [];
    const byLetter = filterRelierItems(relierState.data.allItems, {
      themes: selectedLetters,
    });
    if (!selectedCours) return byLetter;
    return byLetter.filter((i) => labelsForItem(i).includes(selectedCours));
  }, [relierState, selectedLetters, selectedCours, labelsForItem]);

  const start = () => {
    const n = resolveRelierBatchSize(seriesSize, filteredItems.length);
    if (n < 2) return;
    setSession({
      items: pickBatch(filteredItems, n),
      pack: "notions",
      pool: filteredItems,
      batchSize: n,
    });
    router.push("/relier/session");
  };

  const toggleLetter = (t: string) => {
    setSelectedLetters((prev) => (prev.includes(t) ? [] : [t]));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[SECTION.relationsNotions]} />
      {relierState.status === "loading" ? <LoadingScreen /> : null}
      {relierState.status === "error" ? (
        <ErrorScreen message={relierState.message} onRetry={relierState.reload} />
      ) : null}
      {relierState.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>Relations</Text>
          <Text style={styles.title}>Relations — Grandes notions</Text>
          <Text style={styles.sub}>
            {chapterExercises
              ? `Fonds du chapitre « ${chapterExercises.title} ». `
              : ""}
            {PAGE_TITLE_NOTIONS}. Reliez chaque notion à sa définition.
            {relierState.source === "demo" ? " (démo)" : ""}
          </Text>

          <View style={styles.card}>
            {catalog.length ? (
              <Accordion
                title="Thèmes (1 seul choix)"
                onClear={() => setSelectedCours("")}
                initiallyOpen={!selectedCours}
              >
                <View style={styles.chips}>
                  {catalog.map((t) => (
                    <Chip
                      key={t.label}
                      label={t.label}
                      colorName={t.color}
                      selected={selectedCours === t.label}
                      onPress={() =>
                        setSelectedCours((prev) =>
                          prev === t.label ? "" : t.label
                        )
                      }
                    />
                  ))}
                </View>
              </Accordion>
            ) : null}

            <Accordion
              title="Lettres (1 seul choix)"
              onClear={() => setSelectedLetters([])}
              initiallyOpen
            >
              <View style={styles.chips}>
                {relierState.data.allThemes.length ? (
                  relierState.data.allThemes.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      selected={selectedLetters.includes(t)}
                      onPress={() => toggleLetter(t)}
                    />
                  ))
                ) : (
                  <Text style={styles.emptyChips}>Aucune lettre.</Text>
                )}
              </View>
            </Accordion>

            <Text style={styles.count}>
              <Text style={styles.countNum}>{filteredItems.length}</Text> notion(s)
            </Text>

            <RelierSeriesPicker
              selected={seriesSize}
              onSelect={setSeriesSize}
              poolLength={filteredItems.length}
              onStart={start}
              startTestID="relier-notions-start"
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  emptyChips: { color: colors.muted, fontSize: 14 },
  count: { fontSize: 15, fontWeight: "600", color: colors.ink, marginTop: 4 },
  countNum: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "serif",
  },
});
