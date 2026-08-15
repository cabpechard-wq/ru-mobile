import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { useManuelData } from "../../src/data/ManuelProvider";
import { useRelierData } from "../../src/data/RelierProvider";
import { pickBatch, type RelierItem } from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { colors } from "../../src/theme/colors";

const BATCH_SIZES = [3, 5, 10];

export default function RelierSetupScreen() {
  const router = useRouter();
  const { cours } = useLocalSearchParams<{ cours?: string }>();
  const relierState = useRelierData();
  const manuel = useManuelData();
  const { setSession } = useRelierSession();

  const chapterExercises =
    cours && manuel.status === "ready" ? manuel.exercises[cours] : undefined;
  const allItems: RelierItem[] =
    relierState.status === "ready" ? relierState.data.allItems : [];
  const items =
    cours && chapterExercises
      ? allItems.filter((i) => chapterExercises.jurisprudence.includes(i.recto))
      : allItems;

  const start = (size: number) => {
    if (items.length < 2) return;
    setSession({ items: pickBatch(items, size) });
    router.push("/relier/session");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {relierState.status === "loading" ? <LoadingScreen /> : null}
      {relierState.status === "error" ? (
        <ErrorScreen message={relierState.message} onRetry={relierState.reload} />
      ) : null}
      {relierState.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Accueil</Text>
          </Pressable>
          <Text style={styles.title}>Relier</Text>
          <Text style={styles.sub}>
            {chapterExercises
              ? `Fonds du chapitre « ${chapterExercises.title} » (${items.length} arrêt(s)).`
              : "Reliez chaque arrêt à son objet. Touchez un élément à gauche, puis sa correspondance à droite."}
            {relierState.source === "demo" ? " (démo)" : ""}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Choisir une série</Text>
            {items.length < 2 ? (
              <Text style={styles.hint}>
                Pas assez d'arrêts dans ce chapitre pour un exercice Relier.
              </Text>
            ) : null}
            {BATCH_SIZES.map((size) => {
              const disabled = items.length < Math.min(size, 2);
              return (
                <Pressable
                  key={size}
                  testID={`relier-batch-${size}`}
                  disabled={disabled}
                  onPress={() => start(size)}
                  style={[styles.btn, disabled && styles.btnDisabled]}
                >
                  <Text style={styles.btnText}>
                    Série de {Math.min(size, items.length)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  back: { paddingBottom: 12 },
  backText: { color: colors.accent, fontWeight: "600" },
  title: {
    fontSize: 26,
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
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontWeight: "700", color: colors.ink, marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 13 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
