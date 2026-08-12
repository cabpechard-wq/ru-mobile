import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useChronologieData } from "../data/ChronologieProvider";
import { useDictionnaireData } from "../data/DictionnaireProvider";
import { useManuelData } from "../data/ManuelProvider";
import { breadcrumb } from "../data/manuel";
import { colors } from "../theme/colors";
import { ErrorScreen, LoadingScreen } from "./DataStatus";
import { Prose, type ProseLinkHandler } from "./Prose";

export function ManuelChapterView({
  chapterId,
  isRoot,
}: {
  chapterId?: string;
  isRoot?: boolean;
}) {
  const router = useRouter();
  const state = useManuelData();
  const dico = useDictionnaireData();
  const chrono = useChronologieData();

  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "error") {
    return <ErrorScreen message={state.message} onRetry={state.reload} />;
  }

  const resolvedId = chapterId ?? (isRoot ? state.rootIds[0] : undefined);
  const chapter = resolvedId ? state.chapters.get(resolvedId) : undefined;
  if (!chapter) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.empty}>Chapitre introuvable.</Text>
      </ScrollView>
    );
  }

  const trail = breadcrumb(state.chapters, chapter.id);

  const onLink: ProseLinkHandler = (run) => {
    if (run.kind === "dict" && run.target) {
      if (dico.status === "ready" && dico.entries.some((e) => e.id === run.target)) {
        router.push(`/dictionnaire/${run.target}`);
      }
      return;
    }
    if (run.kind === "arret" && run.target) {
      const known = chrono.status === "ready" && chrono.decisions.some((d) => d.id === run.target);
      if (known || chrono.status === "idle-full") {
        router.push(`/chronologie/${run.target}`);
      }
      return;
    }
    if (run.kind === "manuel" && run.target) {
      if (state.chapters.has(run.target)) router.push(`/manuel/${run.target}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← {isRoot ? "Accueil" : "Retour"}</Text>
      </Pressable>

      {trail.length > 1 ? (
        <Text style={styles.crumb} numberOfLines={1}>
          {trail
            .slice(0, -1)
            .map((c) => c.title)
            .join(" › ")}
        </Text>
      ) : null}

      <Text style={styles.title}>{chapter.title}</Text>

      {chapter.blocks.length ? (
        <View style={styles.prose}>
          <Prose blocks={chapter.blocks} onLink={onLink} />
        </View>
      ) : null}

      {chapter.children.length ? (
        <View style={styles.children}>
          {!isRoot && chapter.blocks.length ? (
            <Text style={styles.childrenTitle}>Chapitres</Text>
          ) : null}
          {chapter.children.map((cid) => {
            const child = state.chapters.get(cid);
            if (!child) return null;
            return (
              <Pressable
                key={cid}
                onPress={() => router.push(`/manuel/${cid}`)}
                style={styles.childRow}
              >
                <Text style={styles.childTitle}>{child.title}</Text>
                <Text style={styles.childChevron}>›</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  back: { paddingBottom: 12 },
  backText: { color: colors.accent, fontWeight: "600" },
  crumb: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.title,
    fontFamily: "serif",
    marginBottom: 8,
  },
  prose: { marginTop: 4 },
  children: { marginTop: 16, gap: 8 },
  childrenTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 2,
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  childTitle: { color: colors.ink, fontWeight: "600", fontSize: 14, flexShrink: 1 },
  childChevron: { color: colors.muted, fontSize: 16 },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
});
