import { themeLabel } from "./arrets";
import {
  buildById,
  buildRelationGraph,
  getNeighbors,
  sortChronologically,
  type Decision,
} from "./decisions";

const CLUSTER_DEPTH = 2;

export type DecadeGroup = {
  decade: string;
  items: Decision[];
};

export type ChronoFilters = {
  query: string;
  juridiction: string | null;
  theme: string | null;
  notion: string | null;
  importance: number | null;
  yearFrom: string;
  yearTo: string;
  relatedOnly: boolean;
};

export const EMPTY_CHRONO_FILTERS: ChronoFilters = {
  query: "",
  juridiction: null,
  theme: null,
  notion: null,
  importance: null,
  yearFrom: "",
  yearTo: "",
  relatedOnly: false,
};

/** Compte de relations (bidirectionnel) — sert de badge dans les listes. */
export function relationCount(byId: Map<string, Decision>, id: string): number {
  return getNeighbors(byId, id).size;
}

export function groupByDecade(decisions: Decision[]): DecadeGroup[] {
  const sorted = sortChronologically(decisions);
  const groups = new Map<string, Decision[]>();
  sorted.forEach((d) => {
    const decade = `${Math.floor((d.annee || 0) / 10) * 10}`;
    const list = groups.get(decade) || [];
    list.push(d);
    groups.set(decade, list);
  });
  return [...groups.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([decade, items]) => ({ decade, items }));
}

export function searchDecisions(decisions: Decision[], query: string): Decision[] {
  const q = query.trim().toLowerCase();
  if (!q) return decisions;
  return decisions.filter((d) => {
    const haystack = [d.nom, d.theme, d.objet, ...(d.notions || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Filtres alignés sur la Chronologie web. */
export function filterChronologie(
  decisions: Decision[],
  byId: Map<string, Decision>,
  filters: ChronoFilters
): Decision[] {
  const from = filters.yearFrom.trim() ? Number(filters.yearFrom) : null;
  const to = filters.yearTo.trim() ? Number(filters.yearTo) : null;
  let list = searchDecisions(decisions, filters.query);
  list = list.filter((d) => {
    if (filters.juridiction && (d.juridiction || "") !== filters.juridiction) {
      return false;
    }
    if (filters.theme) {
      const tl = themeLabel(d.theme);
      if (tl !== filters.theme && d.theme !== filters.theme) return false;
    }
    if (filters.notion && !(d.notions || []).includes(filters.notion)) {
      return false;
    }
    if (
      filters.importance != null &&
      (d.importance || 0) !== filters.importance
    ) {
      return false;
    }
    if (from != null && !Number.isNaN(from) && (d.annee || 0) < from) return false;
    if (to != null && !Number.isNaN(to) && (d.annee || 0) > to) return false;
    if (filters.relatedOnly && relationCount(byId, d.id) === 0) return false;
    return true;
  });
  return list;
}

/** Décisions directement liées (depth 1), triées chronologiquement. */
export function directRelations(
  byId: Map<string, Decision>,
  id: string
): Decision[] {
  const neighbors = [...getNeighbors(byId, id)]
    .map((nid) => byId.get(nid))
    .filter((d): d is Decision => !!d);
  return sortChronologically(neighbors);
}

/**
 * La "lignée" : tout le sous-graphe connecté à `id` jusqu'à CLUSTER_DEPTH,
 * décision courante incluse, trié chronologiquement.
 */
export function relatedCluster(
  byId: Map<string, Decision>,
  id: string
): Decision[] {
  const graph = buildRelationGraph(byId, id, CLUSTER_DEPTH);
  const items = [...graph.keys()]
    .map((gid) => byId.get(gid))
    .filter((d): d is Decision => !!d);
  return sortChronologically(items);
}

export { buildById };
