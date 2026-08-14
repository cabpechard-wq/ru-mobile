/**
 * Navigation linéaire du manuel (ordre de parcours = DFS préfixe sur
 * l'arbre rootIds → children), comme le bandeau précédent/suivant du site.
 */
import { type Chapter } from "./manuel";

export function flattenChapters(
  byId: Map<string, Chapter>,
  rootIds: string[]
): Chapter[] {
  const out: Chapter[] = [];
  const walk = (id: string) => {
    const ch = byId.get(id);
    if (!ch) return;
    out.push(ch);
    ch.children.forEach(walk);
  };
  rootIds.forEach(walk);
  return out;
}

export function neighborsForChapter(
  byId: Map<string, Chapter>,
  rootIds: string[],
  id: string
): { prev: Chapter | null; next: Chapter | null } {
  const flat = flattenChapters(byId, rootIds);
  const idx = flat.findIndex((c) => c.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
