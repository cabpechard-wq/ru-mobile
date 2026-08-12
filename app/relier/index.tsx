import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Accordion } from "../../src/components/Accordion";
import { Chip } from "../../src/components/Chip";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { PageHeader } from "../../src/components/PageHeader";
import { starsLabel } from "../../src/data/cards";
import { useRelierData } from "../../src/data/RelierProvider";
import { filterRelierItems, pickBatch } from "../../src/data/relier";
import { useRelierSession } from "../../src/data/RelierSessionContext";
import { SECTION } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

const BATCH_SIZES = [3, 5, 10];

export default function RelierSetupScreen() {
  const router = useRouter();
  const relierState = useRelierData();
  const { setSession } = useRelierSession();
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedNotions, setSelectedNotions] = useState<string[]>([]);
  const [selectedImportance, setSelectedImportance] = useState<number[]>([]);

  const filteredItems = useMemo(() => {
    if (relierState.status !== "ready") return [];
    return filterRelierItems(relierState.data.allItems, {
      themes: selectedThemes,
      notions: selectedNotions,
      importance: selectedImportance,
    });
  }, [relierState, selectedThemes, selectedNotions, selectedImportance]);

  const start = (size: number) => {
    if (filteredItems.length < 2) return;
    setSession({ items: pickBatch(filteredItems, size), pack: "arrets" });
    router.push("/relier/session");
  };

  const toggleTheme = (t: string) => {
    setSelectedThemes((prev) => (prev.includes(t) ? [] : [t]));
  };
  const toggleNotion = (n: string) => {
    setSelectedNotions((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };
  const toggleImportance = (lvl: number) => {
    setSelectedImportance((prev) =>
      prev.includes(lvl) ? prev.filter((x) => x !== lvl) : [...prev, lvl]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[SECTION.relationsArrets]} />
      {relierState.status === "loading" ? <LoadingScreen /> : null}
      {relierState.status === "error" ? (
        <ErrorScreen message={relierState.message} onRetry={relierState.reload} />
      ) : null}
      {relierState.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>Relations</Text>
          <Text style={styles.title}>Relations — Grands arrêts</Text>
          <Text style={styles.sub}>
            Hub Relations : Grands arrêts ·{" "}
            <Text
              style={styles.inlineLink}
              onPress={() => router.push("/relier/notions" as never)}
            >
              Grandes notions
            </Text>
            . Reliez chaque arrêt à son objet. Touchez un élément à gauche,
            puis sa correspondance à droite.
            {relierState.source === "demo" ? " (démo)" : ""}
          </Text>

          <View style={styles.card}>
            {relierState.data.allThemes.length ? (
              <Accordion
                title="Thèmes (1 seul)"
                onClear={() => setSelectedThemes([])}
              >
                <View style={styles.chips}>
                  {relierState.data.allThemes.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      selected={selectedThemes.includes(t)}
                      onPress={() => toggleTheme(t)}
                    />
                  ))}
                </View>
              </Accordion>
            ) : null}

            {relierState.data.allNotions.length ? (
              <Accordion
                title="Notions"
                onClear={() => setSelectedNotions([])}
              >
                <View style={styles.chips}>
                  {relierState.data.allNotions.map((n) => (
                    <Chip
                      key={n}
                      label={n}
                      selected={selectedNotions.includes(n)}
                      onPress={() => toggleNotion(n)}
                    />
                  ))}
                </View>
              </Accordion>
            ) : null}

            {relierState.data.presentImportanceLevels.length ? (
              <Accordion
                title="Importance"
                onClear={() => setSelectedImportance([])}
              >
                <View style={styles.chips}>
                  {relierState.data.presentImportanceLevels.map((lvl) => (
                    <Chip
                      key={lvl}
                      label={starsLabel(lvl)}
                      selected={selectedImportance.includes(lvl)}
                      onPress={() => toggleImportance(lvl)}
                    />
                  ))}
                </View>
              </Accordion>
            ) : null}

            <Text style={styles.count}>
              <Text style={styles.countNum}>{filteredItems.length}</Text> carte(s)
            </Text>

            <Text style={styles.cardTitle}>Choisir une série</Text>
            {BATCH_SIZES.map((size) => {
              const disabled = filteredItems.length < Math.min(size, 2);
              return (
                <Pressable
                  key={size}
                  testID={`relier-batch-${size}`}
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
  inlineLink: { color: colors.accent, fontWeight: "700" },
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
