import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export type RemoteJsonState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; json: T; source: "demo" | "member" };

async function fetchJson<T>(url: string, token?: string): Promise<T> {
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
  return (await res.json()) as T;
}

/**
 * Fetch JSON générique, membre si connecté (Bearer) sinon démo publique.
 * Retombe sur la démo si la session a expiré (401).
 */
export function useAuthAwareJson<T>(
  demoUrl: string,
  memberUrl: string
): RemoteJsonState<T> & { reload: () => void } {
  const auth = useAuth();
  const [state, setState] = useState<RemoteJsonState<T>>({ status: "loading" });

  const load = useCallback(() => {
    if (auth.status === "checking") return;
    setState({ status: "loading" });

    const isMember = auth.status === "authenticated";
    const url = isMember ? memberUrl : demoUrl;
    const token = isMember ? auth.token : undefined;

    fetchJson<T>(url, token)
      .then((json) => setState({ status: "ready", json, source: isMember ? "member" : "demo" }))
      .catch((err: unknown) => {
        if (
          isMember &&
          err instanceof Error &&
          (err as Error & { code?: string }).code === "unauthorized"
        ) {
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
  }, [auth.status, demoUrl, memberUrl]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
