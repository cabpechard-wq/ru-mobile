import React, { createContext, useContext, useMemo } from "react";
import demoJson from "../../assets/demo/relier-cards.json";
import { DEMO_RELIER_ENDPOINT, MEMBER_RELIER_ENDPOINT } from "./config";
import {
  type NormalizedRelierData,
  type RelierData,
  normalizeRelierData,
} from "./relier";
import { useAuthAwareJson } from "./useAuthAwareJson";

type RelierState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NormalizedRelierData; source: "demo" | "member" };

type RelierContextValue = RelierState & { reload: () => void };

const RelierContext = createContext<RelierContextValue | null>(null);

export function RelierProvider({ children }: { children: React.ReactNode }) {
  const remote = useAuthAwareJson<RelierData>(
    DEMO_RELIER_ENDPOINT,
    MEMBER_RELIER_ENDPOINT,
    true,
    demoJson as RelierData,
  );

  const value = useMemo<RelierContextValue>(() => {
    if (remote.status === "ready") {
      return {
        status: "ready",
        data: normalizeRelierData(remote.json),
        source: remote.source,
        reload: remote.reload,
      };
    }
    return { ...remote, reload: remote.reload };
  }, [remote]);

  return (
    <RelierContext.Provider value={value}>{children}</RelierContext.Provider>
  );
}

export function useRelierData() {
  const ctx = useContext(RelierContext);
  if (!ctx) throw new Error("useRelierData hors RelierProvider");
  return ctx;
}
