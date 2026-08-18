import { themeLabel } from "./arrets";
import {
  buildById,
  buildRelationGraph,
  getNeighbors,
  sortChronologically,
  type Decision,
} from "./decisions";

const CLUSTER_DEPTH = 2;
/** Profondeur max de la lignée sous une Fiche d'arrêt (arborescence). */
export const LINEAGE_DEPTH = 6;

export type DecadeGroup = {
  decade: string;
  items: Decision[];
};

export type ChronoFilters = {
  query: string;
  reference: string;
  juridiction: string | null;
  formation: string | null;
  theme: string | null;
  notion: string | null;
  importance: number | null;
  yearFrom: string;
  yearTo: string;
  relatedOnly: boolean;
};

export const EMPTY_CHRONO_FILTERS: ChronoFilters = {
  query: "",
  reference: "",
  juridiction: null,
  formation: null,
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
    const decade = decadeKey(d.annee);
    const list = groups.get(decade) || [];
    list.push(d);
    groups.set(decade, list);
  });
  return [...groups.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([decade, items]) => ({ decade, items }));
}

/** Clé décennie (« 1820 » pour 1822) — capsule Chronologie. */
export function decadeKey(annee?: number | null): string {
  const y = Number(annee) || 0;
  return `${Math.floor(y / 10) * 10}`;
}

export function searchDecisions(decisions: Decision[], query: string): Decision[] {
  const q = query.trim().toLowerCase();
  if (!q) return decisions;
  return decisions.filter((d) => {
    const haystack = [d.nom, d.theme, d.objet, d.reference, ...(d.notions || [])]
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
    if (filters.formation && (d.formation || "") !== filters.formation) {
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
    const ref = filters.reference.trim().toLowerCase();
    if (ref) {
      const hay = [d.reference, d.nom, d.slugFiche, d.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(ref)) return false;
    }
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
  id: string,
  maxDepth: number = CLUSTER_DEPTH
): Decision[] {
  const graph = buildRelationGraph(byId, id, maxDepth);
  const items = [...graph.keys()]
    .map((gid) => byId.get(gid))
    .filter((d): d is Decision => !!d);
  return sortChronologically(items);
}

export type LineageTreeNode = {
  decision: Decision;
  depth: number;
  children: LineageTreeNode[];
};

/** Nœud aplati pour rendu d'arborescence (indentation + guides). */
export type LineageFlatNode = {
  decision: Decision;
  depth: number;
  /** Dernier enfant de son parent (pour └─ vs ├─). */
  isLast: boolean;
  /**
   * Pour chaque niveau ancestor (1..depth-1) : faut-il prolonger le filet
   * vertical (frère suivant encore présent) ?
   */
  guides: boolean[];
};

/**
 * Arbre de lignée (BFS, profondeur max LINEAGE_DEPTH) :
 * chaque décision n'apparaît qu'une fois, rattachée au premier parent trouvé.
 */
export function buildLineageTree(
  byId: Map<string, Decision>,
  id: string,
  maxDepth: number = LINEAGE_DEPTH
): LineageTreeNode | null {
  const root = byId.get(id);
  if (!root) return null;

  const visited = new Set<string>([id]);

  const build = (nodeId: string, depth: number): LineageTreeNode => {
    const decision = byId.get(nodeId)!;
    const children: LineageTreeNode[] = [];
    if (depth < maxDepth) {
      const childDecisions = sortChronologically(
        [...getNeighbors(byId, nodeId)]
          .filter((nid) => !visited.has(nid) && byId.has(nid))
          .map((nid) => byId.get(nid)!)
      );
      for (const child of childDecisions) {
        visited.add(child.id);
        children.push(build(child.id, depth + 1));
      }
    }
    return { decision, depth, children };
  };

  return build(id, 0);
}

/** Aplatit l'arbre pour un rendu ligne à ligne avec indentation. */
export function flattenLineageTree(
  root: LineageTreeNode,
  options: { includeRoot?: boolean } = {}
): LineageFlatNode[] {
  const includeRoot = options.includeRoot !== false;
  const out: LineageFlatNode[] = [];

  const walk = (
    node: LineageTreeNode,
    isLast: boolean,
    guides: boolean[]
  ) => {
    if (includeRoot || node.depth > 0) {
      out.push({
        decision: node.decision,
        depth: node.depth,
        isLast,
        guides,
      });
    }
    node.children.forEach((child, i) => {
      const childIsLast = i === node.children.length - 1;
      // Sous la racine : pas de filet vertical avant le premier branchement.
      const childGuides =
        node.depth === 0 ? [] : [...guides, !isLast];
      walk(child, childIsLast, childGuides);
    });
  };

  walk(root, true, []);
  return out;
}

export { buildById };
