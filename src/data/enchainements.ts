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
  liees?: string[];
  complete?: boolean;
};

export type ChronologyData = {
  meta: { count: number; demo?: boolean };
  decisions: Decision[];
};

const MAX_DEPTH = 3;
const MIN_CHAIN = 3;
const MAX_CHAIN = 6;

function buildById(decisions: Decision[]): Map<string, Decision> {
  return new Map(decisions.map((d) => [d.id, d]));
}

/** Voisins bidirectionnels : `liees` n'est pas toujours symétrique côté données. */
function getNeighbors(byId: Map<string, Decision>, id: string): Set<string> {
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

function buildRelationGraph(
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

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Tire un enchaînement de décisions liées (via `liees`, graphe bidirectionnel,
 * même logique que le web) : une ancre au hasard puis ses décisions liées
 * jusqu'à MAX_CHAIN, avec au moins MIN_CHAIN pour que l'exercice ait un sens.
 */
export function pickRandomChain(decisions: Decision[]): Decision[] | null {
  const byId = buildById(decisions);
  const withLinks = decisions.filter(
    (d) => buildRelationGraph(byId, d.id, MAX_DEPTH).size > 1
  );
  if (!withLinks.length) return null;

  const anchor = withLinks[Math.floor(Math.random() * withLinks.length)];
  const graph = buildRelationGraph(byId, anchor.id, MAX_DEPTH);
  const ids = [...graph.keys()]
    .sort((a, b) => (graph.get(a) || 0) - (graph.get(b) || 0))
    .slice(0, MAX_CHAIN);
  if (ids.length < MIN_CHAIN) return null;
  return ids.map((id) => byId.get(id)).filter((d): d is Decision => !!d);
}

export function sortChronologically(items: Decision[]): Decision[] {
  return [...items].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

export function shuffledOrder(items: Decision[]): Decision[] {
  let out = shuffle(items);
  let tries = 0;
  // Évite (autant que possible) que le tirage initial soit déjà l'ordre correct.
  const correct = sortChronologically(items).map((d) => d.id).join(",");
  while (out.map((d) => d.id).join(",") === correct && tries < 10 && items.length > 1) {
    out = shuffle(items);
    tries += 1;
  }
  return out;
}

/** Masque l'année dans le nom pendant l'exercice (dates cachées, comme le web). */
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
