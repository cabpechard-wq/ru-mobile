import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme/colors";

export function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.text}>Chargement des fiches…</Text>
    </View>
  );
}

export function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Connexion impossible</Text>
      <Text style={styles.text}>{message}</Text>
      <Text style={styles.hint}>Vérifiez votre connexion internet.</Text>
      <Pressable style={styles.btn} onPress={onRetry}>
        <Text style={styles.btnText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
    backgroundColor: colors.bg,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink },
  text: { fontSize: 14, color: colors.muted, textAlign: "center" },
  hint: { fontSize: 13, color: colors.muted, textAlign: "center" },
  btn: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
