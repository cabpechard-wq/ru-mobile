import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "../../src/components/PageHeader";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { formatDateFr, starsLabel } from "../../src/data/decisions";
import {
  derangement,
  pickBatch,
  type RelierItem,
} from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { TRAIL } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

/** Chiffres de relation — plus gros, lisibles au tactile. */

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

/**
 * Nouveau set : re-tire dans le pool, en évitant si possible le set courant.
 */
function pickNewSet(
  pool: RelierItem[],
  size: number,
  currentIds: Set<string>,
): RelierItem[] {
  if (pool.length <= size) return pickBatch(pool, size);
  let next = pickBatch(pool, size);
  let tries = 0;
  const sameAsCurrent = (batch: RelierItem[]) =>
    batch.length === currentIds.size &&
    batch.every((item) => currentIds.has(item.id));
  while (tries < 12 && sameAsCurrent(next)) {
    next = pickBatch(pool, size);
    tries += 1;
  }
  return next;
}

export default function RelierSessionScreen() {
  const router = useRouter();
  const { session, setSession } = useRelierSession();
  const chrono = useChronologieData();
  const items = session.items;
  const pack = session.pack || "arrets";
  const trail =
    pack === "notions" ? TRAIL.relationsNotions : TRAIL.relationsArrets;

  const [rightOrder, setRightOrder] = useState<RelierItem[]>(() =>
    derangement(items),
  );
  const [pairs, setPairs] = useState<Record<string, number>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRightOrder(derangement(items));
    setPairs({});
    setSelectedLeft(null);
    setVerified(false);
    setRevealed(false);
  }, [items]);

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

  const newSet = () => {
    const pool = session.pool?.length ? session.pool : items;
    const size = session.batchSize || items.length;
    const currentIds = new Set(items.map((i) => i.id));
    const nextItems = pickNewSet(pool, size, currentIds);
    setSession({
      ...session,
      items: nextItems,
      pool,
      batchSize: size,
    });
  };

  const correctCount = items.filter((item) => {
    const idx = pairs[item.id];
    if (idx === undefined) return false;
    return rightOrder[idx]?.id === item.id;
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
        <PageHeader trail={[...trail, "Exercice"]} />
        <Text style={styles.empty}>Aucune série en cours.</Text>
      </SafeAreaView>
    );
  }

  const showResult = verified || revealed;
  const rowCount = Math.max(items.length, rightOrder.length);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader
        trail={[...trail, "Exercice"]}
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

        <View style={styles.board}>
          <View style={styles.boardHead}>
            <Text style={styles.colTitle}>
              {pack === "notions" ? "Notion" : "Décision"}
            </Text>
            <Text style={styles.colTitle}>
              {pack === "notions" ? "Définition" : "Objet"}
            </Text>
          </View>

          {Array.from({ length: rowCount }, (_, rowIndex) => {
            const left = items[rowIndex];
            const right = rightOrder[rowIndex];
            return (
              <View key={`row-${rowIndex}`} style={styles.boardRow}>
                {left ? (
                  (() => {
                    const pairedIndex = pairs[left.id];
                    const isSelected = selectedLeft === left.id;
                    const isPaired = pairedIndex !== undefined;
                    const isCorrect =
                      showResult && isPaired
                        ? rightOrder[pairedIndex]?.id === left.id
                        : null;
                    return (
                      <Pressable
                        testID={`relier-left-${left.id}`}
                        onPress={() => tapLeft(left)}
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
                              {String(pairedIndex + 1)}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.cellText}>
                          {left.recto}
                          {pack === "arrets" && starsLabel(left.importance_level)
                            ? `  ${starsLabel(left.importance_level)}`
                            : ""}
                        </Text>
                        {isCorrect === true && pack === "arrets" ? (
                          <View style={styles.okMeta}>
                            {exactDateFor(left) ? (
                              <Text style={styles.okDate}>
                                {exactDateFor(left)}
                              </Text>
                            ) : null}
                            {ficheSlug(left) ? (
                              <Text
                                style={styles.okFiche}
                                onPress={() =>
                                  router.push(`/arrets/${ficheSlug(left)}`)
                                }
                              >
                                Fiche d'arrêt →
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })()
                ) : (
                  <View style={styles.cellSpacer} />
                )}

                {right ? (
                  (() => {
                    const isUsed = usedRightIndices.has(rowIndex);
                    const pairedLeftId = Object.entries(pairs).find(
                      ([, idx]) => idx === rowIndex,
                    )?.[0];
                    const isCorrect =
                      showResult && pairedLeftId
                        ? right.id === pairedLeftId
                        : showResult && !pairedLeftId
                          ? false
                          : null;
                    return (
                      <Pressable
                        testID={`relier-right-${rowIndex}`}
                        onPress={() => tapRight(rowIndex)}
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
                              {String(rowIndex + 1)}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.cellText}>{right.objet}</Text>
                        {revealed && isCorrect !== true ? (
                          <Text style={styles.answerHint}>→ {right.recto}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })()
                ) : (
                  <View style={styles.cellSpacer} />
                )}
              </View>
            );
          })}
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
        <View style={styles.secondaryActions}>
          <Pressable
            testID="relier-reveal"
            style={styles.btnGhost}
            onPress={showAnswers}
          >
            <Text style={styles.btnGhostText}>Voir les réponses</Text>
          </Pressable>
          <Pressable
            testID="relier-new-set"
            style={styles.btnGhost}
            onPress={newSet}
          >
            <Text style={styles.btnGhostText}>Nouveau set</Text>
          </Pressable>
        </View>
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
  board: {
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 10,
  },
  boardHead: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 2,
  },
  colTitle: {
    flex: 1,
    fontFamily: "serif",
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  cell: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.bg,
    padding: 10,
    paddingRight: 28,
    minHeight: 56,
    justifyContent: "center",
  },
  cellSpacer: { flex: 1 },
  cellText: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  answerHint: {
    marginTop: 6,
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
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
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    marginTop: 12,
  },
  btnGhost: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 4 },
  btnGhostText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
});
