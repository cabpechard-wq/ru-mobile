import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

const ROW_GAP = 8;
const SPRING = { damping: 20, stiffness: 280, mass: 0.6 };

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

/** Indice d'atterrissage d'après le déplacement vertical. */
function targetFromTranslation(
  from: number,
  ty: number,
  heights: number[],
): number {
  "worklet";
  let offset = 0;
  let target = from;
  const myH = heights[from] ?? 56;

  if (ty > 0) {
    for (let i = from + 1; i < heights.length; i++) {
      const next = heights[i] ?? myH;
      if (ty > offset + next / 2 + ROW_GAP / 2) {
        target = i;
        offset += next + ROW_GAP;
      } else break;
    }
  } else if (ty < 0) {
    for (let i = from - 1; i >= 0; i--) {
      const prev = heights[i] ?? myH;
      if (ty < -(offset + prev / 2 + ROW_GAP / 2)) {
        target = i;
        offset += prev + ROW_GAP;
      } else break;
    }
  }
  return target;
}

/** Décalage des voisins pour ouvrir un créneau sous le doigt. */
function siblingShift(
  index: number,
  active: number,
  hover: number,
  activeH: number,
): number {
  "worklet";
  if (active < 0 || index === active) return 0;
  if (active < hover) {
    // drag vers le bas : les items entre active et hover remontent
    if (index > active && index <= hover) return -(activeH + ROW_GAP);
  } else if (active > hover) {
    // drag vers le haut : les items entre hover et active descendent
    if (index >= hover && index < active) return activeH + ROW_GAP;
  }
  return 0;
}

type RowProps<T> = {
  item: T;
  index: number;
  enabled: boolean;
  onMeasure: (index: number, height: number) => void;
  heightsSV: SharedValue<number[]>;
  activeIndexSV: SharedValue<number>;
  hoverIndexSV: SharedValue<number>;
  dragTY: SharedValue<number>;
  onDragStart: (index: number) => void;
  onDragEnd: (from: number, to: number) => void;
  onDragCancel: () => void;
  renderItem: (args: RenderArgs<T>) => React.ReactNode;
};

function Row<T>({
  item,
  index,
  enabled,
  onMeasure,
  heightsSV,
  activeIndexSV,
  hoverIndexSV,
  dragTY,
  onDragStart,
  onDragEnd,
  onDragCancel,
  renderItem,
}: RowProps<T>) {
  const indexSV = useSharedValue(index);
  const shiftY = useSharedValue(0);
  const isDragging = useSharedValue(0);

  useEffect(() => {
    indexSV.value = index;
    // Après un reorder React, repartir sans décalage résiduel.
    shiftY.value = 0;
    isDragging.value = 0;
  }, [index, indexSV, shiftY, isDragging]);

  // Les voisins se décalent dès que le créneau cible change.
  useAnimatedReaction(
    () => {
      const active = activeIndexSV.value;
      const hover = hoverIndexSV.value;
      const h = heightsSV.value;
      const activeH = active >= 0 ? (h[active] ?? 56) : 56;
      return siblingShift(indexSV.value, active, hover, activeH);
    },
    (offset, prev) => {
      if (offset === prev) return;
      if (isDragging.value) {
        shiftY.value = 0;
        return;
      }
      shiftY.value = withSpring(offset, SPRING);
    },
  );

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(180)
    .onStart(() => {
      "worklet";
      isDragging.value = 1;
      shiftY.value = 0;
      activeIndexSV.value = indexSV.value;
      hoverIndexSV.value = indexSV.value;
      dragTY.value = 0;
      runOnJS(onDragStart)(indexSV.value);
    })
    .onUpdate((e) => {
      "worklet";
      dragTY.value = e.translationY;
      const from = indexSV.value;
      hoverIndexSV.value = targetFromTranslation(
        from,
        e.translationY,
        heightsSV.value,
      );
    })
    .onEnd(() => {
      "worklet";
      const from = indexSV.value;
      const to = hoverIndexSV.value;
      dragTY.value = 0;
      shiftY.value = 0;
      isDragging.value = 0;
      activeIndexSV.value = -1;
      hoverIndexSV.value = -1;
      runOnJS(onDragEnd)(from, to);
    })
    .onFinalize((_e, success) => {
      "worklet";
      if (!success && isDragging.value) {
        dragTY.value = withSpring(0, SPRING);
        shiftY.value = 0;
        isDragging.value = 0;
        activeIndexSV.value = -1;
        hoverIndexSV.value = -1;
        runOnJS(onDragCancel)();
      }
    });

  const style = useAnimatedStyle(() => {
    const dragging = activeIndexSV.value === indexSV.value;
    const ty = dragging ? dragTY.value : shiftY.value;
    return {
      transform: [{ translateY: ty }],
      zIndex: dragging ? 20 : 0,
      elevation: dragging ? 8 : 0,
      shadowOpacity: dragging ? 0.18 : 0,
      shadowRadius: dragging ? 10 : 0,
      shadowOffset: { width: 0, height: dragging ? 4 : 0 },
      shadowColor: "#000",
    };
  });

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

  const heightsSV = useSharedValue(heights);
  const activeIndexSV = useSharedValue(-1);
  const hoverIndexSV = useSharedValue(-1);
  const dragTY = useSharedValue(0);

  useEffect(() => {
    heightsSV.value = heights;
  }, [heights, heightsSV]);

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
      onDragStateChange?.(false);
      if (from === to) return;
      const next = [...data];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    },
    [data, onReorder, onDragStateChange],
  );

  const onDragStart = useCallback(
    (_index: number) => {
      onDragStateChange?.(true);
    },
    [onDragStateChange],
  );

  const onDragCancel = useCallback(() => {
    onDragStateChange?.(false);
  }, [onDragStateChange]);

  return (
    <View style={styles.list}>
      {data.map((item, index) => (
        <Row
          key={keyExtractor ? keyExtractor(item, index) : String(index)}
          item={item}
          index={index}
          enabled={enabled}
          onMeasure={onMeasure}
          heightsSV={heightsSV}
          activeIndexSV={activeIndexSV}
          hoverIndexSV={hoverIndexSV}
          dragTY={dragTY}
          onDragStart={onDragStart}
          onDragEnd={handleReorder}
          onDragCancel={onDragCancel}
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
