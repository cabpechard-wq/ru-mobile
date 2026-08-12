import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { useRelierData } from "../../src/data/RelierProvider";
import { pickBatch } from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { colors } from "../../src/theme/colors";

const BATCH_SIZES = [3, 5, 10];

export default function RelierSetupScreen() {
  const router = useRouter();
  const relierState = useRelierData();
  const { setSession } = useRelierSession();

  const start = (size: number, items: ReturnType<typeof pickBatch>) => {
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
            Reliez chaque arrêt à son objet. Touchez un élément à gauche,
            puis sa correspondance à droite.
            {relierState.source === "demo" ? " (démo)" : ""}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Choisir une série</Text>
            {BATCH_SIZES.map((size) => {
              const disabled = relierState.data.allItems.length < Math.min(size, 2);
              return (
                <Pressable
                  key={size}
                  testID={`relier-batch-${size}`}
                  disabled={disabled}
                  onPress={() => start(size, relierState.data.allItems)}
                  style={[styles.btn, disabled && styles.btnDisabled]}
                >
                  <Text style={styles.btnText}>
                    Série de {Math.min(size, relierState.data.allItems.length)}
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
  btn: {
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
