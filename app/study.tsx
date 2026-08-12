import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlipCard } from "../src/components/FlipCard";
import { PageHeader } from "../src/components/PageHeader";
import { pickAsideRandom } from "../src/data/arrets";
import { ASIDE_RANDOM_COUNT } from "../src/data/config";
import { useCardsData } from "../src/data/CardsProvider";
import { useChronologieData } from "../src/data/ChronologieProvider";
import { cardImportanceLevel, starsLabel, type Card } from "../src/data/cards";
import { displayNom, type Decision } from "../src/data/decisions";
import { useDictionnaireData } from "../src/data/DictionnaireProvider";
import { SECTION } from "../src/data/sections";
import { useStudySession } from "../src/data/StudyContext";
import { colors } from "../src/theme/colors";

const PLAY_RECTO_MS = 3000;
const PLAY_VERSO_MS = 7000;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function DetailBox({ title, text }: { title: string; text?: string }) {
  const empty = !(text || "").trim();
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{title}</Text>
      <Text style={[styles.detailText, empty && styles.detailEmpty]}>
        {empty ? "— Non renseigné —" : text}
      </Text>
    </View>
  );
}

function cardKey(c: Card): string {
  return c.id || c.recto;
}

export default function StudyScreen() {
  const router = useRouter();
  const { session } = useStudySession();
  const cardsState = useCardsData();
  const chrono = useChronologieData();
  const dico = useDictionnaireData();
  const pack = session.pack || "arrets";
  const sectionLabel =
    pack === "notions" ? SECTION.flipcardsNotions : SECTION.flipcardsArrets;
  const base = session.cards;
  const selectedIds = useMemo(() => {
    if (session.selectedIds?.length) return new Set(session.selectedIds);
    return new Set(base.map(cardKey));
  }, [session.selectedIds, base]);

  const [order, setOrder] = useState(() => base.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [asideTick, setAsideTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flippedRef = useRef(flipped);
  const indexRef = useRef(index);
  const playingRef = useRef(playing);
  const cardsLenRef = useRef(0);

  flippedRef.current = flipped;
  indexRef.current = index;
  playingRef.current = playing;

  useEffect(() => {
    setOrder(base.map((_, i) => i));
    setIndex(0);
    setFlipped(false);
    setShuffled(false);
    setPlaying(false);
    setDetailsOpen(false);
    setAsideTick((n) => n + 1);
  }, [base]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cards = useMemo(
    () => order.map((i) => base[i]).filter(Boolean),
    [order, base]
  );
  cardsLenRef.current = cards.length;
  const current = cards[index];

  /** Pool « N au hasard » : Chronologie (arrêts) ou Dictionnaire (notions). */
  const asidePool: {
    id: string;
    label: string;
    href: string;
    objet?: string;
    portee?: string;
    definition?: string;
  }[] = useMemo(() => {
    if (pack === "notions") {
      if (dico.status !== "ready") return [];
      return dico.entries.map((e) => ({
        id: e.id,
        label: e.term,
        href: `/dictionnaire/${e.id}`,
        definition: e.definition,
      }));
    }
    if (chrono.status === "ready") {
      return chrono.decisions.map((d: Decision) => ({
        id: d.id,
        label: displayNom(d.nom, true),
        href: `/arrets/${d.id}`,
        objet: d.objet,
        portee: d.portee,
      }));
    }
    if (cardsState.status === "ready") {
      return cardsState.data.allCards.map((c) => ({
        id: cardKey(c),
        label: c.recto,
        href: `/arrets/${cardKey(c)}`,
        objet: c.objet,
        portee: c.portee,
      }));
    }
    return [];
  }, [pack, chrono, cardsState, dico]);

  const asideItems = useMemo(() => {
    void asideTick;
    const selected =
      pack === "notions"
        ? new Set(
            base.map((c) => (c.recto || "").toLowerCase()).filter(Boolean)
          )
        : selectedIds;
    // Pour notions : exclure les termes déjà dans la sélection d'étude (par label).
    if (pack === "notions") {
      const outside = asidePool.filter(
        (d) => !selected.has(d.label.toLowerCase())
      );
      if (outside.length < ASIDE_RANDOM_COUNT) return [];
      const out = [...outside];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out.slice(0, ASIDE_RANDOM_COUNT);
    }
    return pickAsideRandom(asidePool, selectedIds, ASIDE_RANDOM_COUNT);
  }, [asidePool, selectedIds, asideTick, pack, base]);

  const stopPlay = () => {
    setPlaying(false);
    playingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const go = (n: number) => {
    if (!cardsLenRef.current) return;
    const len = cardsLenRef.current;
    const next = ((n % len) + len) % len;
    setIndex(next);
    indexRef.current = next;
    setFlipped(false);
    flippedRef.current = false;
  };

  const schedulePlayStep = () => {
    if (!playingRef.current || !cardsLenRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = flippedRef.current ? PLAY_VERSO_MS : PLAY_RECTO_MS;
    timerRef.current = setTimeout(() => {
      if (!playingRef.current) return;
      if (!flippedRef.current) {
        setFlipped(true);
        flippedRef.current = true;
        schedulePlayStep();
      } else {
        go(indexRef.current + 1);
        schedulePlayStep();
      }
    }, delay);
  };

  const togglePlay = () => {
    if (playing) {
      stopPlay();
      return;
    }
    if (!cards.length) return;
    setPlaying(true);
    playingRef.current = true;
    schedulePlayStep();
  };

  const toggleShuffle = () => {
    stopPlay();
    setShuffled((s) => {
      const next = !s;
      setOrder(next ? shuffle(base.map((_, i) => i)) : base.map((_, i) => i));
      setIndex(0);
      setFlipped(false);
      return next;
    });
  };

  const ficheId = current ? cardKey(current) : "";
  const showFicheLink = pack === "arrets" && !!ficheId;

  if (!base.length || !current) {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader trail={[sectionLabel, "Étudier"]} />
        <Text style={styles.empty}>Aucune carte pour ces filtres.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader
        trail={[sectionLabel, "Étudier"]}
        right={
          <Text style={styles.summary} numberOfLines={2}>
            {session.hint}
          </Text>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / cards.length) * 100}%` },
            ]}
          />
        </View>

        <FlipCard
          recto={current.recto}
          verso={current.verso}
          flipped={flipped}
          onFlip={() => setFlipped((v) => !v)}
          stars={starsLabel(cardImportanceLevel(current))}
        />

        {showFicheLink ? (
          <Pressable
            testID="open-fiche"
            onPress={() => router.push(`/arrets/${ficheId}`)}
            style={styles.ficheLink}
          >
            <Text style={styles.ficheLinkText}>Ouvrir la fiche d'arrêt →</Text>
          </Pressable>
        ) : null}

        <View style={styles.controls}>
          <View style={styles.side}>
            <Pressable
              onPress={togglePlay}
              style={[styles.iconBtn, playing && styles.iconActive]}
              accessibilityLabel="Lecture auto (recto 3 s · verso 7 s)"
            >
              <Text style={[styles.icon, playing && styles.iconActiveText]}>
                {playing ? "⏸" : "▶"}
              </Text>
            </Pressable>
            <Pressable
              onPress={toggleShuffle}
              style={[styles.iconBtn, shuffled && styles.iconActive]}
              accessibilityLabel="Mélanger"
            >
              <Text style={[styles.icon, shuffled && styles.iconActiveText]}>
                ⇄
              </Text>
            </Pressable>
          </View>
          <View style={styles.center}>
            <Pressable
              onPress={() => {
                stopPlay();
                go(index - 1);
              }}
              style={styles.navBtn}
            >
              <Text style={styles.navText}>‹</Text>
            </Pressable>
            <Text style={styles.counter}>
              {index + 1} / {cards.length}
            </Text>
            <Pressable
              onPress={() => {
                stopPlay();
                go(index + 1);
              }}
              style={styles.navBtn}
            >
              <Text style={[styles.navText, styles.navPrimaryText]}>›</Text>
            </Pressable>
          </View>
          <View style={[styles.side, styles.sideRight]} />
        </View>

        {pack === "arrets" ? (
          <>
            <Pressable
              onPress={() => setDetailsOpen((v) => !v)}
              style={[styles.detailsBtn, detailsOpen && styles.detailsBtnActive]}
              accessibilityState={{ expanded: detailsOpen }}
            >
              <Text
                style={[
                  styles.detailsBtnText,
                  detailsOpen && styles.detailsBtnTextActive,
                ]}
              >
                Objet · Portée · Considérant
              </Text>
            </Pressable>

            {detailsOpen ? (
              <View style={styles.details}>
                <DetailBox title="Objet" text={current.objet} />
                <DetailBox title="Portée" text={current.portee} />
                <DetailBox
                  title="Considérant de principe"
                  text={current.considerant}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {asideItems.length === ASIDE_RANDOM_COUNT ? (
          <View style={styles.aside}>
            <View style={styles.asideHead}>
              <Text style={styles.asideTitle}>
                {pack === "notions"
                  ? `${ASIDE_RANDOM_COUNT} notions au hasard`
                  : `${ASIDE_RANDOM_COUNT} au hasard`}
              </Text>
              <Pressable onPress={() => setAsideTick((n) => n + 1)}>
                <Text style={styles.asideRefresh}>Autres</Text>
              </Pressable>
            </View>
            <Text style={styles.asideHint}>
              {pack === "notions"
                ? "Tirées du Dictionnaire, hors sélection."
                : `Hors sélection (${asidePool.length - selectedIds.size} / ${asidePool.length}).`}
            </Text>
            {asideItems.map((item) => (
              <Pressable
                key={item.id}
                style={styles.asideRow}
                onPress={() => router.push(item.href as never)}
              >
                <Text style={styles.asideRowText} numberOfLines={2}>
                  {item.label}
                </Text>
                {pack === "arrets" ? (
                  <>
                    {item.objet ? (
                      <Text style={styles.asideMeta} numberOfLines={3}>
                        <Text style={styles.asideMetaLabel}>Objet — </Text>
                        {item.objet}
                      </Text>
                    ) : null}
                    {item.portee ? (
                      <Text style={styles.asideMeta} numberOfLines={3}>
                        <Text style={styles.asideMetaLabel}>Portée — </Text>
                        {item.portee}
                      </Text>
                    ) : null}
                  </>
                ) : item.definition ? (
                  <Text style={styles.asideMeta} numberOfLines={4}>
                    {item.definition}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    padding: 16,
    paddingBottom: 48,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  summary: {
    color: colors.muted,
    fontWeight: "500",
    fontSize: 11,
    textAlign: "right",
  },
  progressTrack: {
    height: 2,
    backgroundColor: "#f3f4f6",
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 12,
    alignSelf: "center",
    width: "100%",
    maxWidth: 448,
  },
  progressFill: { height: "100%", backgroundColor: colors.accent },
  ficheLink: { alignSelf: "center", marginTop: 10, paddingVertical: 4 },
  ficheLinkText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  controls: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  side: { flex: 1, flexDirection: "row", gap: 2 },
  sideRight: { justifyContent: "flex-end" },
  center: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: colors.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: { backgroundColor: colors.accentSoft },
  icon: { fontSize: 15, color: colors.ink },
  iconActiveText: { color: colors.accent },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: colors.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: { fontSize: 26, color: colors.ink, lineHeight: 28 },
  navPrimaryText: { color: colors.accent },
  counter: {
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
    minWidth: 64,
    textAlign: "center",
  },
  detailsBtn: {
    alignSelf: "center",
    marginTop: 14,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailsBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  detailsBtnText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  detailsBtnTextActive: { color: "#fff" },
  details: { marginTop: 12, gap: 10, width: "100%" },
  detailBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 6,
  },
  detailText: { fontSize: 14, lineHeight: 21, color: colors.versoText },
  detailEmpty: { color: colors.muted, fontStyle: "italic" },
  aside: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    padding: 12,
    gap: 6,
  },
  asideHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  asideTitle: { fontWeight: "700", color: colors.ink, fontSize: 14 },
  asideRefresh: { color: colors.accent, fontWeight: "700", fontSize: 12 },
  asideHint: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  asideRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 4,
  },
  asideRowText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  asideMeta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  asideMetaLabel: { color: colors.ink, fontWeight: "700" },
  empty: {
    marginTop: 40,
    textAlign: "center",
    color: colors.muted,
    fontSize: 16,
  },
});
