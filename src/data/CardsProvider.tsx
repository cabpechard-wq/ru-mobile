import React, { createContext, useContext, useMemo } from "react";
import { DEMO_CARDS_ENDPOINT, MEMBER_CARDS_ENDPOINT } from "./config";
import { type FlipcardsData, type NormalizedCardsData, normalizeCardsData } from "./cards";
import { useAuthAwareJson } from "./useAuthAwareJson";

type CardsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NormalizedCardsData; source: "demo" | "member" };

type CardsContextValue = CardsState & { reload: () => void };

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const remote = useAuthAwareJson<FlipcardsData>(
    DEMO_CARDS_ENDPOINT,
    MEMBER_CARDS_ENDPOINT
  );

  const value = useMemo<CardsContextValue>(() => {
    if (remote.status === "ready") {
      return {
        status: "ready",
        data: normalizeCardsData(remote.json),
        source: remote.source,
        reload: remote.reload,
      };
    }
    return { ...remote, reload: remote.reload };
  }, [remote]);

  return (
    <CardsContext.Provider value={value}>{children}</CardsContext.Provider>
  );
}

export function useCardsData() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCardsData hors CardsProvider");
  return ctx;
}
