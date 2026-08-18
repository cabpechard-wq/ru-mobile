import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useCardsData } from "./CardsProvider";
import {
  DEMO_CHRONOLOGIE_ENDPOINT,
  FULL_CHRONOLOGIE_ENDPOINT,
} from "./config";
import {
  applyConsiderantsToDecisions,
  loadConsiderantIndex,
} from "./considerant";
import { type ChronologyData, type Decision } from "./decisions";
import type { Card } from "./cards";

type ChronologieState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; decisions: Decision[]; source: "demo" | "full" };

type ChronologieContextValue = ChronologieState & {
  loadFull: () => void;
  reload: () => void;
  rememberConsiderant: (key: string, text: string) => void;
};

const ChronologieContext = createContext<ChronologieContextValue | null>(null);

async function fetchJson(url: string): Promise<ChronologyData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Serveur indisponible (${res.status})`);
  return (await res.json()) as ChronologyData;
}

function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  return /failed to fetch|network/i.test(raw)
    ? "Impossible de joindre le serveur."
    : raw || "Une erreur est survenue.";
}

function hydrate(
  raw: Decision[],
  source: "demo" | "full",
  bySlug: Record<string, string>,
  remembered: Record<string, string>,
  cards: Card[] | undefined,
): Extract<ChronologieState, { status: "ready" }> {
  return {
    status: "ready",
    source,
    decisions: applyConsiderantsToDecisions(raw, bySlug, cards, remembered),
  };
}

export function ChronologieProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const cards = useCardsData();
  const [state, setState] = useState<ChronologieState>({ status: "loading" });

  const rawRef = useRef<Decision[]>([]);
  const sourceRef = useRef<"demo" | "full">("demo");
  const indexRef = useRef<Record<string, string>>({});
  const rememberedRef = useRef<Record<string, string>>({});

  const cardList = cards.status === "ready" ? cards.data.allCards : undefined;
  const cardsRef = useRef<Card[] | undefined>(undefined);
  cardsRef.current = cardList;

  const loadDemo = useCallback(() => {
    setState({ status: "loading" });
    Promise.all([fetchJson(DEMO_CHRONOLOGIE_ENDPOINT), loadConsiderantIndex()])
      .then(([json, index]) => {
        indexRef.current = index;
        rawRef.current = json.decisions || [];
        sourceRef.current = "demo";
        setState(
          hydrate(
            rawRef.current,
            "demo",
            index,
            rememberedRef.current,
            cardsRef.current,
          ),
        );
      })
      .catch((err: unknown) => {
        setState({ status: "error", message: errorMessage(err) });
      });
  }, []);

  const loadFull = useCallback(() => {
    setState({ status: "loading" });
    Promise.all([fetchJson(FULL_CHRONOLOGIE_ENDPOINT), loadConsiderantIndex()])
      .then(([json, index]) => {
        indexRef.current = index;
        rawRef.current = json.decisions || [];
        sourceRef.current = "full";
        setState(
          hydrate(
            rawRef.current,
            "full",
            index,
            rememberedRef.current,
            cardsRef.current,
          ),
        );
      })
      .catch((err: unknown) => {
        setState({ status: "error", message: errorMessage(err) });
      });
  }, []);

  useEffect(() => {
    if (auth.status === "checking") return;
    if (auth.status === "authenticated") {
      loadFull();
    } else {
      loadDemo();
    }
  }, [auth.status, loadDemo, loadFull]);

  useEffect(() => {
    if (!rawRef.current.length) return;
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return hydrate(
        rawRef.current,
        sourceRef.current,
        indexRef.current,
        rememberedRef.current,
        cardList,
      );
    });
  }, [cardList]);

  const reload = useCallback(() => {
    if (auth.status === "authenticated") loadFull();
    else loadDemo();
  }, [auth.status, loadFull, loadDemo]);

  const rememberConsiderant = useCallback((key: string, text: string) => {
    const trimmed = (text || "").trim();
    if (!key || !trimmed) return;
    rememberedRef.current = { ...rememberedRef.current, [key]: trimmed };
    if (!rawRef.current.length) return;
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return hydrate(
        rawRef.current,
        sourceRef.current,
        indexRef.current,
        rememberedRef.current,
        cardsRef.current,
      );
    });
  }, []);

  return (
    <ChronologieContext.Provider
      value={{ ...state, loadFull, reload, rememberConsiderant }}
    >
      {children}
    </ChronologieContext.Provider>
  );
}

export function useChronologieData() {
  const ctx = useContext(ChronologieContext);
  if (!ctx) throw new Error("useChronologieData hors ChronologieProvider");
  return ctx;
}
