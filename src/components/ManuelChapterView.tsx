import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useChronologieData } from "../data/ChronologieProvider";
import { useDictionnaireData } from "../data/DictionnaireProvider";
import { useManuelData } from "../data/ManuelProvider";
import { breadcrumb } from "../data/manuel";
import { neighborsForChapter } from "../data/manuelNav";
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
  const { prev, next } = neighborsForChapter(
    state.chapters,
    state.rootIds,
    chapter.id
  );

  const onLink: ProseLinkHandler = (run) => {
    if (run.kind === "dict" && run.target) {
      if (dico.status === "ready" && dico.entries.some((e) => e.id === run.target)) {
        router.push(`/dictionnaire/${run.target}`);
      }
      return;
    }
    if (run.kind === "arret" && run.target) {
      const known =
        chrono.status === "ready" &&
        chrono.decisions.some((d) => d.id === run.target);
      if (known || chrono.status === "idle-full") {
        router.push(`/arrets/${run.target}`);
      }
      return;
    }
    if (run.kind === "manuel" && run.target) {
      if (state.chapters.has(run.target)) router.push(`/manuel/${run.target}`);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.stickyBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {isRoot ? "Accueil" : "Retour"}</Text>
        </Pressable>
        <Text style={styles.stickyTitle} numberOfLines={2}>
          {chapter.title}
        </Text>
        <View style={styles.chapNav}>
          <Pressable
            disabled={!prev}
            onPress={() => prev && router.push(`/manuel/${prev.id}`)}
            style={[styles.chapNavBtn, !prev && styles.chapNavDisabled]}
          >
            <Text style={styles.chapNavArrow}>‹</Text>
            <Text style={styles.chapNavLabel} numberOfLines={1}>
              chap. précédent
            </Text>
          </Pressable>
          <Pressable
            disabled={!next}
            onPress={() => next && router.push(`/manuel/${next.id}`)}
            style={[styles.chapNavBtn, styles.chapNavNext, !next && styles.chapNavDisabled]}
          >
            <Text style={styles.chapNavLabel} numberOfLines={1}>
              chap. suivant
            </Text>
            <Text style={styles.chapNavArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {trail.length > 1 ? (
          <Text style={styles.crumb} numberOfLines={2}>
            {trail
              .slice(0, -1)
              .map((c) => c.title)
              .join(" › ")}
          </Text>
        ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  stickyBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  backBtn: { alignSelf: "flex-start" },
  backText: { color: colors.accent, fontWeight: "600" },
  stickyTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: colors.title,
  },
  chapNav: { flexDirection: "row", gap: 8, marginTop: 2 },
  chapNavBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  chapNavNext: { justifyContent: "flex-end" },
  chapNavDisabled: { opacity: 0.35 },
  chapNavArrow: { color: colors.accent, fontWeight: "700", fontSize: 18 },
  chapNavLabel: { color: colors.ink, fontWeight: "600", fontSize: 12, flexShrink: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  crumb: { color: colors.muted, fontSize: 12, marginBottom: 10 },
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
