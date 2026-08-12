import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Accordion } from "../../src/components/Accordion";
import { ErrorScreen } from "../../src/components/DataStatus";
import { PageHeader } from "../../src/components/PageHeader";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { useDictionnaireData } from "../../src/data/DictionnaireProvider";
import { useManuelData } from "../../src/data/ManuelProvider";
import {
  chapterIdFromManuelPath,
  groupByLetter,
  searchEntries,
  splitCoursLinks,
  type DictEntry,
} from "../../src/data/dictionnaire";
import { SECTION } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

/** `../arrets/ce-2021-.../` -> `ce-2021-...` */
function slugFromArretPath(path: string): string | null {
  const m = path.match(/\/arrets\/([^/]+)\/?$/);
  return m ? m[1] : null;
}

function EntryRow({
  entry,
  knownDecisionIds,
  knownChapterIds,
  onOpenDecision,
  onOpenChapter,
}: {
  entry: DictEntry;
  knownDecisionIds: Set<string> | null;
  knownChapterIds: Set<string> | null;
  onOpenDecision: (id: string) => void;
  onOpenChapter: (id: string) => void;
}) {
  const { chapitres, arrets } = splitCoursLinks(entry.cours);
  return (
    <View style={styles.entry}>
      <Text style={styles.term}>{entry.term}</Text>
      <Text style={styles.def}>{entry.definition}</Text>
      {chapitres.length ? (
        <View style={styles.linksRow}>
          <Text style={styles.linksLabel}>Cours : </Text>
          {chapitres.map((c, i) => {
            const chapterId = chapterIdFromManuelPath(c.path);
            const tappable =
              !!chapterId && !!knownChapterIds?.has(chapterId);
            return (
              <Text key={c.path}>
                <Text
                  style={tappable ? styles.linkTappable : styles.linkPlain}
                  onPress={
                    tappable ? () => onOpenChapter(chapterId!) : undefined
                  }
                >
                  {c.label}
                </Text>
                {i < chapitres.length - 1 ? (
                  <Text style={styles.linksLabel}> · </Text>
                ) : null}
              </Text>
            );
          })}
        </View>
      ) : null}
      {arrets.length ? (
        <View style={styles.linksRow}>
          <Text style={styles.linksLabel}>Jurisprudence : </Text>
          {arrets.map((a, i) => {
            const slug = slugFromArretPath(a.path);
            const tappable = !!slug && !!knownDecisionIds?.has(slug);
            return (
              <Text key={a.path}>
                <Text
                  style={tappable ? styles.linkTappable : styles.linkPlain}
                  onPress={tappable ? () => onOpenDecision(slug!) : undefined}
                >
                  {a.label}
                </Text>
                {i < arrets.length - 1 ? (
                  <Text style={styles.linksLabel}> · </Text>
                ) : null}
              </Text>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function DictionnaireScreen() {
  const router = useRouter();
  const state = useDictionnaireData();
  const chrono = useChronologieData();
  const manuel = useManuelData();
  const [query, setQuery] = useState("");

  const knownDecisionIds = useMemo(
    () => (chrono.status === "ready" ? new Set(chrono.decisions.map((d) => d.id)) : null),
    [chrono]
  );
  const knownChapterIds = useMemo(
    () => (manuel.status === "ready" ? new Set(manuel.chapters.keys()) : null),
    [manuel]
  );

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    return searchEntries(state.entries, query);
  }, [state, query]);
  const groups = useMemo(() => groupByLetter(filtered), [filtered]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[SECTION.dictionnaire]} />
      {state.status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.centerText}>Chargement…</Text>
        </View>
      ) : null}
      {state.status === "error" ? (
        <ErrorScreen message={state.message} onRetry={state.reload} />
      ) : null}
      {state.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Dictionnaire</Text>
          <Text style={styles.sub}>{state.entries.length} notions.</Text>

          <TextInput
            style={styles.search}
            placeholder="Rechercher un terme…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />

          {groups.map((g) => (
            <Accordion
              key={`${g.letter}-${query ? "search" : "browse"}`}
              title={`${g.letter} (${g.items.length})`}
              initiallyOpen={!!query.trim()}
            >
              <View style={styles.groupList}>
                {g.items.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    knownDecisionIds={knownDecisionIds}
                    knownChapterIds={knownChapterIds}
                    onOpenDecision={(id) => router.push(`/chronologie/${id}`)}
                    onOpenChapter={(id) => router.push(`/manuel/${id}`)}
                  />
                ))}
              </View>
            </Accordion>
          ))}

          {!groups.length ? (
            <Text style={styles.empty}>Aucun terme ne correspond.</Text>
          ) : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  centerText: { color: colors.muted, fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.title,
    marginBottom: 4,
    fontFamily: "serif",
  },
  sub: { color: colors.muted, fontSize: 14, marginBottom: 14 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.card,
    marginBottom: 14,
  },
  groupList: { gap: 10 },
  entry: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    padding: 12,
  },
  term: { fontWeight: "700", color: colors.ink, fontSize: 14, marginBottom: 3 },
  def: { color: colors.versoText, fontSize: 13, lineHeight: 19 },
  linksRow: { marginTop: 4, flexDirection: "row", flexWrap: "wrap" },
  linksLabel: { color: colors.muted, fontSize: 11, fontStyle: "italic" },
  linkPlain: { color: colors.muted, fontSize: 11, fontStyle: "italic" },
  linkTappable: {
    color: colors.brass,
    fontSize: 11,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  empty: { textAlign: "center", marginTop: 30, color: colors.muted },
});
