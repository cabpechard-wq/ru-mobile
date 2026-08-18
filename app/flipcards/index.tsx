import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { GrandesFiltresBar } from "../../src/components/GrandesFiltresBar";
import { PageHeader } from "../../src/components/PageHeader";
import {
  decisionFromCard,
  EMPTY_ARRETS_FILTERS,
  filterDecisions,
  hasActiveArretsFilters,
  matchDecision,
  type ArretsFilters,
} from "../../src/data/arrets";
import { useCardsData } from "../../src/data/CardsProvider";
import { PAGE_TITLE } from "../../src/data/config";
import { type Card } from "../../src/data/cards";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { fondsRatio, useFondsMeta } from "../../src/data/fondsMeta";
import { TRAIL } from "../../src/data/sections";
import { useStudySession } from "../../src/data/StudyContext";
import { colors } from "../../src/theme/colors";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function FlipcardsContent({
  allCards,
  source,
}: {
  allCards: Card[];
  source: "demo" | "member";
}) {
  const router = useRouter();
  const { setSession } = useStudySession();
  const chrono = useChronologieData();
  const fonds = useFondsMeta();
  const [filters, setFilters] = useState<ArretsFilters>(EMPTY_ARRETS_FILTERS);
  const chronoDecisions = chrono.status === "ready" ? chrono.decisions : [];

  const mapped = useMemo(
    () =>
      allCards.map((c) =>
        decisionFromCard(c, matchDecision(chronoDecisions, { id: c.id, nom: c.recto }))
      ),
    [allCards, chronoDecisions]
  );

  const filteredCards = useMemo(() => {
    if (!hasActiveArretsFilters(filters)) return allCards;
    const kept = new Set(filterDecisions(mapped, filters).map((d) => d.id));
    return allCards.filter((c) => kept.has(c.id));
  }, [allCards, mapped, filters]);

  const count = filteredCards.length;
  const selectionHint = hasActiveArretsFilters(filters)
    ? "Filtres Grandes décisions"
    : "Tout le set";

  const enterStudy = (cards: Card[], hint: string) => {
    if (!cards.length) return;
    setSession({
      cards,
      hint,
      selectedIds: cards.map((c) => c.id || c.recto),
      pack: "arrets",
    });
    router.push("/study");
  };

  const startAll = () => {
    const cards = shuffle(filteredCards);
    enterStudy(cards, `${selectionHint} · ${cards.length} carte(s)`);
  };

  const startRandom10 = () => {
    const pool = shuffle(filteredCards);
    const cards = pool.slice(0, Math.min(10, pool.length));
    const hint =
      "10 au hasard" +
      (filteredCards.length < 10 ? ` (${cards.length})` : "") +
      ` · ${selectionHint}`;
    enterStudy(cards, hint);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.kicker}>Flipcards</Text>
      <Text style={styles.title}>{PAGE_TITLE}</Text>
      <Text style={styles.sub}>
        Recherche, référence et filtre avancé — comme sur le site. Laissez vide
        pour tout le set (
        {fondsRatio(
          allCards.length,
          fonds.jurisprudence,
          source !== "demo"
        )}{" "}
        cartes).
      </Text>

      <GrandesFiltresBar
        decisions={mapped}
        filters={filters}
        onChange={setFilters}
      />

      <View style={styles.card}>
        <View style={styles.footer}>
          <View style={styles.countBlock}>
            <Text style={styles.count}>
              <Text style={styles.countNum}>{count}</Text> carte(s)
            </Text>
            <Text style={styles.hint}>{selectionHint}</Text>
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

export default function FlipcardsGrandsArretsScreen() {
  const cardsState = useCardsData();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[...TRAIL.flipcardsArrets]} />
      {cardsState.status === "loading" ? <LoadingScreen /> : null}
      {cardsState.status === "error" ? (
        <ErrorScreen message={cardsState.message} onRetry={cardsState.reload} />
      ) : null}
      {cardsState.status === "ready" ? (
        <FlipcardsContent
          allCards={cardsState.data.allCards}
          source={cardsState.source}
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
