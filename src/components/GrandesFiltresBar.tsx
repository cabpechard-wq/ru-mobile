import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Accordion } from "./Accordion";
import { Chip } from "./Chip";
import { themeLabel, uniqueSorted } from "../data/arrets";
import { starsLabel, type Decision } from "../data/decisions";
import { colors } from "../theme/colors";

export type GrandesFiltersCore = {
  query: string;
  reference: string;
  juridiction: string | null;
  formation: string | null;
  theme: string | null;
  notion: string | null;
  importance: number | null;
  yearFrom: string;
  yearTo: string;
};

export function GrandesFiltresBar<T extends GrandesFiltersCore>({
  decisions,
  filters,
  onChange,
  extra,
}: {
  decisions: Decision[];
  filters: T;
  onChange: (next: T) => void;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof GrandesFiltersCore>(key: K, value: T[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const facets = useMemo(() => {
    const scoped = filters.juridiction
      ? decisions.filter((d) => (d.juridiction || "") === filters.juridiction)
      : decisions;
    return {
      juridictions: uniqueSorted(decisions.map((d) => d.juridiction)),
      formations: uniqueSorted(scoped.map((d) => d.formation)),
      themes: uniqueSorted(
        decisions.map((d) => themeLabel(d.theme) || d.theme)
      ),
      notions: uniqueSorted(decisions.flatMap((d) => d.notions || [])),
    };
  }, [decisions, filters.juridiction]);

  const any =
    !!filters.query.trim() ||
    !!filters.reference.trim() ||
    !!filters.juridiction ||
    !!filters.formation ||
    !!filters.theme ||
    !!filters.notion ||
    filters.importance != null ||
    !!filters.yearFrom.trim() ||
    !!filters.yearTo.trim();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.grow]}
          placeholder="Recherche"
          placeholderTextColor={colors.muted}
          value={filters.query}
          onChangeText={(v) => set("query", v as T["query"])}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.ref]}
          placeholder="Référence"
          placeholderTextColor={colors.muted}
          value={filters.reference}
          onChangeText={(v) => set("reference", v as T["reference"])}
          autoCapitalize="none"
        />
      </View>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>
          {open ? "Masquer le filtre avancé" : "Filtre avancé"}
          {any ? " · actifs" : ""}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.card}>
          <Accordion
            title="Juridictions"
            onClear={() =>
              onChange({
                ...filters,
                juridiction: null,
                formation: null,
              } as T)
            }
          >
            <View style={styles.chips}>
              {facets.juridictions.map((j) => (
                <Chip
                  key={j}
                  label={j}
                  selected={filters.juridiction === j}
                  onPress={() =>
                    onChange({
                      ...filters,
                      juridiction: filters.juridiction === j ? null : j,
                      formation: null,
                    } as T)
                  }
                />
              ))}
            </View>
          </Accordion>
          {filters.juridiction && facets.formations.length ? (
            <Accordion
              title="Formation de jugement"
              onClear={() => set("formation", null as T["formation"])}
            >
              <View style={styles.chips}>
                {facets.formations.map((f) => (
                  <Chip
                    key={f}
                    label={f}
                    selected={filters.formation === f}
                    onPress={() =>
                      set(
                        "formation",
                        (filters.formation === f ? null : f) as T["formation"]
                      )
                    }
                  />
                ))}
              </View>
            </Accordion>
          ) : null}
          <Accordion
            title="Thèmes (1 seul)"
            onClear={() => set("theme", null as T["theme"])}
          >
            <View style={styles.chips}>
              {facets.themes.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={filters.theme === t}
                  onPress={() =>
                    set(
                      "theme",
                      (filters.theme === t ? null : t) as T["theme"]
                    )
                  }
                />
              ))}
            </View>
          </Accordion>
          <Accordion
            title="Notions"
            onClear={() => set("notion", null as T["notion"])}
          >
            <View style={styles.chips}>
              {facets.notions.map((n) => (
                <Chip
                  key={n}
                  label={n}
                  selected={filters.notion === n}
                  onPress={() =>
                    set(
                      "notion",
                      (filters.notion === n ? null : n) as T["notion"]
                    )
                  }
                />
              ))}
            </View>
          </Accordion>
          <Accordion
            title="Importance"
            onClear={() => set("importance", null as T["importance"])}
          >
            <View style={styles.chips}>
              {[1, 2, 3, 4].map((lvl) => (
                <Chip
                  key={lvl}
                  label={starsLabel(lvl)}
                  selected={filters.importance === lvl}
                  onPress={() =>
                    set(
                      "importance",
                      (filters.importance === lvl ? null : lvl) as T["importance"]
                    )
                  }
                />
              ))}
            </View>
          </Accordion>
          <Text style={styles.periodLabel}>Période</Text>
          <View style={styles.periodRow}>
            <TextInput
              style={styles.periodInput}
              placeholder="Début"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={filters.yearFrom}
              onChangeText={(v) => set("yearFrom", v as T["yearFrom"])}
            />
            <Text style={styles.periodSep}>→</Text>
            <TextInput
              style={styles.periodInput}
              placeholder="Fin"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={filters.yearTo}
              onChangeText={(v) => set("yearTo", v as T["yearTo"])}
            />
          </View>
          {extra}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 12 },
  row: { flexDirection: "row", gap: 8 },
  grow: { flex: 1.4 },
  ref: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  toggle: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  toggleText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  periodLabel: { fontWeight: "700", color: colors.ink, marginTop: 4 },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  periodInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.ink,
  },
  periodSep: { color: colors.muted, fontWeight: "700" },
});
