import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDictionnaireData } from "../../src/data/DictionnaireProvider";
import { splitCoursLinks } from "../../src/data/dictionnaire";
import { colors } from "../../src/theme/colors";

export default function DictionnaireEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useDictionnaireData();

  const entry =
    state.status === "ready" ? state.entries.find((e) => e.id === id) : undefined;

  if (state.status !== "ready" || !entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={{ padding: 16 }}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.empty}>
          {state.status === "loading" ? "Chargement…" : "Terme introuvable."}
        </Text>
      </SafeAreaView>
    );
  }

  const { chapitres, arrets } = splitCoursLinks(entry.cours);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.term}>{entry.term}</Text>
        <Text style={styles.def}>{entry.definition}</Text>

        {chapitres.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cours</Text>
            <Text style={styles.sectionText}>
              {chapitres.map((c) => c.label).join(" · ")}
            </Text>
          </View>
        ) : null}

        {arrets.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Jurisprudence</Text>
            {arrets.map((a) => {
              const slug = a.path.match(/\/arrets\/([^/]+)\/?$/)?.[1];
              return (
                <Pressable
                  key={a.path}
                  onPress={() => slug && router.push(`/chronologie/${slug}`)}
                  style={styles.arretRow}
                >
                  <Text style={styles.arretLink}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },
  back: { paddingBottom: 12 },
  backText: { color: colors.accent, fontWeight: "600" },
  term: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.title,
    fontFamily: "serif",
    marginBottom: 8,
  },
  def: { fontSize: 15, lineHeight: 22, color: colors.versoText, marginBottom: 16 },
  section: { marginTop: 8, marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 6,
  },
  sectionText: { fontSize: 13, color: colors.muted },
  arretRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    padding: 10,
    marginBottom: 6,
  },
  arretLink: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
});
