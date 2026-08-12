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
import { buildById, directRelations, relatedCluster } from "../../src/data/chronologie";
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

export default function DecisionFicheScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useChronologieData();

  const byId = useMemo(
    () => (state.status === "ready" ? buildById(state.decisions) : new Map<string, Decision>()),
    [state]
  );
  const decision = state.status === "ready" && id ? byId.get(id) : undefined;

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
            Cette décision fait partie du fonds complet (995 décisions, ~3 Mo).
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
          Décision introuvable dans le jeu chargé actuellement (démo).
        </Text>
      </SafeAreaView>
    );
  }

  const related = directRelations(byId, decision.id);
  const cluster = relatedCluster(byId, decision.id).filter((d) => d.id !== decision.id);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>

        <Text style={styles.title}>{decision.nom}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaTag}>{formatDateFr(decision.date)}</Text>
          {decision.juridiction ? (
            <Text style={styles.metaTag}>{decision.juridiction}</Text>
          ) : null}
          {starsLabel(decision.importance) ? (
            <Text style={[styles.metaTag, styles.metaStars]}>
              {starsLabel(decision.importance)}
            </Text>
          ) : null}
        </View>
        {decision.notions && decision.notions.length ? (
          <View style={styles.tags}>
            {decision.notions.map((n) => (
              <Text key={n} style={styles.tag}>
                {n}
              </Text>
            ))}
          </View>
        ) : null}

        <Section title="Objet" text={decision.objet} />
        <Section title="Faits" text={decision.faits} />
        <Section title="Enjeu" text={decision.enjeu} />
        <Section title="Solution" text={decision.solution} />
        <Section title="Portée" text={decision.portee} />
        <Section title="Perspective" text={decision.perspective} />

        {related.length ? (
          <View style={styles.related}>
            <Text style={styles.relatedTitle}>
              Décisions liées ({related.length})
            </Text>
            {related.map((d) => (
              <Pressable
                key={d.id}
                testID={`related-${d.id}`}
                style={styles.relatedRow}
                onPress={() => router.push(`/chronologie/${d.id}`)}
              >
                <Text style={styles.relatedNom} numberOfLines={1}>
                  {d.nom}
                </Text>
                {d.objet ? (
                  <Text style={styles.relatedObjet} numberOfLines={1}>
                    {d.objet}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {cluster.length ? (
          <View style={styles.lineage}>
            <Text style={styles.relatedTitle}>Lignée jurisprudentielle</Text>
            <View style={styles.stepper}>
              {[decision, ...cluster]
                .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
                .map((d) => {
                  const isCurrent = d.id === decision.id;
                  return (
                    <Pressable
                      key={d.id}
                      disabled={isCurrent}
                      onPress={() => router.push(`/chronologie/${d.id}`)}
                      style={styles.stepRow}
                    >
                      <View style={[styles.stepDot, isCurrent && styles.stepDotCurrent]} />
                      <View style={styles.stepBody}>
                        <Text
                          style={[styles.stepNom, isCurrent && styles.stepNomCurrent]}
                          numberOfLines={1}
                        >
                          {formatDateFr(d.date)} — {d.nom}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.title,
    fontFamily: "serif",
    marginBottom: 8,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
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
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  tag: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
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
  related: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 8,
  },
  relatedTitle: { fontWeight: "700", color: colors.ink, marginBottom: 4 },
  relatedRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    padding: 10,
  },
  relatedNom: { fontWeight: "700", color: colors.ink, fontSize: 13 },
  relatedObjet: { color: colors.muted, fontSize: 12, marginTop: 2 },
  lineage: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  stepper: { marginTop: 8, gap: 2 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  stepDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotCurrent: { backgroundColor: colors.accent, width: 11, height: 11, borderRadius: 6 },
  stepBody: { flex: 1 },
  stepNom: { color: colors.muted, fontSize: 13 },
  stepNomCurrent: { color: colors.ink, fontWeight: "700" },
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
