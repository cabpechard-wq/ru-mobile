import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "../src/data/AuthContext";
import { CardsProvider } from "../src/data/CardsProvider";
import { ChronologieProvider } from "../src/data/ChronologieProvider";
import { DictionnaireProvider } from "../src/data/DictionnaireProvider";
import { EnchainementsProvider } from "../src/data/EnchainementsProvider";
import { EnchainementsSessionProvider } from "../src/data/EnchainementsSessionContext";
import { FlipcardsDicoProvider } from "../src/data/FlipcardsDicoProvider";
import { ManuelProvider } from "../src/data/ManuelProvider";
import { RelierDicoProvider } from "../src/data/RelierDicoProvider";
import { RelierProvider } from "../src/data/RelierProvider";
import { RelierSessionProvider } from "../src/data/RelierSessionContext";
import { StudyProvider } from "../src/data/StudyContext";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <CardsProvider>
          <FlipcardsDicoProvider>
            <RelierProvider>
              <RelierDicoProvider>
                <ChronologieProvider>
                  <EnchainementsProvider>
                    <DictionnaireProvider>
                      <ManuelProvider>
                        <StudyProvider>
                          <RelierSessionProvider>
                            <EnchainementsSessionProvider>
                              <StatusBar style="dark" />
                              <Stack
                                screenOptions={{
                                  headerShown: false,
                                  contentStyle: { backgroundColor: colors.bg },
                                  animation: "slide_from_right",
                                }}
                              />
                            </EnchainementsSessionProvider>
                          </RelierSessionProvider>
                        </StudyProvider>
                      </ManuelProvider>
                    </DictionnaireProvider>
                  </EnchainementsProvider>
                </ChronologieProvider>
              </RelierDicoProvider>
            </RelierProvider>
          </FlipcardsDicoProvider>
        </CardsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
