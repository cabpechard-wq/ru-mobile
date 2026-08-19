import bundledConsiderants from "../../assets/considerants.json";
import type { Card } from "./cards";
import { CONSIDERANTS_ENDPOINT, SITE_BASE_URL } from "./config";
import type { Decision } from "./decisions";
import { fetchJsonCached } from "./jsonCache";

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
type CardConsiderantIndex = {
  byId: Map<string, string>;
  byNormRecto: Map<string, string>;
};

function buildCardConsiderantIndex(cards: Card[]): CardConsiderantIndex {
  const byId = new Map<string, string>();
  const byNormRecto = new Map<string, string>();
  for (const c of cards) {
    const text = (c.considerant || "").trim();
    if (!text) continue;
    if (c.id) byId.set(c.id, text);
    const n = normLabel(c.recto);
    if (n && !byNormRecto.has(n)) byNormRecto.set(n, text);
  }
  return { byId, byNormRecto };
}

function considerantFromCardIndex(
  decision: Decision,
  index: CardConsiderantIndex,
): string | undefined {
  for (const key of [decision.id, decision.slugFiche]) {
    if (!key) continue;
    const text = index.byId.get(key);
    if (text) return text;
  }
  const nom = normLabel(decision.nom);
  if (!nom) return undefined;
  return index.byNormRecto.get(nom);
}

export function considerantFromCards(
  decision: Decision,
  cards: Card[],
): string | undefined {
  return considerantFromCardIndex(decision, buildCardConsiderantIndex(cards));
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
  const cardIndex = cards?.length ? buildCardConsiderantIndex(cards) : null;
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
      (cardIndex ? considerantFromCardIndex(d, cardIndex) : undefined);
    if (!text) return d;
    return { ...d, considerant: text };
  });
}

/** Index embarqué — synchrone, pour afficher les fiches sans attendre le réseau. */
export function loadConsiderantIndex(): Record<string, string> {
  return bundledConsiderantIndex();
}

/** Fusionne l'index publié s'il est plus complet. Ne bloque pas l'UI. */
export async function refreshConsiderantIndex(): Promise<Record<string, string>> {
  const fallback = bundledConsiderantIndex();
  try {
    const json = await fetchJsonCached<ConsiderantFile>(CONSIDERANTS_ENDPOINT);
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
