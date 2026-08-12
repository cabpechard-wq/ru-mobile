import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Accordion } from "../../src/components/Accordion";
import { Chip } from "../../src/components/Chip";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { PAGE_TITLE_NOTIONS } from "../../src/data/config";
import { useRelierDicoData } from "../../src/data/RelierDicoProvider";
import { filterRelierItems, pickBatch } from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { colors } from "../../src/theme/colors";

const BATCH_SIZES = [3, 5, 10];

export default function RelierNotionsSetupScreen() {
  const router = useRouter();
  const relierState = useRelierDicoData();
  const { setSession } = useRelierSession();
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  const filteredItems = useMemo(() => {
    if (relierState.status !== "ready") return [];
    return filterRelierItems(relierState.data.allItems, {
      themes: selectedThemes,
    });
  }, [relierState, selectedThemes]);

  const start = (size: number) => {
    if (filteredItems.length < 2) return;
    setSession({ items: pickBatch(filteredItems, size) });
    router.push("/relier/session");
  };

  const toggleTheme = (t: string) => {
    // Un seul thème (lettre), comme Flipcards notions
    setSelectedThemes((prev) => (prev.includes(t) ? [] : [t]));
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
          <Text style={styles.kicker}>Relations</Text>
          <Text style={styles.title}>Relations — Grandes notions</Text>
          <Text style={styles.sub}>
            {PAGE_TITLE_NOTIONS}. Reliez chaque notion à sa définition.
            {relierState.source === "demo" ? " (démo)" : ""}
          </Text>

          <View style={styles.card}>
            <Accordion
              title="Lettres (1 seul choix)"
              onClear={() => setSelectedThemes([])}
              initiallyOpen
            >
              <View style={styles.chips}>
                {relierState.data.allThemes.length ? (
                  relierState.data.allThemes.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      selected={selectedThemes.includes(t)}
                      onPress={() => toggleTheme(t)}
                    />
                  ))
                ) : (
                  <Text style={styles.emptyChips}>Aucune lettre.</Text>
                )}
              </View>
            </Accordion>

            <Text style={styles.count}>
              <Text style={styles.countNum}>{filteredItems.length}</Text> notion(s)
            </Text>

            <Text style={styles.cardTitle}>Choisir une série</Text>
            {BATCH_SIZES.map((size) => {
              const disabled = filteredItems.length < Math.min(size, 2);
              return (
                <Pressable
                  key={size}
                  testID={`relier-notions-batch-${size}`}
                  disabled={disabled}
                  onPress={() => start(size)}
                  style={[styles.btn, disabled && styles.btnDisabled]}
                >
                  <Text style={styles.btnText}>
                    Série de {Math.min(size, Math.max(filteredItems.length, 0))}
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
    fontFamily: "serif",
  },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  emptyChips: { color: colors.muted, fontSize: 14 },
  count: { fontSize: 15, fontWeight: "600", color: colors.ink, marginTop: 4 },
  countNum: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "serif",
  },
  cardTitle: { fontWeight: "700", color: colors.ink, marginTop: 4 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
