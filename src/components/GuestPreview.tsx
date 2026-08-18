import * as Linking from "expo-linking";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../data/AuthContext";
import { ACCOUNT_URL, CHECKOUT_URL, FORGOT_PASSWORD_URL } from "../data/config";
import { colors } from "../theme/colors";

/** ~5 lignes, comme `.manuel-prose.is-preview` (8.2em) sur le site. */
const PREVIEW_MAX_HEIGHT = 132;

export function openInscriptions(): void {
  Linking.openURL(CHECKOUT_URL);
}

export function openForgotPassword(): void {
  Linking.openURL(FORGOT_PASSWORD_URL);
}

export function openAccount(): void {
  Linking.openURL(ACCOUNT_URL);
}

/**
 * Tronque le corps (cours / fiche) hors session. La capsule renvoie vers
 * Inscriptions (`/checkout/`), pas vers la page de connexion.
 */
export function GuestPreview({
  children,
  testID = "lire-la-suite",
}: {
  children: React.ReactNode;
  testID?: string;
}) {
  const auth = useAuth();
  if (auth.status === "authenticated") {
    return <>{children}</>;
  }

  return (
    <View>
      <View style={styles.clip}>
        {children}
        <View pointerEvents="none" style={styles.fade} />
      </View>
      <Pressable
        testID={testID}
        onPress={openInscriptions}
        style={styles.cta}
        accessibilityRole="link"
        accessibilityLabel="Lire la suite — Inscriptions"
      >
        <Text style={styles.ctaText}>Lire la suite</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    maxHeight: PREVIEW_MAX_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: colors.bg,
    opacity: 0.88,
  },
  cta: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  ctaText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
});
