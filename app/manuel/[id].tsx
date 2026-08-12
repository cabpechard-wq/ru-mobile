import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ManuelChapterView } from "../../src/components/ManuelChapterView";
import { colors } from "../../src/theme/colors";

export default function ManuelChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ManuelChapterView chapterId={id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
});
