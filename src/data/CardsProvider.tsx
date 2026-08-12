import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { DEMO_CARDS_ENDPOINT, MEMBER_CARDS_ENDPOINT } from "./config";
import {
  type FlipcardsData,
  type NormalizedCardsData,
  normalizeCardsData,
} from "./cards";

type CardsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NormalizedCardsData; source: "demo" | "member" };

type CardsContextValue = CardsState & { reload: () => void };

const CardsContext = createContext<CardsContextValue | null>(null);

async function fetchJson(url: string, token?: string): Promise<FlipcardsData> {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401) {
    const err = new Error("Session expirée.");
    (err as Error & { code?: string }).code = "unauthorized";
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Serveur indisponible (${res.status})`);
  }
  return (await res.json()) as FlipcardsData;
}

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<CardsState>({ status: "loading" });

  const load = useCallback(() => {
    if (auth.status === "checking") return;
    setState({ status: "loading" });

    const isMember = auth.status === "authenticated";
    const url = isMember ? MEMBER_CARDS_ENDPOINT : DEMO_CARDS_ENDPOINT;
    const token = isMember ? auth.token : undefined;

    fetchJson(url, token)
      .then((json) =>
        setState({
          status: "ready",
          data: normalizeCardsData(json),
          source: isMember ? "member" : "demo",
        })
      )
      .catch((err: unknown) => {
        if (
          isMember &&
          err instanceof Error &&
          (err as Error & { code?: string }).code === "unauthorized"
        ) {
          // Session expirée côté Worker : on retombe sur la démo.
          auth.logout();
          return;
        }
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

  return (
    <CardsContext.Provider value={{ ...state, reload: load }}>
      {children}
    </CardsContext.Provider>
  );
}

export function useCardsData() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCardsData hors CardsProvider");
  return ctx;
}
