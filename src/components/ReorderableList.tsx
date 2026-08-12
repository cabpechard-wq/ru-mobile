import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

const ROW_GAP = 8;

type RenderArgs<T> = {
  item: T;
  index: number;
  dragHandle: React.ReactNode;
};

type Props<T> = {
  data: T[];
  keyExtractor?: (item: T, index: number) => string;
  renderItem: (args: RenderArgs<T>) => React.ReactNode;
  onReorder: (next: T[]) => void;
  enabled?: boolean;
  onDragStateChange?: (dragging: boolean) => void;
};

type RowProps<T> = {
  item: T;
  index: number;
  enabled: boolean;
  onMeasure: (index: number, height: number) => void;
  heights: number[];
  onReorder: (from: number, to: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  renderItem: (args: RenderArgs<T>) => React.ReactNode;
};

function Row<T>({
  item,
  index,
  enabled,
  onMeasure,
  heights,
  onReorder,
  onDragStateChange,
  renderItem,
}: RowProps<T>) {
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const heightsSV = useSharedValue(heights);
  const indexSV = useSharedValue(index);

  useEffect(() => {
    heightsSV.value = heights;
  }, [heights, heightsSV]);

  useEffect(() => {
    indexSV.value = index;
  }, [index, indexSV]);

  const move = useCallback(
    (from: number, to: number) => {
      if (from !== to) onReorder(from, to);
    },
    [onReorder],
  );

  const setDraggingJS = useCallback(
    (v: boolean) => {
      onDragStateChange?.(v);
    },
    [onDragStateChange],
  );

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(180)
    .onStart(() => {
      "worklet";
      dragging.value = 1;
      runOnJS(setDraggingJS)(true);
    })
    .onUpdate((e) => {
      "worklet";
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      "worklet";
      const h = heightsSV.value;
      const from = indexSV.value;
      const myH = h[from] ?? 56;
      let offset = 0;
      let target = from;
      const ty = translateY.value;

      if (ty > 0) {
        for (let i = from + 1; i < h.length; i++) {
          const next = h[i] ?? myH;
          if (ty > offset + next / 2 + ROW_GAP / 2) {
            target = i;
            offset += next + ROW_GAP;
          } else break;
        }
      } else if (ty < 0) {
        for (let i = from - 1; i >= 0; i--) {
          const prev = h[i] ?? myH;
          if (ty < -(offset + prev / 2 + ROW_GAP / 2)) {
            target = i;
            offset += prev + ROW_GAP;
          } else break;
        }
      }

      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      dragging.value = 0;
      runOnJS(setDraggingJS)(false);
      runOnJS(move)(from, target);
    })
    .onFinalize(() => {
      "worklet";
      if (dragging.value) {
        dragging.value = 0;
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        runOnJS(setDraggingJS)(false);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: dragging.value ? 20 : 0,
    elevation: dragging.value ? 8 : 0,
    shadowOpacity: dragging.value ? 0.18 : 0,
    shadowRadius: dragging.value ? 10 : 0,
    shadowOffset: { width: 0, height: dragging.value ? 4 : 0 },
    shadowColor: "#000",
  }));

  const dragHandle = (
    <GestureDetector gesture={pan}>
      <View
        style={[styles.handle, !enabled && styles.handleDisabled]}
        accessibilityLabel="Réordonner"
        accessibilityRole="button"
      >
        <Text style={styles.handleIcon}>⠿</Text>
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View
      style={[styles.rowWrap, style]}
      onLayout={(e) => onMeasure(index, e.nativeEvent.layout.height)}
    >
      {renderItem({ item, index, dragHandle })}
    </Animated.View>
  );
}

export function ReorderableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  enabled = true,
  onDragStateChange,
}: Props<T>) {
  const [heights, setHeights] = useState<number[]>(() => data.map(() => 56));

  useEffect(() => {
    setHeights((prev) => {
      if (prev.length === data.length) return prev;
      return data.map((_, i) => prev[i] ?? 56);
    });
  }, [data.length]);

  const onMeasure = useCallback((index: number, height: number) => {
    setHeights((prev) => {
      if (prev[index] === height) return prev;
      const next = [...prev];
      next[index] = height;
      return next;
    });
  }, []);

  const handleReorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const next = [...data];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    },
    [data, onReorder],
  );

  return (
    <View style={styles.list}>
      {data.map((item, index) => (
        <Row
          key={keyExtractor ? keyExtractor(item, index) : String(index)}
          item={item}
          index={index}
          enabled={enabled}
          onMeasure={onMeasure}
          heights={heights}
          onReorder={handleReorder}
          onDragStateChange={onDragStateChange}
          renderItem={renderItem}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: ROW_GAP,
  },
  rowWrap: {
    backgroundColor: "transparent",
  },
  handle: {
    width: 40,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  handleDisabled: {
    opacity: 0.35,
  },
  handleIcon: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 24,
  },
});
