import { SITE_BASE_URL } from "./config";
import type { Card } from "./cards";
import type { Decision } from "./decisions";

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

/**
 * Fallback : extrait le blockquote « Considérant » de la fiche HTML publique.
 * Couvre les ~995 fiches même hors jeu Flipcards.
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
