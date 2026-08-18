import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { homeAccessLabel, type HomeAccess } from "../src/data/accessLabels";
import { useAuth } from "../src/data/AuthContext";
import { openInscriptions } from "../src/components/GuestPreview";
import { colors } from "../src/theme/colors";

type Entry = { label: string; href: string; access: HomeAccess };
type Hub = { title: string; entries: Entry[] };
type Rubrique = {
  title: string;
  entries?: Entry[];
  hubs?: Hub[];
};

/**
 * Accueil = même structure que le site :
 * 3 rubriques, 2 hubs (Flipcards / Relations), 9 sections.
 */
const RUBRIQUES: Rubrique[] = [
  {
    title: "Cours magistral",
    entries: [
      { label: "Cours de Droit public et administratif", href: "/manuel", access: "preview" },
      { label: "Chronologie", href: "/chronologie", access: "demo" },
    ],
  },
  {
    title: "Bibliothèque universitaire",
    entries: [
      { label: "Dictionnaire", href: "/dictionnaire", access: "public" },
      { label: "Fiches d'arrêts", href: "/arrets", access: "preview" },
    ],
  },
  {
    title: "Salle de TD",
    hubs: [
      {
        title: "Flipcards",
        entries: [
          { label: "Grands arrêts", href: "/flipcards", access: "demo" },
          { label: "Grandes notions", href: "/flipcards/notions", access: "demo" },
        ],
      },
      {
        title: "Relations",
        entries: [
          { label: "Grands arrêts", href: "/relier", access: "demo" },
          { label: "Grandes notions", href: "/relier/notions", access: "demo" },
        ],
      },
    ],
    entries: [
      { label: "Enchaînements (chrono)logiques", href: "/enchainements", access: "demo" },
    ],
  },
];

function EntryLink({
  entry,
  isMember,
}: {
  entry: Entry;
  isMember: boolean;
}) {
  const router = useRouter();
  const access = homeAccessLabel(entry.access, isMember);
  return (
    <Pressable
      testID={`home-entry-${entry.href}`}
      onPress={() => router.push(entry.href as never)}
      style={styles.entry}
    >
      <View style={styles.entryBody}>
        <Text style={styles.entryText}>{entry.label}</Text>
        <Text
          style={[
            styles.entryAccess,
            entry.access === "public" && styles.entryAccessPublic,
          ]}
        >
          {access}
        </Text>
      </View>
    </Pressable>
  );
}

function AccountBar() {
  const router = useRouter();
  const auth = useAuth();

  if (auth.status === "authenticated") {
    return (
      <View style={styles.accountBar}>
        <Text style={styles.accountText} numberOfLines={1}>
          Connecté · {auth.email}
        </Text>
        <Pressable testID="logout-link" onPress={() => auth.logout()}>
          <Text style={styles.accountAction}>Déconnexion</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.accountBar}>
      <Text style={styles.accountText}>Mode démo</Text>
      <View style={styles.accountActions}>
        <Pressable testID="signup-link" onPress={openInscriptions}>
          <Text style={styles.accountAction}>S’inscrire</Text>
        </Pressable>
        <Pressable testID="login-link" onPress={() => router.push("/login")}>
          <Text style={styles.accountAction}>Connexion</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const auth = useAuth();
  const isMember = auth.status === "authenticated";
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AccountBar />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.brandPrimary}>Les Ressources</Text>
        <Text style={styles.brandSecondary}>Universitaires</Text>
        <Text style={styles.lead}>
          Cours, entraînements et fonds documentaires — droit public et
          administratif.
        </Text>

        {RUBRIQUES.map((rubrique) => (
          <View key={rubrique.title} style={styles.rubrique}>
            <Text style={styles.rubriqueTitle}>{rubrique.title}</Text>

            {rubrique.hubs?.map((hub) => (
              <View key={hub.title} style={styles.hub}>
                <Text style={styles.hubTitle}>{hub.title}</Text>
                <View style={styles.entryList}>
                  {hub.entries.map((e) => (
                    <EntryLink
                      key={`${hub.title}-${e.href}`}
                      entry={e}
                      isMember={isMember}
                    />
                  ))}
                </View>
              </View>
            ))}

            {rubrique.entries?.length ? (
              <View style={styles.entryList}>
                {rubrique.entries.map((e) => (
                  <EntryLink key={e.href} entry={e} isMember={isMember} />
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  accountBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  accountText: { color: colors.muted, fontSize: 12, fontWeight: "600", flex: 1, paddingRight: 8 },
  accountActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  accountAction: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  scroll: { padding: 16, paddingBottom: 48 },
  brandPrimary: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
    color: colors.title,
    letterSpacing: -0.4,
  },
  brandSecondary: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "600",
    color: colors.brass,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 520,
  },
  rubrique: { marginBottom: 28 },
  rubriqueTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 10,
  },
  hub: { marginBottom: 12 },
  hubTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: colors.title,
    marginBottom: 6,
  },
  entryList: { gap: 6 },
  entry: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  entryBody: { gap: 3 },
  entryText: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 14,
  },
  entryAccess: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  entryAccessPublic: { color: colors.accent },
});
