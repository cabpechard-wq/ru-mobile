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
  refreshConsiderantIndex,
} from "./considerant";
import { type ChronologyData, type Decision } from "./decisions";
import type { Card } from "./cards";
import { fetchJsonCached, peekJsonCache } from "./jsonCache";

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
  const indexRef = useRef<Record<string, string>>(loadConsiderantIndex());
  const rememberedRef = useRef<Record<string, string>>({});
  const genRef = useRef(0);

  const cardList = cards.status === "ready" ? cards.data.allCards : undefined;
  const cardsRef = useRef<Card[] | undefined>(undefined);
  cardsRef.current = cardList;

  const applyReady = useCallback(() => {
    if (!rawRef.current.length) return;
    setState(
      hydrate(
        rawRef.current,
        sourceRef.current,
        indexRef.current,
        rememberedRef.current,
        cardsRef.current,
      ),
    );
  }, []);

  const load = useCallback(
    async (url: string, source: "demo" | "full", force: boolean) => {
      const gen = ++genRef.current;
      indexRef.current = { ...loadConsiderantIndex(), ...indexRef.current };

      if (!force) {
        const cached = await peekJsonCache<ChronologyData>(url);
        if (gen !== genRef.current) return;
        if (cached?.decisions?.length) {
          rawRef.current = cached.decisions;
          sourceRef.current = source;
          applyReady();
        } else if (!rawRef.current.length) {
          setState({ status: "loading" });
        }
      } else {
        setState({ status: "loading" });
      }

      try {
        const json = await fetchJsonCached<ChronologyData>(url, { force });
        if (gen !== genRef.current) return;
        rawRef.current = json.decisions || [];
        sourceRef.current = source;
        applyReady();
      } catch (err: unknown) {
        if (gen !== genRef.current) return;
        if (rawRef.current.length) {
          applyReady();
          return;
        }
        setState({ status: "error", message: errorMessage(err) });
        return;
      }

      refreshConsiderantIndex().then((index) => {
        if (gen !== genRef.current) return;
        indexRef.current = index;
        applyReady();
      });
    },
    [applyReady],
  );

  const loadDemo = useCallback(
    () => load(DEMO_CHRONOLOGIE_ENDPOINT, "demo", false),
    [load],
  );
  const loadFull = useCallback(
    () => load(FULL_CHRONOLOGIE_ENDPOINT, "full", false),
    [load],
  );

  useEffect(() => {
    if (auth.status === "checking") return;
    if (auth.status === "authenticated") {
      void loadFull();
    } else {
      void loadDemo();
    }
  }, [auth.status, loadDemo, loadFull]);

  useEffect(() => {
    if (!rawRef.current.length) return;
    applyReady();
  }, [cardList, applyReady]);

  const reload = useCallback(() => {
    const url =
      auth.status === "authenticated"
        ? FULL_CHRONOLOGIE_ENDPOINT
        : DEMO_CHRONOLOGIE_ENDPOINT;
    const source = auth.status === "authenticated" ? "full" : "demo";
    void load(url, source, true);
  }, [auth.status, load]);

  const rememberConsiderant = useCallback(
    (key: string, text: string) => {
      const trimmed = (text || "").trim();
      if (!key || !trimmed) return;
      rememberedRef.current = { ...rememberedRef.current, [key]: trimmed };
      applyReady();
    },
    [applyReady],
  );

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
