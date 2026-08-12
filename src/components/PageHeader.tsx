import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

/**
 * Bandeau commun : icône Accueil + fil d'Ariane à partir de la section choisie.
 * Ex. : Flipcards (Grands arrêts) › Étudier
 */
export function PageHeader({
  trail,
  right,
}: {
  /** Fil d'Ariane, section racine en premier (sans « Accueil »). */
  trail: string[];
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <Pressable
        testID="home-icon"
        onPress={() => router.replace("/")}
        style={styles.homeBtn}
        accessibilityLabel="Accueil"
        hitSlop={8}
      >
        <Text style={styles.homeIcon}>⌂</Text>
      </Pressable>
      <Text style={styles.trail} numberOfLines={2}>
        {trail.filter(Boolean).join(" › ")}
      </Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  homeBtn: {
    width: 36,
    height: 36,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  homeIcon: { fontSize: 18, color: colors.accent, fontWeight: "700" },
  trail: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  right: { maxWidth: "32%" },
});
