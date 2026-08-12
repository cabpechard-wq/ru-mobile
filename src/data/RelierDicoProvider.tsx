import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import demoJson from "../../assets/demo/relier-dico-cards.json";
import { MEMBER_RELIER_DICO_ENDPOINT } from "./config";
import { useAuth } from "./AuthContext";
import {
  type NormalizedRelierData,
  type RelierData,
  normalizeRelierData,
} from "./relier";

type RelierDicoState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NormalizedRelierData; source: "demo" | "member" };

type RelierDicoContextValue = RelierDicoState & { reload: () => void };

const RelierDicoContext = createContext<RelierDicoContextValue | null>(null);

/**
 * Démo : JSON extrait du HTML du site (pas encore de cards.json sur
 * ru-public). Membre : Worker relier-dico.
 */
export function RelierDicoProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<RelierDicoState>({ status: "loading" });

  const load = useCallback(() => {
    if (auth.status === "checking") return;
    setState({ status: "loading" });

    if (auth.status !== "authenticated") {
      setState({
        status: "ready",
        data: normalizeRelierData(demoJson as RelierData),
        source: "demo",
      });
      return;
    }

    fetch(MEMBER_RELIER_DICO_ENDPOINT, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          auth.logout();
          return;
        }
        if (!res.ok) throw new Error(`Serveur indisponible (${res.status})`);
        const json = (await res.json()) as RelierData;
        setState({
          status: "ready",
          data: normalizeRelierData(json),
          source: "member",
        });
      })
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : "";
        const message = /failed to fetch|network/i.test(raw)
          ? "Impossible de joindre le serveur."
          : raw || "Une erreur est survenue.";
        setState({ status: "error", message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<RelierDicoContextValue>(
    () => ({ ...state, reload: load }),
    [state, load]
  );

  return (
    <RelierDicoContext.Provider value={value}>{children}</RelierDicoContext.Provider>
  );
}

export function useRelierDicoData() {
  const ctx = useContext(RelierDicoContext);
  if (!ctx) throw new Error("useRelierDicoData hors RelierDicoProvider");
  return ctx;
}
