import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "../src/components/PageHeader";
import { useAuth } from "../src/data/AuthContext";
import { SECTION } from "../src/data/sections";
import { colors } from "../src/theme/colors";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const res = await login(email.trim(), password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PageHeader trail={[SECTION.login]} />
      <View style={styles.wrap}>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.sub}>
          Même compte que sur le site — accédez à l'intégralité des fiches.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="vous@exemple.fr"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          testID="login-submit"
          onPress={submit}
          disabled={busy || !email.trim() || !password}
          style={[
            styles.btn,
            (busy || !email.trim() || !password) && styles.btnDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Se connecter</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 20, gap: 4, maxWidth: 420, width: "100%", alignSelf: "center" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.title,
    fontFamily: "serif",
    marginBottom: 4,
  },
  sub: { color: colors.muted, fontSize: 14, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    marginBottom: 12,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: colors.radius,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
