import { type Decision } from "./decisions";

export type ArretsFilters = {
  query: string;
  theme: string | null;
  juridiction: string | null;
  formation: string | null;
  year: string | null;
  importance: number | null;
};

export const EMPTY_ARRETS_FILTERS: ArretsFilters = {
  query: "",
  theme: null,
  juridiction: null,
  formation: null,
  year: null,
  importance: null,
};

/** Au moins un critère actif (sinon on n'affiche pas les ~995 fiches). */
export function hasActiveArretsFilters(filters: ArretsFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.theme != null ||
    filters.juridiction != null ||
    filters.formation != null ||
    filters.year != null ||
    filters.importance != null
  );
}

export function uniqueSorted(values: (string | undefined | null)[]): string[] {
  return [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "fr")
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
    if (filters.year && String(d.annee) !== filters.year) return false;
    if (filters.importance != null && (d.importance || 0) !== filters.importance) {
      return false;
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
