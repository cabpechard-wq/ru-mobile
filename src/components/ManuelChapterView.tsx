import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCardsData } from "../data/CardsProvider";
import { useChronologieData } from "../data/ChronologieProvider";
import { nameInSet, nameKeySet } from "../data/coursThemes";
import { useDictionnaireData } from "../data/DictionnaireProvider";
import { useEnchainementsData } from "../data/EnchainementsProvider";
import { useEnchainementsSession } from "../data/EnchainementsSessionContext";
import { pickRandomChain, shuffledOrder } from "../data/enchainements";
import { useFlipcardsDicoData } from "../data/FlipcardsDicoProvider";
import { useManuelData } from "../data/ManuelProvider";
import { breadcrumb, refForChapterId } from "../data/manuel";
import { neighborsForChapter } from "../data/manuelNav";
import { useRelierDicoData } from "../data/RelierDicoProvider";
import { useRelierData } from "../data/RelierProvider";
import { pickBatch } from "../data/relier";
import { useRelierSession } from "../data/RelierSessionContext";
import { useAuth } from "../data/AuthContext";
import { TRAIL } from "../data/sections";
import { useStudySession } from "../data/StudyContext";
import { colors } from "../theme/colors";
import { ErrorScreen, LoadingScreen } from "./DataStatus";
import { GuestPreview } from "./GuestPreview";
import { PageHeader } from "./PageHeader";
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
  const flipDico = useFlipcardsDicoData();
  const { setSession } = useStudySession();
  const relierState = useRelierData();
  const relierDico = useRelierDicoData();
  const { setSession: setRelierSession } = useRelierSession();
  const enchainementsState = useEnchainementsData();
  const { setSession: setEnchainementsSession } = useEnchainementsSession();

  const exercises =
    manuel.status === "ready" ? manuel.exercises[chapterRef] : undefined;
  const jurisprudence = exercises?.jurisprudence ?? [];
  const notions = exercises?.notions ?? [];
  if (!jurisprudence.length && !notions.length) return null;

  const notionKeys = nameKeySet(notions);
  const notionCards =
    flipDico.status === "ready"
      ? flipDico.data.allCards.filter(
          (c) => nameInSet(c.recto, notionKeys) || nameInSet(c.id, notionKeys)
        )
      : [];
  const notionRelier =
    relierDico.status === "ready"
      ? relierDico.data.allItems.filter(
          (i) => nameInSet(i.recto, notionKeys) || nameInSet(i.id, notionKeys)
        )
      : [];

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

  const startRelier = () => {
    if (relierState.status !== "ready") return;
    const names = new Set(jurisprudence);
    const items = shuffle(
      relierState.data.allItems.filter((i) => names.has(i.recto))
    );
    if (items.length < 2) return;
    const batch = pickBatch(items, items.length);
    setRelierSession({
      items: batch,
      pack: "arrets",
      pool: items,
      batchSize: batch.length,
    });
    router.push("/relier/session");
  };

  const startEnchainements = () => {
    if (enchainementsState.status !== "ready") return;
    const decisions = enchainementsState.decisions.filter((d) =>
      jurisprudence.includes(d.nom)
    );
    const chain = pickRandomChain(decisions);
    if (!chain) {
      router.push({ pathname: "/enchainements", params: { cours: chapterRef } });
      return;
    }
    setEnchainementsSession({ items: shuffledOrder(chain) });
    router.push("/enchainements/session");
  };

  const startFlipcardsNotions = () => {
    const cards = shuffle(notionCards);
    if (!cards.length) return;
    setSession({
      cards,
      hint: `${title} · ${cards.length} carte(s)`,
      selectedIds: cards.map((c) => c.id || c.recto),
      pack: "notions",
    });
    router.push("/study");
  };

  const startRelierNotions = () => {
    const items = shuffle(notionRelier);
    if (items.length < 2) return;
    const batch = pickBatch(items, items.length);
    setRelierSession({
      items: batch,
      pack: "notions",
      pool: items,
      batchSize: batch.length,
    });
    router.push("/relier/session");
  };

  return (
    <View style={styles.exercises} accessibilityLabel="Exercices liés à ce chapitre">
      {jurisprudence.length ? (
        <>
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
              disabled={relierState.status !== "ready"}
              onPress={startRelier}
            >
              <Text style={styles.exerciseBtnText}>Relier</Text>
            </Pressable>
            <Pressable
              style={styles.exerciseBtn}
              disabled={enchainementsState.status !== "ready"}
              onPress={startEnchainements}
            >
              <Text style={styles.exerciseBtnText}>Enchaînements logiques</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {notions.length ? (
        <>
          <Text
            style={[
              styles.exercisesTitle,
              jurisprudence.length ? styles.notionsTitle : null,
            ]}
          >
            Apprendre les notions de ce cours{" "}
            <Text style={styles.exercisesCount}>({notions.length})</Text>
          </Text>
          <View style={styles.exercisesActions}>
            <Pressable
              style={styles.exerciseBtn}
              disabled={!notionCards.length}
              onPress={startFlipcardsNotions}
            >
              <Text
                style={[
                  styles.exerciseBtnText,
                  !notionCards.length && styles.exerciseBtnTextDisabled,
                ]}
              >
                Flipcards
              </Text>
            </Pressable>
            <Pressable
              style={styles.exerciseBtn}
              disabled={notionRelier.length < 2}
              onPress={startRelierNotions}
            >
              <Text
                style={[
                  styles.exerciseBtnText,
                  notionRelier.length < 2 && styles.exerciseBtnTextDisabled,
                ]}
              >
                Relier
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
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
  const auth = useAuth();
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
      <View style={styles.wrap}>
        <PageHeader trail={[...TRAIL.manuel]} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.empty}>Chapitre introuvable.</Text>
        </ScrollView>
      </View>
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
      if (known) {
        router.push(`/arrets/${run.target}`);
      }
      return;
    }
    if (run.kind === "manuel" && run.target) {
      if (state.chapters.has(run.target)) router.push(`/manuel/${run.target}`);
    }
  };

  const crumbTrail = [
    ...TRAIL.manuel,
    ...trail.slice(1).map((c) => c.title),
  ];

  return (
    <View style={styles.wrap}>
      <PageHeader trail={crumbTrail} />
      <View style={styles.stickyBar}>
        <Text style={styles.stickyTitle} numberOfLines={2}>
          {chapter.title}
        </Text>
        {isRoot ? (
          <Text style={styles.stickyLead}>
            Cours structuré couvrant le programme universitaire (
            {state.ficheCount} fiches).
          </Text>
        ) : null}
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
            style={[
              styles.chapNavBtn,
              styles.chapNavNext,
              !next && styles.chapNavDisabled,
            ]}
          >
            <Text style={styles.chapNavLabel} numberOfLines={1}>
              chap. suivant
            </Text>
            <Text style={styles.chapNavArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {chapter.blocks.length ? (
          <GuestPreview>
            <View style={styles.prose}>
              <Prose
                blocks={chapter.blocks}
                onLink={onLink}
                collapsible={auth.status === "authenticated"}
              />
            </View>
          </GuestPreview>
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
  stickyTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: colors.title,
  },
  stickyLead: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
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
  chapNavLabel: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 12,
    flexShrink: 1,
  },
  scroll: { padding: 16, paddingBottom: 48 },
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
  childTitle: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 14,
    flexShrink: 1,
  },
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
  notionsTitle: { marginTop: 16 },
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
  exerciseBtnTextDisabled: {
    color: colors.muted,
    opacity: 0.5,
  },
});
