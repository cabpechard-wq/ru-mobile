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
          await auth.logout();
          return;
        }
        const text = await res.text();
        const trimmed = (text || "").trim();
        if (!res.ok) {
          throw new Error(`Serveur indisponible (${res.status})`);
        }
        if (trimmed.startsWith("<")) {
          throw new Error("Réponse HTML inattendue.");
        }
        const json = JSON.parse(trimmed) as RelierData;
        setState({
          status: "ready",
          data: normalizeRelierData(json),
          source: "member",
        });
      })
      .catch(() => {
        setState({
          status: "ready",
          data: normalizeRelierData(demoJson as RelierData),
          source: "demo",
        });
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
