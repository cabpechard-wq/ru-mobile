import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { MANUEL_ENDPOINT, MANUEL_EXERCISES_ENDPOINT } from "./config";
import {
  buildChapterIndex,
  type Chapter,
  type ManuelData,
  type ManuelExercisesData,
} from "./manuel";
import { fetchJsonCached, peekJsonCache } from "./jsonCache";

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

function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  return /failed to fetch|network/i.test(raw)
    ? "Impossible de joindre le serveur."
    : raw || "Une erreur est survenue.";
}

function readyFrom(
  json: ManuelData,
  exercises: ManuelExercisesData,
): Extract<ManuelState, { status: "ready" }> {
  return {
    status: "ready",
    chapters: buildChapterIndex(json),
    rootIds: json.rootIds || [],
    ficheCount: json.count || json.chapters?.length || 0,
    exercises,
  };
}

export function ManuelProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ManuelState>({ status: "loading" });
  const readyRef = useRef(false);
  const genRef = useRef(0);

  const load = useCallback(async (force: boolean) => {
    const gen = ++genRef.current;
    if (!force) {
      const [cachedChapters, cachedExercises] = await Promise.all([
        peekJsonCache<ManuelData>(MANUEL_ENDPOINT),
        peekJsonCache<ManuelExercisesData>(MANUEL_EXERCISES_ENDPOINT),
      ]);
      if (gen !== genRef.current) return;
      if (cachedChapters?.chapters) {
        readyRef.current = true;
        setState(readyFrom(cachedChapters, cachedExercises || {}));
      } else if (!readyRef.current) {
        setState({ status: "loading" });
      }
    } else {
      setState({ status: "loading" });
    }

    try {
      const [json, exercises] = await Promise.all([
        fetchJsonCached<ManuelData>(MANUEL_ENDPOINT, { force }),
        fetchJsonCached<ManuelExercisesData>(MANUEL_EXERCISES_ENDPOINT, {
          force,
        }).catch(() => ({}) as ManuelExercisesData),
      ]);
      if (gen !== genRef.current) return;
      readyRef.current = true;
      setState(readyFrom(json, exercises));
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
    <ManuelContext.Provider value={{ ...state, reload: () => void load(true) }}>
      {children}
    </ManuelContext.Provider>
  );
}

export function useManuelData() {
  const ctx = useContext(ManuelContext);
  if (!ctx) throw new Error("useManuelData hors ManuelProvider");
  return ctx;
}
