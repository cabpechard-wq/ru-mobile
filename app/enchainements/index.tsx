import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorScreen, LoadingScreen } from "../../src/components/DataStatus";
import { useEnchainementsData } from "../../src/data/EnchainementsProvider";
import { useEnchainementsSession } from "../../src/data/EnchainementsSessionContext";
import { displayNom, pickRandomChain, shuffledOrder, type Decision } from "../../src/data/enchainements";
import { colors } from "../../src/theme/colors";

export default function EnchainementsSetupScreen() {
  const router = useRouter();
  const state = useEnchainementsData();
  const { setSession } = useEnchainementsSession();
  const [draw, setDraw] = useState<Decision[] | null>(null);
  const [empty, setEmpty] = useState(false);

  const tirer = (decisions: Decision[]) => {
    const chain = pickRandomChain(decisions);
    setEmpty(!chain);
    setDraw(chain);
  };

  const start = () => {
    if (!draw) return;
    setSession({ items: shuffledOrder(draw) });
    router.push("/enchainements/session");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {state.status === "loading" ? <LoadingScreen /> : null}
      {state.status === "error" ? (
        <ErrorScreen message={state.message} onRetry={state.reload} />
      ) : null}
      {state.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Accueil</Text>
          </Pressable>
          <Text style={styles.title}>Enchaînements logiques</Text>
          <Text style={styles.sub}>
            Remettez un enchaînement de décisions liées dans l'ordre
            chronologique — dates cachées.
            {state.source === "demo" ? " (démo)" : ""}
          </Text>

          <View style={styles.card}>
            <Pressable
              testID="draw-chain"
              style={styles.btnOutline}
              onPress={() => tirer(state.decisions)}
            >
              <Text style={styles.btnOutlineText}>Tirer un enchaînement</Text>
            </Pressable>

            {empty ? (
              <Text style={styles.hint}>
                Aucun enchaînement disponible dans ce jeu de données.
              </Text>
            ) : null}

            {draw ? (
              <View style={styles.preview}>
                <Text style={styles.previewTitle}>
                  {draw.length} décisions liées :
                </Text>
                {draw.map((d) => (
                  <Text key={d.id} style={styles.previewItem}>
                    • {displayNom(d.nom, false)}
                  </Text>
                ))}
                <Pressable testID="start-session" style={styles.btn} onPress={start}>
                  <Text style={styles.btnText}>Commencer</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  back: { paddingBottom: 12 },
  backText: { color: colors.accent, fontWeight: "600" },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.title,
    marginBottom: 6,
    fontFamily: "serif",
  },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  btnOutline: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnOutlineText: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  hint: { color: colors.muted, fontSize: 13 },
  preview: { marginTop: 8, gap: 6 },
  previewTitle: { fontWeight: "700", color: colors.ink },
  previewItem: { color: colors.muted, fontSize: 13 },
  btn: {
    marginTop: 10,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
