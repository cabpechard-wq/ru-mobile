import bundledConsiderants from "../../assets/considerants.json";
import type { Card } from "./cards";
import { CONSIDERANTS_ENDPOINT, SITE_BASE_URL } from "./config";
import type { Decision } from "./decisions";

export type ConsiderantFile = {
  kind?: string;
  count?: number;
  bySlug?: Record<string, string>;
};

/** Normalise un libellé pour comparer recto Flipcards ↔ nom Chronologie. */
function normLabel(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Considérant porté par les cartes Flipcards (même fonds Notion).
 * Matching large : id, slugFiche, ou nom/recto.
 */
export function considerantFromCards(
  decision: Decision,
  cards: Card[],
): string | undefined {
  const ids = new Set(
    [decision.id, decision.slugFiche].filter(Boolean) as string[],
  );
  const nom = normLabel(decision.nom);
  const hit = cards.find((c) => {
    if (ids.has(c.id)) return true;
    if (nom && normLabel(c.recto) === nom) return true;
    return false;
  });
  const text = (hit?.considerant || "").trim();
  return text || undefined;
}

export function bundledConsiderantIndex(): Record<string, string> {
  return (bundledConsiderants as ConsiderantFile).bySlug || {};
}

export function lookupConsiderant(
  decision: Decision,
  bySlug: Record<string, string>,
): string | undefined {
  const keys = [decision.slugFiche, decision.id].filter(Boolean) as string[];
  for (const key of keys) {
    const text = (bySlug[key] || "").trim();
    if (text) return text;
  }
  return undefined;
}

/**
 * Pose `considerant` sur chaque décision à partir de l'index HTML, du pack
 * Flipcards, puis d'un cache de session (fetch HTML réussi).
 * N'écrase pas un texte déjà présent (JSON Chronologie futur, ou déjà hydraté).
 */
export function applyConsiderantsToDecisions(
  decisions: Decision[],
  bySlug: Record<string, string>,
  cards?: Card[],
  remembered?: Record<string, string>,
): Decision[] {
  return decisions.map((d) => {
    const existing = (d.considerant || "").trim();
    if (existing) return d;
    const rememberedText = remembered
      ? [d.id, d.slugFiche || ""]
          .map((k) => (remembered[k] || "").trim())
          .find(Boolean)
      : undefined;
    const text =
      rememberedText ||
      lookupConsiderant(d, bySlug) ||
      (cards ? considerantFromCards(d, cards) : undefined);
    if (!text) return d;
    return { ...d, considerant: text };
  });
}

/** Index distant si disponible, sinon (ou en plus) l'index embarqué. */
export async function loadConsiderantIndex(): Promise<Record<string, string>> {
  const fallback = bundledConsiderantIndex();
  try {
    const res = await fetch(CONSIDERANTS_ENDPOINT);
    if (!res.ok) return fallback;
    const json = (await res.json()) as ConsiderantFile;
    const remote = json?.bySlug;
    if (remote && typeof remote === "object" && Object.keys(remote).length) {
      return { ...fallback, ...remote };
    }
  } catch {
    // Hors-ligne / 404 : l'index embarqué suffit pour le mode avion.
  }
  return fallback;
}

/**
 * Fallback : extrait le blockquote « Considérant » de la fiche HTML publique.
 * Couvre les fiches hors index (ou index pas encore publié) une fois en ligne.
 */
export async function fetchConsiderantFromSite(
  slug: string,
): Promise<string | undefined> {
  const clean = (slug || "").trim().replace(/^\/+|\/+$/g, "");
  if (!clean) return undefined;
  const url = `${SITE_BASE_URL}/arrets/${encodeURIComponent(clean)}/`;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const html = await res.text();
    const m = html.match(
      /<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/i,
    );
    if (!m) return undefined;
    const text = m[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

export function ficheSlugForConsiderant(decision: Decision): string | null {
  const slug = (decision.slugFiche || decision.id || "").trim();
  return slug || null;
}
