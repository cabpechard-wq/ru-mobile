import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { parseWorkerPayload } from "./memberPack";

export type RemoteJsonState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; json: T; source: "demo" | "member" };

function memberUrls(url: string): string[] {
  const out = [url];
  if (url.includes("?format=json")) {
    out.push(url.replace(/\?format=json$/, ""));
  }
  return out;
}

async function fetchJson<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(url, {
    headers: token
      ? { Authorization: `Bearer ${token}`, Accept: "application/json" }
      : { Accept: "application/json" },
  });
  if (res.status === 401) {
    const err = new Error("Session expirée.");
    (err as Error & { code?: string }).code = "unauthorized";
    throw err;
  }
  const text = await res.text();
  const trimmed = (text || "").trim();

  if (!res.ok) {
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

  const parsed = parseWorkerPayload(trimmed) as T & { error?: string };
  if (
    parsed &&
    typeof parsed === "object" &&
    "error" in parsed &&
    !(parsed as { cards?: unknown }).cards &&
    !(parsed as { decisions?: unknown }).decisions
  ) {
    throw new Error(parsed.error || "Pack indisponible.");
  }
  return parsed as T;
}

async function fetchFirstOk<T>(urls: string[], token?: string): Promise<T> {
  let last: unknown;
  const seen = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      return await fetchJson<T>(url, token);
    } catch (err) {
      last = err;
      if (
        err instanceof Error &&
        (err as Error & { code?: string }).code === "unauthorized"
      ) {
        throw err;
      }
    }
  }
  throw last instanceof Error ? last : new Error("Pack indisponible.");
}

/**
 * Fetch JSON générique, membre si connecté sinon démo publique.
 * Retombe sur la démo si la session a expiré (401).
 *
 * Connecté : le Worker sert souvent du HTML (`const DATA`), pas du JSON.
 * On l'accepte. On ne retombe PAS sur le jeu de 8 fiches démo.
 *
 * `requiresAuthHeader` : false pour un JSON statique public (pas de Bearer).
 * `fallback` : JSON embarqué, uniquement hors connexion.
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
    if (!isMember && fallback != null && !demoUrl) {
      setState({ status: "ready", json: fallback, source: "demo" });
      return;
    }

    const url = isMember ? memberUrl : demoUrl;
    const token = isMember && requiresAuthHeader ? auth.token : undefined;
    const urls = isMember ? memberUrls(url) : [url];

    fetchFirstOk<T>(urls, token)
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
        if (!isMember && fallback != null) {
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
