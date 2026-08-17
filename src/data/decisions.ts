export type Decision = {
  id: string;
  nom: string;
  date: string;
  annee: number;
  juridiction?: string;
  formation?: string;
  importance?: number;
  theme?: string;
  notions?: string[];
  objet?: string;
  verso?: string;
  portee?: string;
  faits?: string;
  enjeu?: string;
  solution?: string;
  perspective?: string;
  /** Considérant de principe — absent du JSON Chronologie historique ; hydraté à l'app. */
  considerant?: string;
  slugFiche?: string | null;
  urlOfficielle?: string | null;
  liees?: string[];
  complete?: boolean;
};

export type ChronologyData = {
  meta: { count: number; demo?: boolean };
  decisions: Decision[];
};

export function buildById(decisions: Decision[]): Map<string, Decision> {
  return new Map(decisions.map((d) => [d.id, d]));
}

/**
 * Voisins bidirectionnels : `liees` n'est renseigné que dans un sens côté
 * Notion (A cite B), on reconstitue la relation dans les deux sens.
 */
export function getNeighbors(byId: Map<string, Decision>, id: string): Set<string> {
  const set = new Set<string>();
  const sel = byId.get(id);
  if (!sel) return set;
  (sel.liees || []).forEach((x) => set.add(x));
  byId.forEach((d, otherId) => {
    if (otherId === id) return;
    if ((d.liees || []).includes(id)) set.add(otherId);
  });
  return set;
}

export function buildRelationGraph(
  byId: Map<string, Decision>,
  id: string,
  maxDepth: number
): Map<string, number> {
  const levels = new Map<string, number>();
  if (!byId.has(id)) return levels;
  levels.set(id, 0);
  let frontier = [id];
  for (let d = 1; d <= maxDepth; d++) {
    const next: string[] = [];
    frontier.forEach((uid) => {
      getNeighbors(byId, uid).forEach((vid) => {
        if (levels.has(vid) || !byId.has(vid)) return;
        levels.set(vid, d);
        next.push(vid);
      });
    });
    frontier = next;
    if (!frontier.length) break;
  }
  return levels;
}

export function sortChronologically(items: Decision[]): Decision[] {
  return [...items].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

export function displayNom(nom: string, showYear: boolean): string {
  const raw = (nom || "").trim();
  if (showYear || !raw) return raw;
  return raw.replace(/,\s*\d{4}\s*,/g, ", …,");
}

export function formatDateFr(iso?: string): string {
  if (!iso) return "—";
  const p = String(iso).slice(0, 10).split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

export function starsLabel(level?: number): string {
  const n = Math.min(4, Math.max(0, Math.floor(level || 0)));
  return n ? "★".repeat(n) : "";
}
