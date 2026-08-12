import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { derangement, type RelierItem } from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { colors } from "../../src/theme/colors";

const BADGE_LETTERS = "①②③④⑤⑥⑦⑧⑨⑩".split("");

export default function RelierSessionScreen() {
  const router = useRouter();
  const { session } = useRelierSession();
  const items = session.items;

  const rightOrder = useMemo(() => derangement(items), [items]);

  // pairs: leftId -> index into rightOrder
  const [pairs, setPairs] = useState<Record<string, number>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const usedRightIndices = new Set(Object.values(pairs));

  const tapLeft = (item: RelierItem) => {
    if (revealed) return;
    setSelectedLeft((cur) => (cur === item.id ? null : item.id));
  };

  const tapRight = (index: number) => {
    if (revealed) return;
    if (!selectedLeft) return;
    setPairs((prev) => {
      const next = { ...prev };
      // Libère ce slot droit s'il était pris par un autre item.
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
    setRevealed(false);
  };

  const correctCount = items.filter((item) => {
    const idx = pairs[item.id];
    if (idx === undefined) return false;
    return rightOrder[idx].id === item.id;
  }).length;

  if (!items.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={{ padding: 16 }}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.empty}>Aucune série en cours.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.bar}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </Pressable>
          <Text style={styles.summary}>
            {Object.keys(pairs).length} / {items.length} reliés
          </Text>
        </View>

        <Text style={styles.hint}>
          {selectedLeft
            ? "Touchez la correspondance à droite."
            : "Touchez un arrêt à gauche."}
        </Text>

        <View style={styles.columns}>
          <View style={styles.column}>
            {items.map((item) => {
              const pairedIndex = pairs[item.id];
              const isSelected = selectedLeft === item.id;
              const isCorrect = revealed && pairedIndex !== undefined
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
                    pairedIndex !== undefined && !revealed && styles.cellPaired,
                    isCorrect === true && styles.cellCorrect,
                    isCorrect === false && styles.cellWrong,
                  ]}
                >
                  {pairedIndex !== undefined ? (
                    <Text style={styles.badge}>
                      {BADGE_LETTERS[pairedIndex] || "•"}
                    </Text>
                  ) : null}
                  <Text style={styles.cellText}>{item.recto}</Text>
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
                revealed && pairedLeftId ? item.id === pairedLeftId : null;
              return (
                <Pressable
                  key={item.id}
                  testID={`relier-right-${index}`}
                  onPress={() => tapRight(index)}
                  style={[
                    styles.cell,
                    isUsed && !revealed && styles.cellPaired,
                    isCorrect === true && styles.cellCorrect,
                    isCorrect === false && styles.cellWrong,
                  ]}
                >
                  {isUsed ? (
                    <Text style={styles.badge}>
                      {BADGE_LETTERS[index] || "•"}
                    </Text>
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

        {revealed ? (
          <Text style={styles.score}>
            {correctCount} / {items.length} correct(es)
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.btnOutline} onPress={reset}>
            <Text style={styles.btnOutlineText}>Recommencer</Text>
          </Pressable>
          <Pressable
            testID="relier-reveal"
            style={styles.btn}
            onPress={() => setRevealed((v) => !v)}
          >
            <Text style={styles.btnText}>
              {revealed ? "Masquer les réponses" : "Voir les réponses"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backText: { color: colors.accent, fontWeight: "600" },
  summary: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 14 },
  columns: { flexDirection: "row", gap: 10 },
  column: { flex: 1, gap: 8 },
  cell: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    padding: 10,
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
  cellSelected: { borderColor: colors.accent, borderWidth: 2 },
  cellPaired: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  cellCorrect: { backgroundColor: colors.okSoft, borderColor: colors.ok },
  cellWrong: { backgroundColor: "#fee2e2", borderColor: "#dc2626" },
  badge: {
    position: "absolute",
    top: 6,
    right: 8,
    fontSize: 12,
    color: colors.accent,
    fontWeight: "700",
  },
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
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
});
