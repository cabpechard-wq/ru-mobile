import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DICTIONNAIRE_ENDPOINT } from "./config";
import { type DictEntry, type DictionnaireData } from "./dictionnaire";
import { fetchJsonCached, peekJsonCache } from "./jsonCache";

type DictionnaireState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: DictEntry[] };

type DictionnaireContextValue = DictionnaireState & { reload: () => void };

const DictionnaireContext = createContext<DictionnaireContextValue | null>(null);

function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  return /failed to fetch|network/i.test(raw)
    ? "Impossible de joindre le serveur."
    : raw || "Une erreur est survenue.";
}

export function DictionnaireProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DictionnaireState>({ status: "loading" });
  const readyRef = useRef(false);
  const genRef = useRef(0);

  const load = useCallback(async (force: boolean) => {
    const gen = ++genRef.current;
    if (!force) {
      const cached = await peekJsonCache<DictionnaireData>(DICTIONNAIRE_ENDPOINT);
      if (gen !== genRef.current) return;
      if (cached?.entries) {
        readyRef.current = true;
        setState({ status: "ready", entries: cached.entries });
      } else if (!readyRef.current) {
        setState({ status: "loading" });
      }
    } else {
      setState({ status: "loading" });
    }

    try {
      const json = await fetchJsonCached<DictionnaireData>(DICTIONNAIRE_ENDPOINT, {
        force,
      });
      if (gen !== genRef.current) return;
      readyRef.current = true;
      setState({ status: "ready", entries: json.entries || [] });
    } catch (err: unknown) {
      if (gen !== genRef.current) return;
      if (readyRef.current) return;
      setState({ status: "error", message: errorMessage(err) });
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <DictionnaireContext.Provider value={{ ...state, reload: () => void load(true) }}>
      {children}
    </DictionnaireContext.Provider>
  );
}

export function useDictionnaireData() {
  const ctx = useContext(DictionnaireContext);
  if (!ctx) throw new Error("useDictionnaireData hors DictionnaireProvider");
  return ctx;
}
