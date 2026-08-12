import React, { createContext, useContext, useMemo, useState } from "react";
import { type RelierItem } from "./relier";

type RelierSession = {
  items: RelierItem[];
};

type RelierSessionContextValue = {
  session: RelierSession;
  setSession: (session: RelierSession) => void;
};

const RelierSessionContext = createContext<RelierSessionContextValue | null>(null);

export function RelierSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<RelierSession>({ items: [] });
  const value = useMemo(() => ({ session, setSession }), [session]);
  return (
    <RelierSessionContext.Provider value={value}>
      {children}
    </RelierSessionContext.Provider>
  );
}

export function useRelierSession() {
  const ctx = useContext(RelierSessionContext);
  if (!ctx) throw new Error("useRelierSession hors RelierSessionProvider");
  return ctx;
}
