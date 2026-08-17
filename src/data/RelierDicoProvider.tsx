import React, { createContext, useContext, useMemo } from "react";
import demoJson from "../../assets/demo/relier-dico-cards.json";
import { MEMBER_RELIER_DICO_ENDPOINT } from "./config";
import {
  type NormalizedRelierData,
  type RelierData,
  normalizeRelierData,
} from "./relier";
import { useAuthAwareJson } from "./useAuthAwareJson";

type RelierDicoState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NormalizedRelierData; source: "demo" | "member" };

type RelierDicoContextValue = RelierDicoState & { reload: () => void };

const RelierDicoContext = createContext<RelierDicoContextValue | null>(null);

/**
 * Anonyme : JSON embarqué. Connecté : Worker relier-dico (JSON ou HTML).
 */
export function RelierDicoProvider({ children }: { children: React.ReactNode }) {
  const remote = useAuthAwareJson<RelierData>(
    "",
    MEMBER_RELIER_DICO_ENDPOINT,
    true,
    demoJson as RelierData,
  );

  const value = useMemo<RelierDicoContextValue>(() => {
    if (remote.status === "ready") {
      return {
        status: "ready",
        data: normalizeRelierData(remote.json),
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
    <RelierDicoContext.Provider value={value}>{children}</RelierDicoContext.Provider>
  );
}

export function useRelierDicoData() {
  const ctx = useContext(RelierDicoContext);
  if (!ctx) throw new Error("useRelierDicoData hors RelierDicoProvider");
  return ctx;
}
