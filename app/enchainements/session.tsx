import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "../../src/components/PageHeader";
import { ReorderableList } from "../../src/components/ReorderableList";
import {
  displayNom,
  formatDateFr,
  sortChronologically,
  type Decision,
} from "../../src/data/enchainements";
import { useEnchainementsSession } from "../../src/data/EnchainementsSessionContext";
import { TRAIL } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

export default function EnchainementsSessionScreen() {
  const router = useRouter();
  const { session } = useEnchainementsSession();
  const initial = session.items;

  const correctOrder = useMemo(() => sortChronologically(initial), [initial]);
  const [order, setOrder] = useState<Decision[]>(initial);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setOrder(initial);
    setChecked(false);
    setRevealed(false);
  }, [initial]);

  const reorder = (next: Decision[]) => {
    if (revealed) return;
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
        <PageHeader trail={[...TRAIL.enchainements, "Exercice"]} />
        <Text style={styles.empty}>Aucun enchaînement en cours.</Text>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <PageHeader
          trail={[...TRAIL.enchainements, "Exercice"]}
          right={
            <Text style={styles.summary} numberOfLines={1}>
              Ordre chronologique ?
            </Text>
          }
        />
        <ScrollView
          contentContainerStyle={styles.scroll}
          scrollEnabled={!revealed && !dragging}
        >
          <Text style={styles.hint}>
            Maintenez la poignée ⠿ puis glissez pour réordonner
            {revealed ? " (verrouillé)." : "."}
          </Text>

          {checked ? (
            <View
              style={[
                styles.scoreBanner,
                revealed && styles.scoreBannerRevealed,
              ]}
            >
              <Text style={styles.scoreText}>
                {revealed
                  ? `${correctOrder.length} / ${correctOrder.length} — solution affichée`
                  : `${correctCount} / ${correctOrder.length} bien placées`}
              </Text>
            </View>
          ) : null}

          <ReorderableList
            data={order}
            keyExtractor={(d) => d.id}
            onReorder={reorder}
            enabled={!revealed}
            onDragStateChange={setDragging}
            renderItem={({ item: d, index, dragHandle }) => {
              const showDetails =
                revealed || (checked && d.id === correctOrder[index]?.id);
              const isWrong =
                checked && !revealed && d.id !== correctOrder[index]?.id;
              return (
                <View
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
                        <Text style={styles.cardDate}>
                          {formatDateFr(d.date)}
                        </Text>
                      ) : null}
                    </View>
                    {d.objet ? (
                      <Text style={styles.cardObjet}>{d.objet}</Text>
                    ) : null}
                    {revealed ||
                    (checked && d.id === correctOrder[index]?.id) ? (
                      <Pressable
                        onPress={() =>
                          router.push(`/arrets/${d.slugFiche || d.id}`)
                        }
                        style={styles.ficheLink}
                      >
                        <Text style={styles.ficheLinkText}>
                          Fiche d'arrêt →
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {dragHandle}
                </View>
              );
            }}
          />

          <View style={styles.actions}>
            <Pressable style={styles.btnOutline} onPress={restart}>
              <Text style={styles.btnOutlineText}>Recommencer</Text>
            </Pressable>
            <Pressable
              testID="ench-check"
              style={styles.btnOutline}
              onPress={check}
            >
              <Text style={styles.btnOutlineText}>Vérifier</Text>
            </Pressable>
            <Pressable testID="ench-reveal" style={styles.btn} onPress={reveal}>
              <Text style={styles.btnText}>Voir les dates</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },
  summary: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  scoreBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: colors.radius,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  scoreBannerRevealed: { backgroundColor: colors.okSoft },
  scoreText: { fontWeight: "700", color: colors.ink },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 4,
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
  cardNom: {
    fontWeight: "700",
    color: colors.ink,
    fontSize: 14,
    flexShrink: 1,
  },
  cardDate: { color: colors.accent, fontWeight: "700", fontSize: 12 },
  cardObjet: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  ficheLink: { marginTop: 6 },
  ficheLinkText: { color: colors.accent, fontWeight: "700", fontSize: 12 },
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
