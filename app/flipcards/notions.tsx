import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Accordion } from "../../src/components/Accordion";
import { Chip } from "../../src/components/Chip";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { PageHeader } from "../../src/components/PageHeader";
import { type Card } from "../../src/data/cards";
import { PAGE_TITLE_NOTIONS } from "../../src/data/config";
import {
  buildCoursIndex,
  catalogPresentFor,
  coursLabelsForTerm,
  type CoursTheme,
} from "../../src/data/coursThemes";
import { useDictionnaireData } from "../../src/data/DictionnaireProvider";
import { useFlipcardsDicoData } from "../../src/data/FlipcardsDicoProvider";
import { fondsRatio, useFondsMeta } from "../../src/data/fondsMeta";
import { useManuelData } from "../../src/data/ManuelProvider";
import { TRAIL } from "../../src/data/sections";
import { useStudySession } from "../../src/data/StudyContext";
import { useFilters } from "../../src/hooks/useFilters";
import { colors } from "../../src/theme/colors";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function starsLabel(level: number): string {
  return level ? "★".repeat(level) : "";
}

function FlipcardsNotionsContent({
  allCards,
  allThemes,
  allNotions,
  presentImportanceLevels,
  colorForLabel,
  source,
  coursCatalog,
  labelsForCard,
  initialCoursTheme,
  chapterHint,
}: {
  allCards: Card[];
  allThemes: string[];
  allNotions: string[];
  presentImportanceLevels: number[];
  colorForLabel: (label: string, group: "theme" | "notion") => string;
  source: "demo" | "member";
  coursCatalog: CoursTheme[];
  labelsForCard: (card: Card) => string[];
  initialCoursTheme: string;
  chapterHint?: string;
}) {
  const router = useRouter();
  const { setSession } = useStudySession();
  const fonds = useFondsMeta();
  const [selectedCours, setSelectedCours] = useState(initialCoursTheme);

  useEffect(() => {
    if (initialCoursTheme) setSelectedCours(initialCoursTheme);
  }, [initialCoursTheme]);

  const cardsForCours = useMemo(() => {
    if (!selectedCours) return allCards;
    return allCards.filter((c) => labelsForCard(c).includes(selectedCours));
  }, [allCards, labelsForCard, selectedCours]);

  const {
    selectedThemes,
    selectedNotions,
    selectedImportance,
    filteredCards,
    count,
    isChipEnabled,
    toggle,
    clear,
    selectionHint,
  } = useFilters(cardsForCours);

  const hintPrefix = selectedCours
    ? selectionHint.startsWith("Tout le set")
      ? selectedCours
      : `${selectedCours} · ${selectionHint}`
    : selectionHint;

  const enterStudy = (cards: Card[], hint: string) => {
    if (!cards.length) return;
    setSession({
      cards,
      hint,
      selectedIds: cards.map((c) => c.id || c.recto),
      pack: "notions",
    });
    router.push("/study");
  };

  const startAll = () => {
    const cards = shuffle(filteredCards);
    enterStudy(cards, `${hintPrefix} · ${cards.length} carte(s)`);
  };

  const startRandom10 = () => {
    const pool = shuffle(filteredCards);
    const cards = pool.slice(0, Math.min(10, pool.length));
    const hint =
      "10 au hasard" +
      (filteredCards.length < 10 ? ` (${cards.length})` : "") +
      ` · ${hintPrefix}`;
    enterStudy(cards, hint);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.kicker}>Flipcards</Text>
      <Text style={styles.title}>{PAGE_TITLE_NOTIONS}</Text>
      <Text style={styles.sub}>
        {chapterHint
          ? `${chapterHint}. `
          : ""}
        Thème = pages du Cours (un seul choix), puis lettre — comme sur le web.
        Laissez vide pour tout le set (
        {fondsRatio(
          allCards.length,
          fonds.dictionnaire,
          source !== "demo"
        )}{" "}
        cartes).
      </Text>

      <View style={styles.card}>
        {coursCatalog.length ? (
          <Accordion
            title="1 — Thèmes (1 seul choix)"
            onClear={() => setSelectedCours("")}
            initiallyOpen={!selectedCours}
          >
            <View style={styles.chips}>
              {coursCatalog.map((t) => (
                <Chip
                  key={t.label}
                  label={t.label}
                  colorName={t.color}
                  selected={selectedCours === t.label}
                  onPress={() =>
                    setSelectedCours((prev) => (prev === t.label ? "" : t.label))
                  }
                />
              ))}
            </View>
          </Accordion>
        ) : null}

        <Accordion
          title={`${coursCatalog.length ? "2" : "1"} — Lettres (1 seul choix)`}
          onClear={() => clear("theme")}
        >
          <View style={styles.chips}>
            {allThemes.length ? (
              allThemes.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  colorName={colorForLabel(t, "theme")}
                  selected={selectedThemes.includes(t)}
                  disabled={!isChipEnabled("theme", t)}
                  onPress={() => toggle("theme", t)}
                />
              ))
            ) : (
              <Text style={styles.emptyChips}>Aucun classificateur renseigné.</Text>
            )}
          </View>
        </Accordion>

        {allNotions.length ? (
          <Accordion
            title={`${coursCatalog.length ? "3" : "2"} — Notions`}
            onClear={() => clear("notion")}
          >
            <View style={styles.chips}>
              {allNotions.map((n) => (
                <Chip
                  key={n}
                  label={n}
                  colorName={colorForLabel(n, "notion")}
                  selected={selectedNotions.includes(n)}
                  disabled={!isChipEnabled("notion", n)}
                  onPress={() => toggle("notion", n)}
                />
              ))}
            </View>
          </Accordion>
        ) : null}

        {presentImportanceLevels.length ? (
          <Accordion
            title={`${coursCatalog.length ? "4" : "3"} — Importance`}
            onClear={() => clear("importance")}
          >
            <View style={styles.chips}>
              {presentImportanceLevels.map((lvl) => (
                <Chip
                  key={lvl}
                  label={starsLabel(lvl)}
                  colorName="default"
                  selected={selectedImportance.includes(lvl)}
                  disabled={!isChipEnabled("importance", lvl)}
                  onPress={() => toggle("importance", lvl)}
                />
              ))}
            </View>
          </Accordion>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.countBlock}>
            <Text style={styles.count}>
              <Text style={styles.countNum}>{count}</Text> carte(s)
            </Text>
            <Text style={styles.hint}>{hintPrefix}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={startRandom10}
              disabled={!count}
              style={[styles.btnRandom, !count && styles.btnDisabled]}
            >
              <Text style={styles.btnRandomText}>10 au hasard…</Text>
            </Pressable>
            <Pressable
              onPress={startAll}
              disabled={!count}
              style={[styles.btn, !count && styles.btnDisabled]}
            >
              <Text style={styles.btnText}>Étudier</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export default function FlipcardsNotionsScreen() {
  const { cours } = useLocalSearchParams<{ cours?: string }>();
  const cardsState = useFlipcardsDicoData();
  const dico = useDictionnaireData();
  const manuel = useManuelData();

  const chapterExercises =
    cours && manuel.status === "ready" ? manuel.exercises[cours] : undefined;

  const { catalog, labelsForCard } = useMemo(() => {
    const empty = {
      catalog: [] as CoursTheme[],
      labelsForCard: (_card: Card) => [] as string[],
    };
    if (dico.status !== "ready" || cardsState.status !== "ready") return empty;
    const { byTerm, catalog: all } = buildCoursIndex(dico.entries);
    const labelsForCard = (card: Card) =>
      coursLabelsForTerm(byTerm, card.recto, card.id);
    const catalog = catalogPresentFor(all, (label) =>
      cardsState.data.allCards.some((c) => labelsForCard(c).includes(label))
    );
    return { catalog, labelsForCard };
  }, [dico, cardsState]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[...TRAIL.flipcardsNotions]} />
      {cardsState.status === "loading" ? <LoadingScreen /> : null}
      {cardsState.status === "error" ? (
        <ErrorScreen message={cardsState.message} onRetry={cardsState.reload} />
      ) : null}
      {cardsState.status === "ready" ? (
        <FlipcardsNotionsContent
          allCards={cardsState.data.allCards}
          allThemes={cardsState.data.allThemes}
          allNotions={cardsState.data.allNotions}
          presentImportanceLevels={cardsState.data.presentImportanceLevels}
          colorForLabel={cardsState.data.colorForLabel}
          source={cardsState.source}
          coursCatalog={catalog}
          labelsForCard={labelsForCard}
          initialCoursTheme={chapterExercises?.title ?? ""}
          chapterHint={
            chapterExercises
              ? `Fonds du chapitre « ${chapterExercises.title} »`
              : undefined
          }
        />
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
    letterSpacing: -0.4,
    fontFamily: "serif",
  },
  sub: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    maxWidth: 520,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  emptyChips: { color: colors.muted, fontSize: 14 },
  footer: {
    gap: 14,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  countBlock: { gap: 2 },
  count: { fontSize: 16, fontWeight: "600", color: colors.ink },
  countNum: {
    color: colors.accent,
    fontSize: 19,
    fontWeight: "700",
    fontFamily: "serif",
  },
  hint: { color: colors.muted, fontSize: 13, fontWeight: "500" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  btn: {
    flexGrow: 1,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnRandom: {
    flexGrow: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnRandomText: { color: colors.ink, fontWeight: "700", fontSize: 15 },
});
