import React, { createContext, useContext, useMemo } from "react";
import { type Decision } from "./enchainements";
import { useChronologieData } from "./ChronologieProvider";

type EnchainementsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; decisions: Decision[]; source: "demo" | "member" };

type EnchainementsContextValue = EnchainementsState & { reload: () => void };

const EnchainementsContext = createContext<EnchainementsContextValue | null>(null);

/**
 * Même fonds que la Chronologie (`chronology-decisions.json`). Un second
 * fetch doublait ~3,3 Mo en mode connecté.
 */
export function EnchainementsProvider({ children }: { children: React.ReactNode }) {
  const chrono = useChronologieData();

  const value = useMemo<EnchainementsContextValue>(() => {
    if (chrono.status === "ready") {
      return {
        status: "ready",
        decisions: chrono.decisions,
        source: chrono.source === "full" ? "member" : "demo",
        reload: chrono.reload,
      };
    }
    if (chrono.status === "error") {
      return { status: "error", message: chrono.message, reload: chrono.reload };
    }
    return { status: "loading", reload: chrono.reload };
  }, [chrono]);

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
