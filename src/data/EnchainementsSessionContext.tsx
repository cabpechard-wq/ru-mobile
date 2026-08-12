import React, { createContext, useContext, useMemo, useState } from "react";
import { type Decision } from "./enchainements";

type EnchainementsSession = {
  items: Decision[];
};

type SessionContextValue = {
  session: EnchainementsSession;
  setSession: (session: EnchainementsSession) => void;
};

const EnchainementsSessionContext = createContext<SessionContextValue | null>(null);

export function EnchainementsSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<EnchainementsSession>({ items: [] });
  const value = useMemo(() => ({ session, setSession }), [session]);
  return (
    <EnchainementsSessionContext.Provider value={value}>
      {children}
    </EnchainementsSessionContext.Provider>
  );
}

export function useEnchainementsSession() {
  const ctx = useContext(EnchainementsSessionContext);
  if (!ctx) throw new Error("useEnchainementsSession hors EnchainementsSessionProvider");
  return ctx;
}
