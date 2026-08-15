import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCardsData } from "../data/CardsProvider";
import { useChronologieData } from "../data/ChronologieProvider";
import { useDictionnaireData } from "../data/DictionnaireProvider";
import { useManuelData } from "../data/ManuelProvider";
import { breadcrumb, refForChapterId } from "../data/manuel";
import { useStudySession } from "../data/StudyContext";
import { colors } from "../theme/colors";
import { ErrorScreen, LoadingScreen } from "./DataStatus";
import { Prose, type ProseLinkHandler } from "./Prose";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function ChapterExercises({ chapterRef, title }: { chapterRef: string; title: string }) {
  const router = useRouter();
  const manuel = useManuelData();
  const cardsState = useCardsData();
  const { setSession } = useStudySession();

  const exercises =
    manuel.status === "ready" ? manuel.exercises[chapterRef] : undefined;
  const jurisprudence = exercises?.jurisprudence ?? [];
  if (!jurisprudence.length) return null;

  const startFlipcards = () => {
    if (cardsState.status !== "ready") return;
    const names = new Set(jurisprudence);
    const cards = shuffle(
      cardsState.data.allCards.filter((c) => names.has(c.recto))
    );
    if (!cards.length) return;
    setSession({ cards, hint: `${title} · ${cards.length} carte(s)` });
    router.push("/study");
  };

  return (
    <View style={styles.exercises} accessibilityLabel="Exercices liés à ce chapitre">
      <Text style={styles.exercisesTitle}>
        Apprendre la jurisprudence de ce cours{" "}
        <Text style={styles.exercisesCount}>({jurisprudence.length})</Text>
      </Text>
      <View style={styles.exercisesActions}>
        <Pressable
          style={styles.exerciseBtn}
          disabled={cardsState.status !== "ready"}
          onPress={startFlipcards}
        >
          <Text style={styles.exerciseBtnText}>Flipcards</Text>
        </Pressable>
        <Pressable
          style={styles.exerciseBtn}
          onPress={() => router.push({ pathname: "/relier", params: { cours: chapterRef } })}
        >
          <Text style={styles.exerciseBtnText}>Relier</Text>
        </Pressable>
        <Pressable
          style={styles.exerciseBtn}
          onPress={() =>
            router.push({ pathname: "/enchainements", params: { cours: chapterRef } })
          }
        >
          <Text style={styles.exerciseBtnText}>Enchaînements logiques</Text>
        </Pressable>
      </View>
    </View>
  );
}

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

      {(() => {
        const ref = refForChapterId(chapter.id);
        return ref ? <ChapterExercises chapterRef={ref} title={chapter.title} /> : null;
      })()}

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
  exercises: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  exercisesTitle: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  exercisesCount: { color: colors.muted, fontWeight: "600" },
  exercisesActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  exerciseBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exerciseBtnText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
});
