import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useState } from "react";
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
import {
  buildById,
  buildLineageTree,
  directRelations,
  flattenLineageTree,
  LINEAGE_DEPTH,
  type LineageFlatNode,
} from "../../src/data/chronologie";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import {
  considerantFromCards,
  fetchConsiderantFromSite,
  ficheSlugForConsiderant,
} from "../../src/data/considerant";
import {
  formatDateFr,
  starsLabel,
  type Decision,
} from "../../src/data/decisions";
import { TRAIL } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

function ficheHref(d: Decision): string {
  return `/arrets/${d.slugFiche || d.id}`;
}

/** Synthèse (Objet / Portée / Considérant) — mise en avant. */
function HighlightSection({
  title,
  text,
  tone = "brass",
  loading,
}: {
  title: string;
  text?: string;
  /** Objet/Portée = brass ; Considérant = accent (teal). */
  tone?: "brass" | "accent";
  loading?: boolean;
}) {
  if (loading) {
    const isAccent = tone === "accent";
    return (
      <View style={[styles.highlight, isAccent && styles.highlightAccent]}>
        <Text
          style={[
            styles.highlightTitle,
            isAccent && styles.highlightTitleAccent,
          ]}
        >
          {title}
        </Text>
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 6 }} />
      </View>
    );
  }
  if (!(text || "").trim()) return null;
  const isAccent = tone === "accent";
  return (
    <View style={[styles.highlight, isAccent && styles.highlightAccent]}>
      <Text
        style={[styles.highlightTitle, isAccent && styles.highlightTitleAccent]}
      >
        {title}
      </Text>
      <Text style={styles.highlightText}>{text}</Text>
    </View>
  );
}

