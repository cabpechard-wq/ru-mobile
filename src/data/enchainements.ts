import {
  buildById,
  buildRelationGraph,
  type ChronologyData,
  type Decision,
  displayNom,
  formatDateFr,
  sortChronologically,
} from "./decisions";

export type { ChronologyData, Decision };
export { displayNom, formatDateFr, sortChronologically };

const MAX_DEPTH = 3;
const MIN_CHAIN = 3;
const MAX_CHAIN = 6;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Tire un enchaînement de décisions liées (via `liees`, graphe bidirectionnel)
 * : une ancre au hasard puis ses décisions liées jusqu'à MAX_CHAIN, avec au
 * moins MIN_CHAIN pour que l'exercice ait un sens.
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
