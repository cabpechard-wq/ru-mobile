import { cardImportanceLevel, type Card } from "./cards";

export type RelierItem = {
  id: string;
  recto: string;
  objet: string;
  themes: string[];
  notions: string[];
  importance_level?: number;
};

export type RelierData = {
  kind: string;
  count: number;
  classifiers: {
    themes: string[];
    notions: string[];
  };
  cards: RelierItem[];
};

export type NormalizedRelierData = {
  allItems: RelierItem[];
};

export function normalizeRelierData(raw: RelierData): NormalizedRelierData {
  const allItems: RelierItem[] = (raw.cards || [])
    .filter((c) => !!c.recto && !!c.objet)
    .map((c) => ({
      ...c,
      themes: Array.isArray(c.themes) ? c.themes : [],
      notions: Array.isArray(c.notions) ? c.notions : [],
      importance_level: cardImportanceLevel(c as unknown as Card) || undefined,
    }));
  return { allItems };
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
