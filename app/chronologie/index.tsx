import { useLocalSearchParams, useRouter } from "expo-router";
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
import { GrandesFiltresBar } from "../../src/components/GrandesFiltresBar";
import { PageHeader } from "../../src/components/PageHeader";
import {
  buildById,
  EMPTY_CHRONO_FILTERS,
  filterChronologie,
  groupByDecade,
  relationCount,
  decadeKey,
  type ChronoFilters,
} from "../../src/data/chronologie";
import { useChronologieData } from "../../src/data/ChronologieProvider";
import { displayNom, starsLabel, type Decision } from "../../src/data/decisions";
import { TRAIL } from "../../src/data/sections";
import { colors } from "../../src/theme/colors";

function DecisionRow({
  decision,
  relCount,
  highlighted,
  onPress,
}: {
  decision: Decision;
  relCount: number;
  highlighted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`decision-row-${decision.id}`}
      onPress={onPress}
      style={[styles.row, highlighted && styles.rowHighlight]}
    >
      <View style={styles.timelineDotCol}>
        <View style={[styles.timelineDot, relCount > 0 && styles.timelineDotLinked]} />
        <View style={styles.timelineStem} />
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowYear}>{decision.annee}</Text>
        <Text style={styles.rowNom} numberOfLines={2}>
          {displayNom(decision.nom, false)}
        </Text>
        {decision.objet ? (
          <Text style={styles.rowObjet} numberOfLines={2}>
            {decision.objet}
          </Text>
        ) : null}
        <View style={styles.rowMeta}>
          {starsLabel(decision.importance) ? (
            <Text style={styles.rowStars}>{starsLabel(decision.importance)}</Text>
          ) : null}
          {relCount > 0 ? (
            <Text style={styles.rowLinks}>{relCount} lien{relCount > 1 ? "s" : ""}</Text>
          ) : null}
          {decision.juridiction ? (
            <Text style={styles.rowJuridiction} numberOfLines={1}>
              {decision.juridiction}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Décennie ouverte par défaut — évite de monter toute la frise (~995). */
const DEFAULT_DECADE = "1820";

function normalizeDecadeParam(raw: string | string[] | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !/^\d{3,4}$/.test(v)) return null;
  return `${Math.floor(Number(v) / 10) * 10}`;
}

export default function ChronologieListScreen() {
  const router = useRouter();
  const { decade: decadeParam, id: idParam } = useLocalSearchParams<{
    decade?: string;
    id?: string;
  }>();
  const state = useChronologieData();
  const [filters, setFilters] = useState<ChronoFilters>(EMPTY_CHRONO_FILTERS);
  const initialDecade = normalizeDecadeParam(decadeParam) || DEFAULT_DECADE;
  const [activeDecade, setActiveDecade] = useState<string | null>(initialDecade);

  useEffect(() => {
    const fromQuery = normalizeDecadeParam(decadeParam);
    if (fromQuery) setActiveDecade(fromQuery);
  }, [decadeParam]);

  const byId = useMemo(
    () => (state.status === "ready" ? buildById(state.decisions) : new Map()),
    [state]
  );

  useEffect(() => {
    if (state.status !== "ready" || !idParam) return;
    const raw = Array.isArray(idParam) ? idParam[0] : idParam;
    const d =
      state.decisions.find((x) => x.id === raw) ||
      state.decisions.find((x) => x.slugFiche === raw);
    if (d) setActiveDecade(decadeKey(d.annee));
  }, [state, idParam]);

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    return filterChronologie(state.decisions, byId, filters);
  }, [state, byId, filters]);

  const highlightId = Array.isArray(idParam) ? idParam[0] : idParam;

  const groups = useMemo(() => groupByDecade(filtered), [filtered]);
  const visibleGroups = activeDecade
    ? groups.filter((g) => g.decade === activeDecade)
    : groups;

  useEffect(() => {
    if (!groups.length) return;
    // null = « Toutes » (choix utilisateur) — on ne force pas.
    if (activeDecade == null) return;
    if (groups.some((g) => g.decade === activeDecade)) return;
    const fallback =
      groups.find((g) => g.decade === DEFAULT_DECADE)?.decade ??
      groups[0]?.decade ??
      null;
    setActiveDecade(fallback);
  }, [groups, activeDecade]);

  const setFilter = <K extends keyof ChronoFilters>(key: K, value: ChronoFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(EMPTY_CHRONO_FILTERS);
    setActiveDecade(DEFAULT_DECADE);
  };

  const anyFilter =
    !!filters.query.trim() ||
    !!filters.reference.trim() ||
    !!filters.juridiction ||
    !!filters.formation ||
    !!filters.theme ||
    !!filters.notion ||
    filters.importance != null ||
    !!filters.yearFrom.trim() ||
    !!filters.yearTo.trim() ||
    filters.relatedOnly;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[...TRAIL.chronologie]} />
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
          <Text style={styles.title}>Chronologie</Text>
          <Text style={styles.sub}>
            {filtered.length} / {state.decisions.length} décisions
            {state.source === "demo" ? " · démo" : ""}. Frise par décennies —
            les pastilles signalent les décisions liées.
          </Text>

          <GrandesFiltresBar
            decisions={state.decisions}
            filters={filters}
            onChange={setFilters}
            extra={
              <>
                <Pressable
                  onPress={() => setFilter("relatedOnly", !filters.relatedOnly)}
                  style={[
                    styles.relatedToggle,
                    filters.relatedOnly && styles.relatedToggleOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.relatedToggleText,
                      filters.relatedOnly && styles.relatedToggleTextOn,
                    ]}
                  >
                    Uniquement les décisions liées
                  </Text>
                </Pressable>
                {anyFilter ? (
                  <Pressable onPress={resetFilters} style={styles.resetBtn}>
                    <Text style={styles.resetText}>Réinitialiser les filtres</Text>
                  </Pressable>
                ) : null}
              </>
            }
          />

          {groups.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.decadeStrip}
            >
              <Pressable
                onPress={() => setActiveDecade(null)}
                style={[styles.decadeChip, !activeDecade && styles.decadeChipOn]}
              >
                <Text
                  style={[
                    styles.decadeChipText,
                    !activeDecade && styles.decadeChipTextOn,
                  ]}
                >
                  Toutes
                </Text>
              </Pressable>
              {groups.map((g) => (
                <Pressable
                  key={g.decade}
                  onPress={() =>
                    setActiveDecade((cur) => (cur === g.decade ? null : g.decade))
                  }
                  style={[
                    styles.decadeChip,
                    activeDecade === g.decade && styles.decadeChipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.decadeChipText,
                      activeDecade === g.decade && styles.decadeChipTextOn,
                    ]}
                  >
                    {g.decade}s · {g.items.length}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {visibleGroups.map((g) => (
            <View key={g.decade} style={styles.decadeBlock}>
              <Text style={styles.decadeTitle}>{g.decade}s</Text>
              <View style={styles.groupList}>
                {g.items.map((d) => (
                  <DecisionRow
                    key={d.id}
                    decision={d}
                    relCount={relationCount(byId, d.id)}
                    highlighted={
                      !!highlightId &&
                      (d.id === highlightId || d.slugFiche === highlightId)
                    }
                    onPress={() =>
                      router.push(`/arrets/${d.slugFiche || d.id}` as never)
                    }
                  />
                ))}
              </View>
            </View>
          ))}

          {!filtered.length ? (
            <Text style={styles.empty}>Aucune décision pour ces filtres.</Text>
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
  centerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    fontFamily: "serif",
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
  scroll: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.title,
    marginBottom: 6,
    fontFamily: "serif",
  },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.card,
    marginBottom: 10,
  },
  filterToggle: { marginBottom: 10 },
  filterToggleText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  filtersCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginBottom: 14,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  periodLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginTop: 8,
    marginBottom: 6,
  },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  periodInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.ink,
  },
  periodSep: { color: colors.muted },
  relatedToggle: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 10,
  },
  relatedToggleOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  relatedToggleText: { color: colors.ink, fontWeight: "600", fontSize: 13 },
  relatedToggleTextOn: { color: colors.accent },
  resetBtn: { marginTop: 10, alignItems: "center" },
  resetText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  decadeStrip: { gap: 8, paddingBottom: 12 },
  decadeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.card,
  },
  decadeChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  decadeChipText: { color: colors.ink, fontWeight: "600", fontSize: 12 },
  decadeChipTextOn: { color: "#fff" },
  decadeBlock: { marginBottom: 18 },
  decadeTitle: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "700",
    color: colors.brass,
    marginBottom: 8,
  },
  groupList: { gap: 0 },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 4,
  },
  rowHighlight: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  timelineDotCol: { width: 16, alignItems: "center" },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginTop: 14,
  },
  timelineDotLinked: { backgroundColor: colors.accent },
  timelineStem: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  rowMain: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 2,
  },
  rowYear: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  rowNom: { fontWeight: "700", color: colors.ink, fontSize: 14 },
  rowObjet: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  rowMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    alignItems: "center",
  },
  rowStars: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  rowLinks: { color: colors.brass, fontSize: 11, fontWeight: "700" },
  rowJuridiction: { color: colors.muted, fontSize: 11, flexShrink: 1 },
  empty: { textAlign: "center", marginTop: 24, color: colors.muted },
});
