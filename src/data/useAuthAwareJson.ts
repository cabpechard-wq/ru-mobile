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
  const text = await res.text();
  const trimmed = (text || "").trim();

  if (!res.ok) {
    // Parfois un reverse-proxy renvoie une page HTML d'erreur.
    if (trimmed.startsWith("<")) {
      throw new Error(`Serveur indisponible (${res.status}, page HTML).`);
    }
    try {
      const body = JSON.parse(trimmed) as { error?: string };
      throw new Error(body.error || `Serveur indisponible (${res.status})`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Serveur")) throw e;
      throw new Error(`Serveur indisponible (${res.status})`);
    }
  }

  if (!trimmed) throw new Error("Réponse vide du serveur.");
  if (trimmed.startsWith("<")) {
    throw new Error(
      "Réponse HTML au lieu de JSON (réseau / pare-feu / session).",
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error("Réponse JSON invalide.");
  }
}

/**
 * Fetch JSON générique, membre si connecté sinon démo publique.
 * Retombe sur la démo si la session a expiré (401).
 *
 * `requiresAuthHeader` : false pour un JSON statique public (pas de
 * vérification serveur, pas besoin de Bearer — évite un preflight CORS
 * inutile). true (défaut) pour un endpoint Worker qui vérifie la session.
 *
 * `fallback` : JSON embarqué utilisé le réseau échoue (mode démo fiable).
 */
export function useAuthAwareJson<T>(
  demoUrl: string,
  memberUrl: string,
  requiresAuthHeader = true,
  fallback?: T,
): RemoteJsonState<T> & { reload: () => void } {
  const auth = useAuth();
  const [state, setState] = useState<RemoteJsonState<T>>({ status: "loading" });

  const load = useCallback(() => {
    if (auth.status === "checking") return;
    setState({ status: "loading" });

    const isMember = auth.status === "authenticated";
    const url = isMember ? memberUrl : demoUrl;
    const token = isMember && requiresAuthHeader ? auth.token : undefined;

    fetchJson<T>(url, token)
      .then((json) =>
        setState({
          status: "ready",
          json,
          source: isMember ? "member" : "demo",
        }),
      )
      .catch((err: unknown) => {
        if (
          isMember &&
          err instanceof Error &&
          (err as Error & { code?: string }).code === "unauthorized"
        ) {
          auth.logout();
          return;
        }
        // Réseau / HTML / parse : bascule sur le JSON embarqué si dispo.
        if (fallback != null) {
          setState({ status: "ready", json: fallback, source: "demo" });
          return;
        }
        const raw = err instanceof Error ? err.message : "";
        const message = /failed to fetch|network/i.test(raw)
          ? "Impossible de joindre le serveur."
          : raw || "Une erreur est survenue.";
        setState({ status: "error", message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, demoUrl, memberUrl, requiresAuthHeader, fallback]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
