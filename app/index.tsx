import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Accordion } from "../src/components/Accordion";
import { Chip } from "../src/components/Chip";
import { ErrorScreen, LoadingScreen } from "../src/components/DataStatus";
import { useAuth } from "../src/data/AuthContext";
import { useCardsData } from "../src/data/CardsProvider";
import { PAGE_TITLE } from "../src/data/config";
import { type Card } from "../src/data/cards";
import { useStudySession } from "../src/data/StudyContext";
import { useFilters } from "../src/hooks/useFilters";
import { colors } from "../src/theme/colors";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function HomeContent({
  allCards,
  allThemes,
  allNotions,
  presentImportanceLevels,
  colorForLabel,
  source,
}: {
  allCards: Card[];
  allThemes: string[];
  allNotions: string[];
  presentImportanceLevels: number[];
  colorForLabel: (label: string, group: "theme" | "notion") => string;
  source: "demo" | "member";
}) {
  const router = useRouter();
  const { setSession } = useStudySession();
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
  } = useFilters(allCards);

  const enterStudy = (cards: Card[], hint: string) => {
    if (!cards.length) return;
    setSession({ cards, hint });
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
      <Text style={styles.title}>{PAGE_TITLE}</Text>
      <Text style={styles.sub}>
        1 thème (choix unique), notions et importance — comme sur le web.
        Laissez vide pour tout le set ({allCards.length} cartes
        {source === "demo" ? " · démo" : ""}).
      </Text>

      <Pressable onPress={() => router.push("/relier")} style={styles.exerciseLink}>
        <Text style={styles.exerciseLinkText}>Autre exercice : Relier →</Text>
      </Pressable>

      <View style={styles.card}>
        <Accordion
          title="1 — Thèmes (1 seul choix)"
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

        <Accordion title="2 — Notions" onClear={() => clear("notion")}>
          <View style={styles.chips}>
            {allNotions.length ? (
              allNotions.map((n) => (
                <Chip
                  key={n}
                  label={n}
                  colorName={colorForLabel(n, "notion")}
                  selected={selectedNotions.includes(n)}
                  disabled={!isChipEnabled("notion", n)}
                  onPress={() => toggle("notion", n)}
                />
              ))
            ) : (
              <Text style={styles.emptyChips}>Aucun classificateur renseigné.</Text>
            )}
          </View>
        </Accordion>

        <Accordion
          title="3 — Importance"
          onClear={() => clear("importance")}
        >
          <View style={styles.chips}>
            {(presentImportanceLevels.length
              ? presentImportanceLevels
              : [1, 2, 3, 4]
            ).map((lvl) => (
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

function starsLabel(level: number): string {
  return level ? "★".repeat(level) : "";
}

function AccountBar() {
  const router = useRouter();
  const auth = useAuth();

  if (auth.status === "authenticated") {
    return (
      <View style={styles.accountBar}>
        <Text style={styles.accountText} numberOfLines={1}>
          Connecté · {auth.email}
        </Text>
        <Pressable testID="logout-link" onPress={() => auth.logout()}>
          <Text style={styles.accountAction}>Déconnexion</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.accountBar}>
      <Text style={styles.accountText}>Mode démo</Text>
      <Pressable testID="login-link" onPress={() => router.push("/login")}>
        <Text style={styles.accountAction}>Se connecter</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const cardsState = useCardsData();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AccountBar />
      {cardsState.status === "loading" ? <LoadingScreen /> : null}
      {cardsState.status === "error" ? (
        <ErrorScreen message={cardsState.message} onRetry={cardsState.reload} />
      ) : null}
      {cardsState.status === "ready" ? (
        <HomeContent
          allCards={cardsState.data.allCards}
          allThemes={cardsState.data.allThemes}
          allNotions={cardsState.data.allNotions}
          presentImportanceLevels={cardsState.data.presentImportanceLevels}
          colorForLabel={cardsState.data.colorForLabel}
          source={cardsState.source}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  accountBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  accountText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  accountAction: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  exerciseLink: { marginBottom: 14 },
  exerciseLinkText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 26,
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
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
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
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
