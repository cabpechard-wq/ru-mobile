/**
 * Cache applicatif des JSON publics (Chronologie, Dictionnaire, Cours…).
 *
 * GitHub Pages met `/chronologie/*` en `no-store` : le cache HTTP Android
 * ne garde pas le fonds (~3,3 Mo). Sans cache disque, chaque session
 * reconnectée retélécharge et reparse, ~5 s par écran.
 *
 * Mémoire (processus) + fichier (expo-file-system) + requêtes conditionnelles
 * (ETag / Last-Modified). Les fetches simultanés d'une même URL sont fusionnés.
 */
import { Platform } from "react-native";

type DiskMeta = {
  etag?: string;
  lastModified?: string;
};

type MemoryEntry = {
  json: unknown;
  etag?: string;
  lastModified?: string;
};

const memory = new Map<string, MemoryEntry>();
const inflight = new Map<string, Promise<unknown>>();

function cacheId(url: string): string {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

type FsLegacy = {
  cacheDirectory: string | null;
  makeDirectoryAsync: (
    path: string,
    opts?: { intermediates?: boolean },
  ) => Promise<void>;
  getInfoAsync: (path: string) => Promise<{ exists: boolean }>;
  readAsStringAsync: (path: string) => Promise<string>;
  writeAsStringAsync: (path: string, contents: string) => Promise<void>;
};

let fsPromise: Promise<FsLegacy | null> | null = null;

function loadFs(): Promise<FsLegacy | null> {
  if (Platform.OS === "web") return Promise.resolve(null);
  if (!fsPromise) {
    fsPromise = import("expo-file-system/legacy")
      .then((mod) => {
        const fs = mod as unknown as FsLegacy;
        if (!fs?.cacheDirectory || !fs.readAsStringAsync) return null;
        return fs;
      })
      .catch(() => null);
  }
  return fsPromise;
}

async function cacheDir(fs: FsLegacy): Promise<string | null> {
  if (!fs.cacheDirectory) return null;
  const dir = `${fs.cacheDirectory}ru-json-cache/`;
  try {
    await fs.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // déjà créé
  }
  return dir;
}

async function diskRead(url: string): Promise<{ text: string; meta: DiskMeta } | null> {
  try {
    const fs = await loadFs();
    if (!fs) return null;
    const dir = await cacheDir(fs);
    if (!dir) return null;
    const id = cacheId(url);
    const bodyPath = `${dir}${id}.json`;
    const metaPath = `${dir}${id}.meta.json`;
    const info = await fs.getInfoAsync(bodyPath);
    if (!info.exists) return null;
    const text = await fs.readAsStringAsync(bodyPath);
    let meta: DiskMeta = {};
    try {
      const metaInfo = await fs.getInfoAsync(metaPath);
      if (metaInfo.exists) {
        meta = JSON.parse(await fs.readAsStringAsync(metaPath)) as DiskMeta;
      }
    } catch {
      meta = {};
    }
    return { text, meta };
  } catch {
    return null;
  }
}

function diskWrite(url: string, text: string, meta: DiskMeta): void {
  void (async () => {
    try {
      const fs = await loadFs();
      if (!fs) return;
      const dir = await cacheDir(fs);
      if (!dir) return;
      const id = cacheId(url);
      await fs.writeAsStringAsync(`${dir}${id}.json`, text);
      await fs.writeAsStringAsync(`${dir}${id}.meta.json`, JSON.stringify(meta));
    } catch {
      // Quota / webview : le cache mémoire suffit pour la session.
    }
  })();
}

function parseJson<T>(text: string): T {
  const trimmed = (text || "").trim();
  if (trimmed.startsWith("<")) {
    throw new Error("Serveur indisponible (page HTML).");
  }
  return JSON.parse(trimmed) as T;
}

/** JSON déjà en mémoire, sinon lu depuis le disque (sans réseau). */
export async function peekJsonCache<T>(url: string): Promise<T | undefined> {
  const mem = memory.get(url);
  if (mem) return mem.json as T;
  const disk = await diskRead(url);
  if (!disk) return undefined;
  try {
    const json = parseJson<T>(disk.text);
    memory.set(url, {
      json,
      etag: disk.meta.etag,
      lastModified: disk.meta.lastModified,
    });
    return json;
  } catch {
    return undefined;
  }
}

export function rememberJson(url: string, json: unknown, meta: DiskMeta = {}): void {
  const prev = memory.get(url);
  memory.set(url, {
    json,
    etag: meta.etag ?? prev?.etag,
    lastModified: meta.lastModified ?? prev?.lastModified,
  });
}

/** Persiste un objet déjà parsé (packs Worker HTML → JSON). */
export function putJsonCache(url: string, json: unknown): void {
  rememberJson(url, json);
  try {
    diskWrite(url, JSON.stringify(json), {});
  } catch {
    // ignore
  }
}

async function fetchOnce<T>(
  url: string,
  headers?: Record<string, string>,
  force?: boolean,
): Promise<T> {
  const mem = memory.get(url);
  const disk = mem ? null : await diskRead(url);
  const etag = force ? undefined : mem?.etag || disk?.meta.etag;
  const lastModified = force ? undefined : mem?.lastModified || disk?.meta.lastModified;

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers || {}),
  };
  if (etag) reqHeaders["If-None-Match"] = etag;
  if (lastModified) reqHeaders["If-Modified-Since"] = lastModified;

  const res = await fetch(url, { headers: reqHeaders });

  if (res.status === 304) {
    if (mem) return mem.json as T;
    if (disk) {
      const json = parseJson<T>(disk.text);
      memory.set(url, {
        json,
        etag: disk.meta.etag,
        lastModified: disk.meta.lastModified,
      });
      return json;
    }
  }

  if (!res.ok) {
    if (mem) return mem.json as T;
    if (disk) {
      const json = parseJson<T>(disk.text);
      memory.set(url, { json, etag: disk.meta.etag, lastModified: disk.meta.lastModified });
      return json;
    }
    throw new Error(`Serveur indisponible (${res.status})`);
  }

  const text = await res.text();
  const json = parseJson<T>(text);
  const meta: DiskMeta = {
    etag: res.headers.get("etag") || undefined,
    lastModified: res.headers.get("last-modified") || undefined,
  };
  memory.set(url, { json, ...meta });
  diskWrite(url, text, meta);
  return json;
}

/**
 * Télécharge (ou 304) un JSON, met à jour le cache. Fusionne les appels
 * concurrents. Si le réseau échoue et qu'un cache existe, le cache gagne.
 */
export function fetchJsonCached<T>(
  url: string,
  opts?: { headers?: Record<string, string>; force?: boolean },
): Promise<T> {
  const key = `${opts?.force ? "force:" : ""}${url}`;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const p = fetchOnce<T>(url, opts?.headers, opts?.force).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
