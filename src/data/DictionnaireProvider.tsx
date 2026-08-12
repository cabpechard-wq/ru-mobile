import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DICTIONNAIRE_ENDPOINT } from "./config";
import { type DictEntry, type DictionnaireData } from "./dictionnaire";

type DictionnaireState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: DictEntry[] };

type DictionnaireContextValue = DictionnaireState & { reload: () => void };

const DictionnaireContext = createContext<DictionnaireContextValue | null>(null);

export function DictionnaireProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DictionnaireState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetch(DICTIONNAIRE_ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error(`Serveur indisponible (${res.status})`);
        return res.json() as Promise<DictionnaireData>;
      })
      .then((json) => setState({ status: "ready", entries: json.entries || [] }))
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
    <DictionnaireContext.Provider value={{ ...state, reload: load }}>
      {children}
    </DictionnaireContext.Provider>
  );
}

export function useDictionnaireData() {
  const ctx = useContext(DictionnaireContext);
  if (!ctx) throw new Error("useDictionnaireData hors DictionnaireProvider");
  return ctx;
}