/** Corps de fiche (Faits / Enjeu / Solution / Perspective) — libellé gras inline. */
function BodySection({ title, text }: { title: string; text?: string }) {
  if (!(text || "").trim()) return null;
  const label = title.endsWith(".") ? title : `${title}.`;
  return (
    <Text style={styles.bodyText}>
      <Text style={styles.bodyLabel}>{label} </Text>
      {text}
    </Text>
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
  const cards = useCardsData();
  const rememberConsiderant = state.rememberConsiderant;

  const byId = useMemo(
    () =>
      state.status === "ready"
        ? buildById(state.decisions)
        : new Map<string, Decision>(),
    [state],
  );

  const decision = useMemo(() => {
    if (state.status !== "ready" || !id) return undefined;
    return findDecision(state.decisions, id);
  }, [state, id]);

  const fromDecision = (decision?.considerant || "").trim() || undefined;

  const fromCards = useMemo(() => {
    if (fromDecision || !decision || cards.status !== "ready") return undefined;
    return considerantFromCards(decision, cards.data.allCards);
  }, [decision, cards, fromDecision]);

  const [fromSite, setFromSite] = useState<string | undefined>();
  const [siteLoading, setSiteLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    setFromSite(undefined);
    if (!decision || fromDecision || fromCards) {
      setSiteLoading(false);
      return;
    }
    const slug = ficheSlugForConsiderant(decision);
    if (!slug) {
      setSiteLoading(false);
      return;
    }
    let cancelled = false;
    setSiteLoading(true);
    fetchConsiderantFromSite(slug).then((text) => {
      if (cancelled) return;
      setFromSite(text);
      setSiteLoading(false);
      if (text) {
        rememberConsiderant(decision.id, text);
        if (decision.slugFiche) rememberConsiderant(decision.slugFiche, text);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [decision, fromCards, fromDecision, rememberConsiderant]);

  const considerant = fromDecision || fromCards || fromSite;
  const considerantLoading =
    !considerant &&
    (siteLoading || (cards.status === "loading" && !fromDecision));

  const related = useMemo(
    () => (decision ? directRelations(byId, decision.id) : []),
    [byId, decision],
  );

  const lineageNodes = useMemo((): LineageFlatNode[] => {
    if (!decision) return [];
    const tree = buildLineageTree(byId, decision.id, LINEAGE_DEPTH);
    if (!tree) return [];
    return flattenLineageTree(tree, { includeRoot: true });
  }, [byId, decision]);

  if (state.status === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader trail={[...TRAIL.arrets]} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }
  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader trail={[...TRAIL.arrets]} />
        <ErrorScreen message={state.message} onRetry={state.reload} />
      </SafeAreaView>
    );
  }
  if (state.status === "idle-full") {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader trail={[...TRAIL.arrets]} />
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
        <PageHeader trail={[...TRAIL.arrets]} />
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

  const showLineage = lineageNodes.length > 1;

  const listenText = [
    decision.nom,
    decision.objet,
    considerant,
    decision.faits,
  ]
    .map((t) => (t || "").trim())
    .filter(Boolean)
    .join(". ");

  const toggleListen = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    if (!listenText) return;
    setSpeaking(true);
    Speech.speak(listenText, {
      language: "fr-FR",
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[...TRAIL.arrets, decision.nom]} />
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

        <View style={styles.actionRow}>
          <Pressable
            testID="ecouter-fiche"
            onPress={toggleListen}
            style={styles.listenBtn}
            hitSlop={8}
            disabled={!listenText}
          >
            <Text style={[styles.listenText, !listenText && styles.listenDisabled]}>
              {speaking ? "Arrêter" : "Écouter"}
            </Text>
          </Pressable>
          <Pressable
            testID="voir-chronologie"
            onPress={() =>
              router.push(
                `/chronologie?id=${encodeURIComponent(decision.slugFiche || decision.id)}` as never
              )
            }
            style={styles.chronoLink}
            hitSlop={8}
          >
            <Text style={styles.chronoLinkText}>Voir dans la Chronologie</Text>
          </Pressable>
        </View>

        <HighlightSection title="Objet" text={decision.objet} />
        <HighlightSection title="Portée" text={decision.portee} />
        <HighlightSection
          title="Considérant de principe"
          text={considerant}
          tone="accent"
          loading={considerantLoading}
        />

        <View style={styles.bodyBlock}>
          <BodySection title="Faits" text={decision.faits} />
          <BodySection title="Enjeu juridique" text={decision.enjeu} />
          <BodySection title="Solution" text={decision.solution} />
          <BodySection title="Perspective" text={decision.perspective} />
        </View>

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
                onPress={() => router.push(ficheHref(d) as never)}
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

        {showLineage ? (
          <View style={styles.lineage}>
            <Text style={styles.relatedTitle}>Lignée jurisprudentielle</Text>
            <Text style={styles.lineageHint}>
              Arborescence jusqu’à {LINEAGE_DEPTH} niveaux de relations
            </Text>
            <View style={styles.tree}>
              {lineageNodes.map((node) => {
                const d = node.decision;
                const isCurrent = d.id === decision.id;
                const branch =
                  node.depth === 0 ? "" : node.isLast ? "└─ " : "├─ ";
                return (
                  <Pressable
                    key={`${node.depth}-${d.id}`}
                    disabled={isCurrent}
                    onPress={() => router.push(ficheHref(d) as never)}
                    style={styles.treeRow}
                  >
                    <View style={styles.treeGuides}>
                      {node.guides.map((cont, gi) => (
                        <Text key={gi} style={styles.treeGuide}>
                          {cont ? "│ " : "  "}
                        </Text>
                      ))}
                      {node.depth > 0 ? (
                        <Text style={styles.treeBranch}>{branch}</Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.treeDot,
                        isCurrent && styles.treeDotCurrent,
                        node.depth > 0 && styles.treeDotLevel,
                      ]}
                    />
                    <View style={styles.treeBody}>
                      {node.depth > 0 ? (
                        <Text style={styles.treeLevel}>N{node.depth}</Text>
                      ) : null}
                      <Text
                        style={[
                          styles.treeNom,
                          isCurrent && styles.treeNomCurrent,
                        ]}
                        numberOfLines={2}
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: -4,
    gap: 12,
  },
  listenBtn: { paddingVertical: 4 },
  listenText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  listenDisabled: { color: colors.muted, fontWeight: "600" },
  chronoLink: {
    marginLeft: "auto",
    paddingVertical: 4,
  },
  chronoLinkText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
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
  highlightAccent: { borderLeftColor: colors.accent },
  highlightTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.brass,
    marginBottom: 6,
  },
  highlightTitleAccent: { color: colors.accent },
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
    gap: 12,
  },
  bodyLabel: {
    fontWeight: "700",
    color: colors.ink,
  },
  bodyText: { fontSize: 14, lineHeight: 21, color: colors.versoText },
  related: {
    marginTop: 18,
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
  lineageHint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  tree: { marginTop: 4, gap: 2 },
  treeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    gap: 6,
  },
  treeGuides: { flexDirection: "row", paddingTop: 1 },
  treeGuide: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
    color: colors.border,
  },
  treeBranch: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  treeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 5,
  },
  treeDotCurrent: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: 4,
  },
  treeDotLevel: {
    backgroundColor: colors.brass,
    opacity: 0.85,
  },
  treeBody: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 6 },
  treeLevel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.brass,
    marginTop: 2,
    minWidth: 18,
  },
  treeNom: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  treeNomCurrent: { color: colors.ink, fontWeight: "700" },
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
