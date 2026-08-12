import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { AuthProvider } from "../src/data/AuthContext";
import { CardsProvider } from "../src/data/CardsProvider";
import { RelierProvider } from "../src/data/RelierProvider";
import { RelierSessionProvider } from "../src/data/RelierSessionContext";
import { StudyProvider } from "../src/data/StudyContext";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  return (
    <AuthProvider>
      <CardsProvider>
        <RelierProvider>
          <StudyProvider>
            <RelierSessionProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: "slide_from_right",
                }}
              />
            </RelierSessionProvider>
          </StudyProvider>
        </RelierProvider>
      </CardsProvider>
    </AuthProvider>
  );
}
