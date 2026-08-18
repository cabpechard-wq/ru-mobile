import { useEffect, useState } from "react";
import {
  CHRONOLOGIE_META_ENDPOINT,
  DICTIONNAIRE_META_ENDPOINT,
} from "./config";

/** Totaux du site (`chronology-meta.json` / `entries-meta.json`). */
export const FALLBACK_JURISPRUDENCE = 993;
export const FALLBACK_DICTIONNAIRE = 401;

export type FondsMeta = {
  jurisprudence: number;
  dictionnaire: number;
};

const FALLBACK: FondsMeta = {
  jurisprudence: FALLBACK_JURISPRUDENCE,
  dictionnaire: FALLBACK_DICTIONNAIRE,
};

let cached: FondsMeta = FALLBACK;
let inflight: Promise<FondsMeta> | null = null;

async function readCount(url: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const json = (await res.json()) as { count?: number };
    const n = Number(json.count);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

function loadFondsMeta(): Promise<FondsMeta> {
  if (inflight) return inflight;
  inflight = Promise.all([
    readCount(CHRONOLOGIE_META_ENDPOINT, FALLBACK_JURISPRUDENCE),
    readCount(DICTIONNAIRE_META_ENDPOINT, FALLBACK_DICTIONNAIRE),
  ]).then(([jurisprudence, dictionnaire]) => {
    cached = { jurisprudence, dictionnaire };
    return cached;
  });
  return inflight;
}

export function useFondsMeta(): FondsMeta {
  const [meta, setMeta] = useState<FondsMeta>(cached);
  useEffect(() => {
    let cancelled = false;
    loadFondsMeta().then((next) => {
      if (!cancelled) setMeta(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return meta;
}

/**
 * Invité : « 8 / 993 ». Connecté : le numérateur démo disparaît (« 993 »).
 */
export function fondsRatio(
  loaded: number,
  total: number,
  isMember: boolean
): string {
  if (isMember) return String(total);
  return `${loaded} / ${total}`;
}
