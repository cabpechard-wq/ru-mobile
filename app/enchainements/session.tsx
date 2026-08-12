import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  displayNom,
  formatDateFr,
  sortChronologically,
  type Decision,
} from "../../src/data/enchainements";
import { useEnchainementsSession } from "../../src/data/EnchainementsSessionContext";
import { colors } from "../../src/theme/colors";

export default function EnchainementsSessionScreen() {
  const router = useRouter();
  const { session } = useEnchainementsSession();
  const initial = session.items;

  const correctOrder = useMemo(() => sortChronologically(initial), [initial]);
  const [order, setOrder] = useState<Decision[]>(initial);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const move = (index: number, dir: -1 | 1) => {
    if (revealed) return;
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setChecked(false);
  };

  const correctCount = order.filter(
    (d, i) => d.id === correctOrder[i]?.id
  ).length;

  const check = () => setChecked(true);
  const reveal = () => {
    setOrder(correctOrder);
    setChecked(true);
    setRevealed(true);
  };
  const restart = () => {
    setOrder(initial);
    setChecked(false);
    setRevealed(false);
  };

  if (!initial.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={{ padding: 16 }}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.empty}>Aucun enchaînement en cours.</Text>
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
          <Text style={styles.summary}>Ordre chronologique ?</Text>
        </View>

        {checked ? (
          <View style={[styles.scoreBanner, revealed && styles.scoreBannerRevealed]}>
            <Text style={styles.scoreText}>
              {revealed
                ? `${correctOrder.length} / ${correctOrder.length} — solution affichée`
                : `${correctCount} / ${correctOrder.length} bien placées`}
            </Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {order.map((d, index) => {
            const showDetails = revealed || (checked && d.id === correctOrder[index]?.id);
            const isWrong = checked && !revealed && d.id !== correctOrder[index]?.id;
            return (
              <View
                key={d.id}
                style={[
                  styles.card,
                  showDetails && styles.cardCorrect,
                  isWrong && styles.cardWrong,
                ]}
              >
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardNom}>
                      {displayNom(d.nom, showDetails)}
                    </Text>
                    {showDetails ? (
                      <Text style={styles.cardDate}>{formatDateFr(d.date)}</Text>
                    ) : null}
                  </View>
                  {d.objet ? (
                    <Text style={styles.cardObjet}>{d.objet}</Text>
                  ) : null}
                  {(revealed || (checked && d.id === correctOrder[index]?.id)) ? (
                    <Pressable
                      onPress={() =>
                        router.push(`/arrets/${d.slugFiche || d.id}`)
                      }
                      style={styles.ficheLink}
                    >
                      <Text style={styles.ficheLinkText}>Fiche d'arrêt →</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.moves}>
                  <Pressable
                    testID={`ench-up-${index}`}
                    disabled={revealed || index === 0}
                    onPress={() => move(index, -1)}
                    style={[
                      styles.moveBtn,
                      (revealed || index === 0) && styles.moveBtnDisabled,
                    ]}
                  >
                    <Text style={styles.moveText}>↑</Text>
                  </Pressable>
                  <Pressable
                    testID={`ench-down-${index}`}
                    disabled={revealed || index === order.length - 1}
                    onPress={() => move(index, 1)}
                    style={[
                      styles.moveBtn,
                      (revealed || index === order.length - 1) && styles.moveBtnDisabled,
                    ]}
                  >
                    <Text style={styles.moveText}>↓</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.btnOutline} onPress={restart}>
            <Text style={styles.btnOutlineText}>Recommencer</Text>
          </Pressable>
          <Pressable testID="ench-check" style={styles.btnOutline} onPress={check}>
            <Text style={styles.btnOutlineText}>Vérifier</Text>
          </Pressable>
          <Pressable testID="ench-reveal" style={styles.btn} onPress={reveal}>
            <Text style={styles.btnText}>Voir les dates</Text>
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
    marginBottom: 12,
  },
  backText: { color: colors.accent, fontWeight: "600" },
  summary: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  scoreBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: colors.radius,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  scoreBannerRevealed: { backgroundColor: colors.okSoft },
  scoreText: { fontWeight: "700", color: colors.ink },
  list: { gap: 8 },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    padding: 12,
    gap: 10,
    alignItems: "center",
  },
  cardCorrect: { backgroundColor: colors.okSoft, borderColor: colors.ok },
  cardWrong: { backgroundColor: "#fee2e2", borderColor: "#dc2626" },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardNom: { fontWeight: "700", color: colors.ink, fontSize: 14, flexShrink: 1 },
  cardDate: { color: colors.accent, fontWeight: "700", fontSize: 12 },
  cardObjet: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  ficheLink: { marginTop: 6 },
  ficheLinkText: { color: colors.accent, fontWeight: "700", fontSize: 12 },
  moves: { gap: 4 },
  moveBtn: {
    width: 32,
    height: 32,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  moveBtnDisabled: { opacity: 0.3 },
  moveText: { fontSize: 15, color: colors.ink, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, marginTop: 20 },
  btn: {
    flexGrow: 1,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnOutline: {
    flexGrow: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingVertical: 11,
    alignItems: "center",
  },
  btnOutlineText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
});
