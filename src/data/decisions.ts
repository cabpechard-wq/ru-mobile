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
  /** Cote / référence (filtre unifié Grandes décisions, site PR #12). */
  reference?: string;
  /** Slug de fiche d’arrêt (lien Chronologie / filtres Référence). */
  slugFiche?: string;
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

const neighborIndexByMap = new WeakMap<
  Map<string, Decision>,
  Map<string, Set<string>>
>();

/** Index bidirectionnel des `liees` — O(arêtes) une fois par fonds. */
export function buildNeighborSets(
  decisions: Iterable<Decision>,
): Map<string, Set<string>> {
  const sets = new Map<string, Set<string>>();
  const bump = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    let sa = sets.get(a);
    if (!sa) {
      sa = new Set();
      sets.set(a, sa);
    }
    sa.add(b);
    let sb = sets.get(b);
    if (!sb) {
      sb = new Set();
      sets.set(b, sb);
    }
    sb.add(a);
  };
  for (const d of decisions) {
    if (!sets.has(d.id)) sets.set(d.id, new Set());
    for (const other of d.liees || []) bump(d.id, other);
  }
  return sets;
}

function neighborSetsFor(byId: Map<string, Decision>): Map<string, Set<string>> {
  const hit = neighborIndexByMap.get(byId);
  if (hit) return hit;
  const built = buildNeighborSets(byId.values());
  neighborIndexByMap.set(byId, built);
  return built;
}

/**
 * Voisins bidirectionnels : `liees` n'est renseigné que dans un sens côté
 * Notion (A cite B), on reconstitue la relation dans les deux sens.
 */
export function getNeighbors(byId: Map<string, Decision>, id: string): Set<string> {
  return neighborSetsFor(byId).get(id) || new Set();
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
