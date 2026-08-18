import { cardImportanceLevel, type Card } from "./cards";
import { uniqueSortedFr } from "./sortFr";
import { type Decision } from "./decisions";

export type ArretsFilters = {
  query: string;
  reference: string;
  theme: string | null;
  notion: string | null;
  juridiction: string | null;
  formation: string | null;
  yearFrom: string;
  yearTo: string;
  importance: number | null;
};

export const EMPTY_ARRETS_FILTERS: ArretsFilters = {
  query: "",
  reference: "",
  theme: null,
  notion: null,
  juridiction: null,
  formation: null,
  yearFrom: "",
  yearTo: "",
  importance: null,
};

/** Au moins un critère actif (sinon on n'affiche pas les ~995 fiches). */
export function hasActiveArretsFilters(filters: ArretsFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.reference.trim().length > 0 ||
    filters.theme != null ||
    filters.notion != null ||
    filters.juridiction != null ||
    filters.formation != null ||
    filters.yearFrom.trim().length > 0 ||
    filters.yearTo.trim().length > 0 ||
    filters.importance != null
  );
}

export function uniqueSorted(values: (string | undefined | null)[]): string[] {
  return uniqueSortedFr(values);
}

export function yearFromIsoOrText(...bits: (string | number | undefined | null)[]): number {
  for (const b of bits) {
    const m = String(b ?? "").match(/(?:^|\D)(\d{4})(?:\D|$)/);
    if (m) return Number(m[1]);
  }
  return 0;
}

/** Carte Flipcards / Relier → Decision pour le bandeau de filtres unifié (site PR #12). */
export function decisionFromCard(card: Card, extra?: Decision): Decision {
  return {
    id: card.id,
    nom: extra?.nom || card.recto,
    date: extra?.date || card.date || "",
    annee: extra?.annee || yearFromIsoOrText(card.date, card.recto),
    juridiction: extra?.juridiction || card.juridiction,
    formation: extra?.formation || card.formation,
    importance: extra?.importance ?? cardImportanceLevel(card),
    theme: extra?.theme || card.theme || (card.themes || [])[0],
    notions: extra?.notions?.length ? extra.notions : card.notions,
    objet: extra?.objet || card.objet,
    reference: extra?.reference || card.reference,
    slugFiche: extra?.slugFiche || card.id,
  };
}

export function decisionFromRelierLike(
  item: {
    id: string;
    recto: string;
    objet?: string;
    themes?: string[];
    notions?: string[];
    importance_level?: number;
  },
  extra?: Decision
): Decision {
  return {
    id: item.id,
    nom: extra?.nom || item.recto,
    date: extra?.date || "",
    annee: extra?.annee || yearFromIsoOrText(item.recto),
    juridiction: extra?.juridiction,
    formation: extra?.formation,
    importance: extra?.importance ?? item.importance_level,
    theme: extra?.theme || (item.themes || [])[0],
    notions: extra?.notions?.length ? extra.notions : item.notions,
    objet: extra?.objet || item.objet,
    reference: extra?.reference,
    slugFiche: extra?.slugFiche || item.id,
  };
}

export function matchDecision(
  haystack: Decision[],
  keys: { id?: string; nom?: string }
): Decision | undefined {
  const id = (keys.id || "").trim();
  const nom = (keys.nom || "").trim();
  return (
    haystack.find((d) => id && (d.id === id || d.slugFiche === id)) ||
    haystack.find((d) => nom && d.nom === nom)
  );
}

export function themeLabel(theme?: string | null): string {
  const raw = (theme || "").trim();
  if (!raw) return "";
  // "42-Compétence…" → "Compétence…"
  const m = raw.match(/^\d+\s*[-–—]\s*(.+)$/);
  return (m ? m[1] : raw).trim();
}

export function filterDecisions(
  decisions: Decision[],
  filters: ArretsFilters
): Decision[] {
  const q = filters.query.trim().toLowerCase();
  return decisions.filter((d) => {
    if (filters.theme) {
      const tl = themeLabel(d.theme);
      if (tl !== filters.theme && d.theme !== filters.theme) return false;
    }
    if (filters.juridiction && (d.juridiction || "") !== filters.juridiction) {
      return false;
    }
    if (filters.formation && (d.formation || "") !== filters.formation) {
      return false;
    }
    if (filters.notion && !(d.notions || []).includes(filters.notion)) {
      return false;
    }
    const from = filters.yearFrom.trim() ? Number(filters.yearFrom) : null;
    const to = filters.yearTo.trim() ? Number(filters.yearTo) : null;
    if (from != null && !Number.isNaN(from) && (d.annee || 0) < from) return false;
    if (to != null && !Number.isNaN(to) && (d.annee || 0) > to) return false;
    if (filters.importance != null && (d.importance || 0) !== filters.importance) {
      return false;
    }
    const ref = filters.reference.trim().toLowerCase();
    if (ref) {
      const hay = [d.reference, d.nom, d.slugFiche, d.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(ref)) return false;
    }
    if (q) {
      const hay = [
        d.nom,
        d.objet,
        d.theme,
        d.juridiction,
        d.formation,
        ...(d.notions || []),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Suggestions « N au hasard » hors sélection.
 * `poolSize` est variable (15 démo / 995 fonds / …) — on n'affiche que si
 * poolSize - selectedCount >= count (défaut 3).
 */
export function pickAsideRandom<T extends { id: string }>(
  pool: T[],
  selectedIds: Set<string>,
  count = 3
): T[] {
  const outside = pool.filter((d) => !selectedIds.has(d.id));
  if (outside.length < count) return [];
  const out = [...outside];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, count);
}
