import React, { createContext, useContext, useMemo } from "react";
import demoJson from "../../assets/demo/flipcards-dico-cards.json";
import { MEMBER_FLIPCARDS_DICO_ENDPOINT } from "./config";
import {
  type FlipcardsData,
  type NormalizedCardsData,
  normalizeCardsData,
} from "./cards";
import { useAuthAwareJson } from "./useAuthAwareJson";

type FlipcardsDicoState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NormalizedCardsData; source: "demo" | "member" };

type FlipcardsDicoContextValue = FlipcardsDicoState & { reload: () => void };

const FlipcardsDicoContext = createContext<FlipcardsDicoContextValue | null>(null);

/**
 * Anonyme : JSON embarqué (pas de cards.json public). Connecté : Worker
 * flipcards-dico (JSON ou HTML `const DATA`).
 */
export function FlipcardsDicoProvider({ children }: { children: React.ReactNode }) {
  const remote = useAuthAwareJson<FlipcardsData>(
    "",
    MEMBER_FLIPCARDS_DICO_ENDPOINT,
    true,
    demoJson as FlipcardsData,
  );

  const value = useMemo<FlipcardsDicoContextValue>(() => {
    if (remote.status === "ready") {
      return {
        status: "ready",
        data: normalizeCardsData(remote.json),
        source: remote.source,
        reload: remote.reload,
      };
    }
    if (remote.status === "loading") {
      return { status: "loading", reload: remote.reload };
    }
    return { status: "error", message: remote.message, reload: remote.reload };
  }, [remote]);

  return (
    <FlipcardsDicoContext.Provider value={value}>
      {children}
    </FlipcardsDicoContext.Provider>
  );
}

export function useFlipcardsDicoData() {
  const ctx = useContext(FlipcardsDicoContext);
  if (!ctx) throw new Error("useFlipcardsDicoData hors FlipcardsDicoProvider");
  return ctx;
}
