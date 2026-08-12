import React, { createContext, useContext, useMemo } from "react";
import { type ChronologyData, type Decision } from "./enchainements";
import { DEMO_ENCHAINEMENTS_ENDPOINT, MEMBER_ENCHAINEMENTS_ENDPOINT } from "./config";
import { useAuthAwareJson } from "./useAuthAwareJson";

type EnchainementsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; decisions: Decision[]; source: "demo" | "member" };

type EnchainementsContextValue = EnchainementsState & { reload: () => void };

const EnchainementsContext = createContext<EnchainementsContextValue | null>(null);

export function EnchainementsProvider({ children }: { children: React.ReactNode }) {
  const remote = useAuthAwareJson<ChronologyData>(
    DEMO_ENCHAINEMENTS_ENDPOINT,
    MEMBER_ENCHAINEMENTS_ENDPOINT,
    false // JSON statique public, pas un endpoint Worker : pas de Bearer
  );

  const value = useMemo<EnchainementsContextValue>(() => {
    if (remote.status === "ready") {
      return {
        status: "ready",
        decisions: remote.json.decisions || [],
        source: remote.source,
        reload: remote.reload,
      };
    }
    return { ...remote, reload: remote.reload };
  }, [remote]);

  return (
    <EnchainementsContext.Provider value={value}>
      {children}
    </EnchainementsContext.Provider>
  );
}

export function useEnchainementsData() {
  const ctx = useContext(EnchainementsContext);
  if (!ctx) throw new Error("useEnchainementsData hors EnchainementsProvider");
  return ctx;
}
