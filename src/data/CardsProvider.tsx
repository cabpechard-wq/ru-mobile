import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CARDS_ENDPOINT } from "./config";
import {
  type FlipcardsData,
  type NormalizedCardsData,
  normalizeCardsData,
} from "./cards";

type CardsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: NormalizedCardsData };

type CardsContextValue = CardsState & { reload: () => void };

const CardsContext = createContext<CardsContextValue | null>(null);

async function fetchCards(): Promise<NormalizedCardsData> {
  const res = await fetch(CARDS_ENDPOINT);
  if (!res.ok) {
    throw new Error(`Serveur indisponible (${res.status})`);
  }
  const json = (await res.json()) as FlipcardsData;
  return normalizeCardsData(json);
}

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CardsState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchCards()
      .then((data) => setState({ status: "ready", data }))
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : "";
        const message = /failed to fetch|network/i.test(raw)
          ? "Impossible de joindre le serveur."
          : raw || "Une erreur est survenue.";
        setState({ status: "error", message });
      });
  }, []);

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
