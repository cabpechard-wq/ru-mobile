import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { DEMO_CHRONOLOGIE_ENDPOINT, FULL_CHRONOLOGIE_ENDPOINT } from "./config";
import { type ChronologyData, type Decision } from "./decisions";

type ChronologieState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "idle-full" } // connecté, fonds complet pas encore chargé (poids)
  | { status: "ready"; decisions: Decision[]; source: "demo" | "full" };

type ChronologieContextValue = ChronologieState & {
  loadFull: () => void;
  reload: () => void;
};

const ChronologieContext = createContext<ChronologieContextValue | null>(null);

async function fetchJson(url: string): Promise<ChronologyData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Serveur indisponible (${res.status})`);
  return (await res.json()) as ChronologyData;
}

export function ChronologieProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<ChronologieState>({ status: "loading" });

  const loadDemo = useCallback(() => {
    setState({ status: "loading" });
    fetchJson(DEMO_CHRONOLOGIE_ENDPOINT)
      .then((json) =>
        setState({ status: "ready", decisions: json.decisions || [], source: "demo" })
      )
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : "";
        const message = /failed to fetch|network/i.test(raw)
          ? "Impossible de joindre le serveur."
          : raw || "Une erreur est survenue.";
        setState({ status: "error", message });
      });
  }, []);

  const loadFull = useCallback(() => {
    setState({ status: "loading" });
    fetchJson(FULL_CHRONOLOGIE_ENDPOINT)
      .then((json) =>
        setState({ status: "ready", decisions: json.decisions || [], source: "full" })
      )
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : "";
        const message = /failed to fetch|network/i.test(raw)
          ? "Impossible de joindre le serveur."
          : raw || "Une erreur est survenue.";
        setState({ status: "error", message });
      });
  }, []);

  useEffect(() => {
    if (auth.status === "checking") return;
    if (auth.status === "authenticated") {
      setState({ status: "idle-full" });
    } else {
      loadDemo();
    }
  }, [auth.status, loadDemo]);

  const reload = useCallback(() => {
    if (auth.status === "authenticated") loadFull();
    else loadDemo();
  }, [auth.status, loadFull, loadDemo]);

  return (
    <ChronologieContext.Provider value={{ ...state, loadFull, reload }}>
      {children}
    </ChronologieContext.Provider>
  );
}

export function useChronologieData() {
  const ctx = useContext(ChronologieContext);
  if (!ctx) throw new Error("useChronologieData hors ChronologieProvider");
  return ctx;
}
