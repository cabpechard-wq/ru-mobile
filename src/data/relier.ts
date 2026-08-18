import { cardImportanceLevel, IMPORTANCE_LEVELS, type Card } from "./cards";
import { sortFr } from "./sortFr";

export type RelierItem = {
  id: string;
  recto: string;
  objet: string;
  themes: string[];
  notions: string[];
  importance_level?: number;
  /** Slug fiche dictionnaire / notions (pack dico). */
  slug?: string;
};

export type RelierData = {
  kind: string;
  count: number;
  classifiers: {
    themes: string[];
    notions: string[];
    theme_field?: string;
    notions_field?: string;
  };
  cards: RelierItem[];
};

export type NormalizedRelierData = {
  allItems: RelierItem[];
  allThemes: string[];
  allNotions: string[];
  presentImportanceLevels: number[];
  classifiers: RelierData["classifiers"];
};

export function normalizeRelierData(raw: RelierData): NormalizedRelierData {
  const allItems: RelierItem[] = (raw.cards || [])
    .filter((c) => !!c.recto && !!c.objet)
    .map((c) => ({
      ...c,
      themes: Array.isArray(c.themes) ? c.themes : [],
      notions: Array.isArray(c.notions) ? c.notions : [],
      importance_level: cardImportanceLevel(c as unknown as Card) || undefined,
      slug: c.slug || undefined,
    }));

  const allThemes =
    raw.classifiers?.themes?.length
      ? raw.classifiers.themes
      : [...new Set(allItems.flatMap((c) => c.themes || []))].sort(sortFr);
  const allNotions =
    raw.classifiers?.notions?.length
      ? raw.classifiers.notions
      : [...new Set(allItems.flatMap((c) => c.notions || []))].sort(sortFr);
  const presentImportanceLevels = IMPORTANCE_LEVELS.filter((lvl) =>
    allItems.some((c) => (c.importance_level || 0) === lvl)
  );
  const classifiers = raw.classifiers || { themes: [], notions: [] };

  return {
    allItems,
    allThemes,
    allNotions,
    presentImportanceLevels,
    classifiers,
  };
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
 * Dérangement (Sattolo) : mélange sans qu'aucun élément ne reste à sa
 * position d'origine — la colonne droite ne doit jamais laisser une
 * réponse alignée avec sa question (indice trop facile).
 */
export function derangement<T>(arr: T[]): T[] {
  if (arr.length < 2) return [...arr];
  let out: T[];
  let tries = 0;
  do {
    out = shuffle(arr);
    tries += 1;
  } while (out.some((v, i) => v === arr[i]) && tries < 50);
  return out;
}

export function pickBatch(items: RelierItem[], size: number): RelierItem[] {
  return shuffle(items).slice(0, Math.min(size, items.length));
}

/** Filtre Relier par thèmes / notions / importance (OR au sein d'un groupe). */
export function filterRelierItems(
  items: RelierItem[],
  opts: {
    themes?: string[];
    notions?: string[];
    importance?: number[];
  } = {}
): RelierItem[] {
  const themes = opts.themes || [];
  const notions = opts.notions || [];
  const levels = opts.importance || [];
  return items.filter((item) => {
    if (themes.length && !(item.themes || []).some((t) => themes.includes(t))) {
      return false;
    }
    if (notions.length && !(item.notions || []).some((n) => notions.includes(n))) {
      return false;
    }
    if (levels.length && !levels.includes(item.importance_level || 0)) {
      return false;
    }
    return true;
  });
}
