import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "../../src/components/PageHeader";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { formatDateFr } from "../../src/data/decisions";
import { derangement, type RelierItem } from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { SECTION } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

/** Chiffres de relation — plus gros, lisibles au tactile. */
const BADGE_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

function ficheSlug(item: RelierItem): string | null {
  if (item.slug && /^(ce|tc|cons|cass|caa|cedh)/i.test(item.slug)) {
    return item.slug;
  }
  if (/^(ce|tc|cons|cass|caa|cedh)/i.test(item.id)) return item.id;
  if (item.slug) return item.slug;
  return null;
}

/** Année extraite du nom « CE, 1875, Prince Napoléon ». */
function yearFromRecto(recto: string): string | null {
  const m = (recto || "").match(/,\s*(\d{4})\s*,/);
  return m ? m[1] : null;
}

export default function RelierSessionScreen() {
  const router = useRouter();
  const { session } = useRelierSession();
  const chrono = useChronologieData();
  const items = session.items;
  const pack = session.pack || "arrets";
  const sectionLabel =
    pack === "notions" ? SECTION.relationsNotions : SECTION.relationsArrets;

  const rightOrder = useMemo(() => derangement(items), [items]);

  const [pairs, setPairs] = useState<Record<string, number>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const dateBySlug = useMemo(() => {
    const map = new Map<string, string>();
    if (chrono.status === "ready") {
      chrono.decisions.forEach((d) => {
        if (d.date) {
          map.set(d.id, d.date);
          if (d.slugFiche) map.set(d.slugFiche, d.date);
        }
      });
    }
    return map;
  }, [chrono]);

  const usedRightIndices = new Set(Object.values(pairs));

  const tapLeft = (item: RelierItem) => {
    if (revealed) return;
    // Modifier une paire annule la vérification.
    if (verified) setVerified(false);
    setSelectedLeft((cur) => (cur === item.id ? null : item.id));
  };

  const tapRight = (index: number) => {
    if (revealed) return;
    if (!selectedLeft) return;
    if (verified) setVerified(false);
    setPairs((prev) => {
      const next = { ...prev };
      for (const [leftId, idx] of Object.entries(next)) {
        if (idx === index && leftId !== selectedLeft) delete next[leftId];
      }
      next[selectedLeft] = index;
      return next;
    });
    setSelectedLeft(null);
  };

  const reset = () => {
    setPairs({});
    setSelectedLeft(null);
    setVerified(false);
    setRevealed(false);
  };

  const verify = () => {
    setVerified(true);
    setRevealed(false);
  };

  const showAnswers = () => {
    // Place chaque gauche sur la bonne cible + marque vérifié.
    const next: Record<string, number> = {};
    items.forEach((item) => {
      const idx = rightOrder.findIndex((r) => r.id === item.id);
      if (idx >= 0) next[item.id] = idx;
    });
    setPairs(next);
    setSelectedLeft(null);
    setVerified(true);
    setRevealed(true);
  };

  const correctCount = items.filter((item) => {
    const idx = pairs[item.id];
    if (idx === undefined) return false;
    return rightOrder[idx].id === item.id;
  }).length;

  const exactDateFor = (item: RelierItem): string | null => {
    const slug = ficheSlug(item);
    if (slug && dateBySlug.has(slug)) {
      return formatDateFr(dateBySlug.get(slug));
    }
    const y = yearFromRecto(item.recto);
    return y;
  };

  if (!items.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader trail={[sectionLabel, "Exercice"]} />
        <Text style={styles.empty}>Aucune série en cours.</Text>
      </SafeAreaView>
    );
  }

  const showResult = verified || revealed;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader
        trail={[sectionLabel, "Exercice"]}
        right={
          <Text style={styles.summary} numberOfLines={1}>
            {Object.keys(pairs).length} / {items.length} reliés
          </Text>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.hint}>
          {selectedLeft
            ? "Touchez la correspondance à droite."
            : "Touchez un élément à gauche, puis sa correspondance."}
        </Text>

        <View style={styles.columns}>
          <View style={styles.column}>
            {items.map((item) => {
              const pairedIndex = pairs[item.id];
              const isSelected = selectedLeft === item.id;
              const isPaired = pairedIndex !== undefined;
              const isCorrect =
                showResult && isPaired
                  ? rightOrder[pairedIndex].id === item.id
                  : null;
              return (
                <Pressable
                  key={item.id}
                  testID={`relier-left-${item.id}`}
                  onPress={() => tapLeft(item)}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isPaired && !showResult && styles.cellPaired,
                    isCorrect === true && styles.cellCorrect,
                    isCorrect === false && styles.cellWrong,
                  ]}
                >
                  {isPaired ? (
                    <View
                      style={[
                        styles.badge,
                        isCorrect === true && styles.badgeOk,
                        isCorrect === false && styles.badgeBad,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {BADGE_NUMBERS[pairedIndex] || "•"}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.cellText}>{item.recto}</Text>
                  {isCorrect === true && pack === "arrets" ? (
                    <View style={styles.okMeta}>
                      {exactDateFor(item) ? (
                        <Text style={styles.okDate}>{exactDateFor(item)}</Text>
                      ) : null}
                      {ficheSlug(item) ? (
                        <Text
                          style={styles.okFiche}
                          onPress={() =>
                            router.push(`/arrets/${ficheSlug(item)}`)
                          }
                        >
                          Fiche d'arrêt →
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.column}>
            {rightOrder.map((item, index) => {
              const isUsed = usedRightIndices.has(index);
              const pairedLeftId = Object.entries(pairs).find(
                ([, idx]) => idx === index
              )?.[0];
              const isCorrect =
                showResult && pairedLeftId
                  ? item.id === pairedLeftId
                  : showResult && !pairedLeftId
                    ? false
                    : null;
              return (
                <Pressable
                  key={item.id}
                  testID={`relier-right-${index}`}
                  onPress={() => tapRight(index)}
                  style={[
                    styles.cell,
                    isUsed && !showResult && styles.cellPaired,
                    isCorrect === true && styles.cellCorrect,
                    isCorrect === false && styles.cellWrong,
                  ]}
                >
                  {isUsed ? (
                    <View
                      style={[
                        styles.badge,
                        isCorrect === true && styles.badgeOk,
                        isCorrect === false && styles.badgeBad,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {BADGE_NUMBERS[index] || "•"}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.cellText}>{item.objet}</Text>
                  {revealed && isCorrect !== true ? (
                    <Text style={styles.answerHint}>→ {item.recto}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {showResult ? (
          <Text style={styles.score}>
            {correctCount} / {items.length} correct(es)
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.btnOutline} onPress={reset}>
            <Text style={styles.btnOutlineText}>Recommencer</Text>
          </Pressable>
          <Pressable
            testID="relier-verify"
            style={styles.btn}
            onPress={verify}
            disabled={Object.keys(pairs).length === 0}
          >
            <Text style={styles.btnText}>Vérifier</Text>
          </Pressable>
        </View>
        <Pressable
          testID="relier-reveal"
          style={styles.btnGhost}
          onPress={showAnswers}
        >
          <Text style={styles.btnGhostText}>Voir les réponses</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },
  summary: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 14 },
  columns: { flexDirection: "row", gap: 10 },
  column: { flex: 1, gap: 8 },
  cell: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    padding: 10,
    paddingRight: 28,
    minHeight: 56,
    justifyContent: "center",
  },
  cellText: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  answerHint: {
    marginTop: 6,
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  /** Sélection / paires non vérifiées = bleu. */
  cellSelected: {
    borderColor: "#2563eb",
    borderWidth: 2,
    backgroundColor: "#dbeafe",
  },
  cellPaired: {
    borderColor: "#2563eb",
    borderWidth: 2,
    backgroundColor: "#eff6ff",
  },
  cellCorrect: { backgroundColor: colors.okSoft, borderColor: colors.ok },
  cellWrong: { backgroundColor: "#fee2e2", borderColor: "#dc2626" },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeOk: { backgroundColor: colors.ok },
  badgeBad: { backgroundColor: "#dc2626" },
  badgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  okMeta: { marginTop: 8, gap: 2 },
  okDate: { color: colors.ok, fontWeight: "700", fontSize: 12 },
  okFiche: { color: colors.accent, fontWeight: "700", fontSize: 12 },
  score: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  btn: {
    flexGrow: 1,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnOutline: {
    flexGrow: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnOutlineText: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  btnGhost: { marginTop: 12, alignItems: "center", paddingVertical: 8 },
  btnGhostText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
});
