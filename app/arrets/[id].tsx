import { useLocalSearchParams } from "expo-router";
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
import { PageHeader } from "../../src/components/PageHeader";
import { useCardsData } from "../../src/data/CardsProvider";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { formatDateFr, starsLabel, type Decision } from "../../src/data/decisions";
import { SECTION } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

/** Synthèse (Objet / Portée / Considérant) — mise en avant. */
function HighlightSection({ title, text }: { title: string; text?: string }) {
  if (!(text || "").trim()) return null;
  return (
    <View style={styles.highlight}>
      <Text style={styles.highlightTitle}>{title}</Text>
      <Text style={styles.highlightText}>{text}</Text>
    </View>
  );
}

/** Corps de fiche (Faits / Enjeu / Solution / Perspective). */
function BodySection({ title, text }: { title: string; text?: string }) {
  if (!(text || "").trim()) return null;
  return (
    <View style={styles.bodySection}>
      <Text style={styles.bodyTitle}>{title}</Text>
      <Text style={styles.bodyText}>{text}</Text>
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useChronologieData();
  const cards = useCardsData();

  const decision = useMemo(() => {
    if (state.status !== "ready" || !id) return undefined;
    return findDecision(state.decisions, id);
  }, [state, id]);

  const considerant = useMemo(() => {
    if (!decision) return undefined;
    if (cards.status === "ready") {
      const fromCards = cards.data.allCards.find(
        (c) => c.id === decision.id || c.recto === decision.nom
      )?.considerant;
      if ((fromCards || "").trim()) return fromCards;
    }
    return undefined;
  }, [decision, cards]);

  if (state.status === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader trail={[SECTION.arrets]} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }
  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader trail={[SECTION.arrets]} />
        <ErrorScreen message={state.message} onRetry={state.reload} />
      </SafeAreaView>
    );
  }
  if (state.status === "idle-full") {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader trail={[SECTION.arrets]} />
        <View style={styles.center}>
          <Text style={styles.centerTitle}>Fonds non chargé</Text>
          <Text style={styles.centerText}>
            Cette fiche fait partie du fonds complet (~3 Mo).
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
        <PageHeader trail={[SECTION.arrets]} />
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
      <PageHeader trail={[SECTION.arrets, decision.nom]} />
      <ScrollView contentContainerStyle={styles.scroll}>
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

        <HighlightSection title="Objet" text={decision.objet} />
        <HighlightSection title="Portée" text={decision.portee} />
        <HighlightSection title="Considérant de principe" text={considerant} />

        <View style={styles.bodyBlock}>
          <BodySection title="Faits" text={decision.faits} />
          <BodySection title="Enjeu juridique" text={decision.enjeu} />
          <BodySection title="Solution" text={decision.solution} />
          <BodySection title="Perspective" text={decision.perspective} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },
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
  highlight: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.brass,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  highlightTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.brass,
    marginBottom: 6,
  },
  highlightText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    fontFamily: "serif",
  },
  bodyBlock: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bodySection: { marginBottom: 14 },
  bodyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  bodyText: { fontSize: 14, lineHeight: 21, color: colors.versoText },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  centerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
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
