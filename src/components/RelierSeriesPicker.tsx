import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip } from "./Chip";
import { RELIER_BOARD_MAX } from "../data/relier";
import { colors } from "../theme/colors";

export { RELIER_BOARD_MAX };

export type RelierSeriesSize = "all" | 3 | 5 | 10;

export const DEFAULT_RELIER_SERIES: RelierSeriesSize = "all";

const OPTIONS: { size: RelierSeriesSize; label: string }[] = [
  { size: "all", label: "Tout" },
  { size: 3, label: "3" },
  { size: 5, label: "5" },
  { size: 10, label: "10" },
];

export function resolveRelierBatchSize(
  size: RelierSeriesSize,
  poolLength: number
): number {
  if (poolLength < 2) return 0;
  if (size === "all") return Math.min(poolLength, RELIER_BOARD_MAX);
  return Math.min(size, poolLength, RELIER_BOARD_MAX);
}

export function RelierSeriesPicker({
  selected,
  onSelect,
  poolLength,
  onStart,
  startTestID,
}: {
  selected: RelierSeriesSize;
  onSelect: (size: RelierSeriesSize) => void;
  poolLength: number;
  onStart: () => void;
  startTestID?: string;
}) {
  const n = resolveRelierBatchSize(selected, poolLength);
  const disabled = n < 2;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Série</Text>
      <View style={styles.chips}>
        {OPTIONS.map((opt) => (
          <Chip
            key={String(opt.size)}
            label={opt.label}
            selected={selected === opt.size}
            onPress={() => onSelect(opt.size)}
          />
        ))}
      </View>
      <Pressable
        testID={startTestID}
        disabled={disabled}
        onPress={onStart}
        style={[styles.btn, disabled && styles.btnDisabled]}
      >
        <Text style={styles.btnText}>
          {selected === "all"
            ? `Commencer · tout le lot (${n})`
            : `Commencer · série de ${n || selected}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 4 },
  title: { fontWeight: "700", color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
