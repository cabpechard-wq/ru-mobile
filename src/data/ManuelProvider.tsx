import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { MANUEL_ENDPOINT, MANUEL_EXERCISES_ENDPOINT } from "./config";
import {
  buildChapterIndex,
  type Chapter,
  type ManuelData,
  type ManuelExercisesData,
} from "./manuel";

type ManuelState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      chapters: Map<string, Chapter>;
      rootIds: string[];
      ficheCount: number;
      exercises: ManuelExercisesData;
    };

type ManuelContextValue = ManuelState & { reload: () => void };

const ManuelContext = createContext<ManuelContextValue | null>(null);

export function ManuelProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ManuelState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    Promise.all([
      fetch(MANUEL_ENDPOINT).then((res) => {
        if (!res.ok) throw new Error(`Serveur indisponible (${res.status})`);
        return res.json() as Promise<ManuelData>;
      }),
      // Best-effort : les liens exercices sont un bonus, pas le cours lui-même.
      fetch(MANUEL_EXERCISES_ENDPOINT)
        .then((res) => (res.ok ? (res.json() as Promise<ManuelExercisesData>) : {}))
        .catch(() => ({}) as ManuelExercisesData),
    ])
      .then(([json, exercises]) =>
        setState({
          status: "ready",
          chapters: buildChapterIndex(json),
          rootIds: json.rootIds || [],
          ficheCount: json.count || json.chapters?.length || 0,
          exercises,
        })
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
    load();
  }, [load]);

  return (
    <ManuelContext.Provider value={{ ...state, reload: load }}>
      {children}
    </ManuelContext.Provider>
  );
}

export function useManuelData() {
  const ctx = useContext(ManuelContext);
  if (!ctx) throw new Error("useManuelData hors ManuelProvider");
  return ctx;
}
