import { buildById, buildRelationGraph, getNeighbors, sortChronologically, type Decision } from "./decisions";

const CLUSTER_DEPTH = 2;

export type DecadeGroup = {
  decade: string;
  items: Decision[];
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

/** Décisions directement liées (depth 1), triées chronologiquement. */
export function directRelations(byId: Map<string, Decision>, id: string): Decision[] {
  const neighbors = [...getNeighbors(byId, id)]
    .map((nid) => byId.get(nid))
    .filter((d): d is Decision => !!d);
  return sortChronologically(neighbors);
}

/**
 * La "lignée" : tout le sous-graphe connecté à `id` jusqu'à CLUSTER_DEPTH,
 * décision courante incluse, trié chronologiquement — la vue d'ensemble
 * d'une évolution jurisprudentielle (fondation → confirmation → revirement…).
 */
export function relatedCluster(byId: Map<string, Decision>, id: string): Decision[] {
  const graph = buildRelationGraph(byId, id, CLUSTER_DEPTH);
  const items = [...graph.keys()]
    .map((gid) => byId.get(gid))
    .filter((d): d is Decision => !!d);
  return sortChronologically(items);
}

export { buildById };
