import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorScreen } from "../../src/components/DataStatus";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { formatDateFr, starsLabel, type Decision } from "../../src/data/decisions";
import { colors } from "../../src/theme/colors";

function Section({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

function findDecision(decisions: Decision[], id: string): Decision | undefined {
  return (
    decisions.find((d) => d.id === id) ||
    decisions.find((d) => d.slugFiche === id)
  );
}

export default function ArretFicheScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useChronologieData();

  const decision = useMemo(() => {
    if (state.status !== "ready" || !id) return undefined;
    return findDecision(state.decisions, id);
  }, [state, id]);

  if (state.status === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }
  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorScreen message={state.message} onRetry={state.reload} />
      </SafeAreaView>
    );
  }
  if (state.status === "idle-full") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.centerTitle}>Fonds Chronologie non chargé</Text>
          <Text style={styles.centerText}>
            Cette fiche fait partie du fonds complet (995 décisions, ~3 Mo).
          </Text>
          <Pressable style={styles.btn} onPress={state.loadFull}>
            <Text style={styles.btnText}>Charger le fonds complet</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  if (!decision) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={{ padding: 16 }}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.empty}>
          Fiche introuvable dans le jeu chargé actuellement (démo).
        </Text>
      </SafeAreaView>
    );
  }

  const metaBits = [
    decision.juridiction,
    formatDateFr(decision.date),
    decision.formation,
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>

        <Text style={styles.title}>{decision.nom}</Text>
        <View style={styles.metaRow}>
          {starsLabel(decision.importance) ? (
            <Text style={[styles.metaTag, styles.metaStars]}>
              {starsLabel(decision.importance)}
            </Text>
          ) : null}
          {metaBits.map((bit) => (
            <Text key={bit} style={styles.metaTag}>
              {bit}
            </Text>
          ))}
        </View>

        <Section title="Objet" text={decision.objet} />
        <Section title="Portée" text={decision.portee} />
        <Section title="Faits" text={decision.faits} />
        <Section title="Enjeu" text={decision.enjeu} />
        <Section title="Solution" text={decision.solution} />
        <Section title="Perspective" text={decision.perspective} />

        <Pressable
          testID="voir-chronologie"
          style={styles.linkBtn}
          onPress={() => router.push(`/chronologie/${decision.id}` as never)}
        >
          <Text style={styles.linkBtnText}>Voir dans la Chronologie</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },
  back: { paddingBottom: 12 },
  backText: { color: colors.accent, fontWeight: "600" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.title,
    fontFamily: "serif",
    marginBottom: 8,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  metaTag: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  metaStars: { color: colors.accent, borderColor: colors.accent },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 4,
  },
  sectionText: { fontSize: 14, lineHeight: 21, color: colors.versoText },
  linkBtn: {
    marginTop: 10,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  linkBtnText: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  centerTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, textAlign: "center" },
  centerText: { color: colors.muted, fontSize: 14, textAlign: "center" },
  btn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
