import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import demoJson from "../../assets/demo/flipcards-dico-cards.json";
import { MEMBER_FLIPCARDS_DICO_ENDPOINT } from "./config";
import {
  type FlipcardsData,
  type NormalizedCardsData,
  normalizeCardsData,
} from "./cards";
import { useAuth } from "./AuthContext";

type FlipcardsDicoState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NormalizedCardsData; source: "demo" | "member" };

type FlipcardsDicoContextValue = FlipcardsDicoState & { reload: () => void };

const FlipcardsDicoContext = createContext<FlipcardsDicoContextValue | null>(null);

/**
 * Démo : JSON extrait du HTML du site (pas encore publié en cards.json sur
 * ru-public) — embarqué temporairement. Membre : Worker flipcards-dico.
 */
export function FlipcardsDicoProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<FlipcardsDicoState>({ status: "loading" });

  const load = useCallback(() => {
    if (auth.status === "checking") return;
    setState({ status: "loading" });

    if (auth.status !== "authenticated") {
      setState({
        status: "ready",
        data: normalizeCardsData(demoJson as FlipcardsData),
        source: "demo",
      });
      return;
    }

    fetch(MEMBER_FLIPCARDS_DICO_ENDPOINT, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          auth.logout();
          return;
        }
        if (!res.ok) throw new Error(`Serveur indisponible (${res.status})`);
        const json = (await res.json()) as FlipcardsData;
        setState({
          status: "ready",
          data: normalizeCardsData(json),
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

  const value = useMemo<FlipcardsDicoContextValue>(
    () => ({ ...state, reload: load }),
    [state, load]
  );

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
