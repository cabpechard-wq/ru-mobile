export type Card = {
  id: string;
  recto: string;
  verso: string;
  url?: string;
  date?: string;
  juridiction?: string;
  formation?: string;
  titre?: string;
  reference?: string;
  importance?: string;
  /** Niveau 1–4 (étoiles) — aligné web / generator.importance_level */
  importance_level?: number;
  theme?: string;
  themes: string[];
  notions: string[];
  objet?: string;
  portee?: string;
  considerant?: string;
};

export type FlipcardsData = {
  kind: string;
  count: number;
  recto_field: string;
  verso_field: string;
  classifiers: {
    theme_field: string;
    notions_field: string;
    themes: string[];
    notions: string[];
  };
  classifier_colors?: {
    themes?: Record<string, string>;
    notions?: Record<string, string>;
  };
  cards: Card[];
};

/** Niveaux d'importance (comme le web : ★ … ★★★★). */
export const IMPORTANCE_LEVELS = [1, 2, 3, 4] as const;

export function importanceLevelFromRaw(raw?: string): number {
  const s = (raw || "").trim();
  if (!s) return 0;
  const n = (s.match(/⭐/g) || []).length
    || (s.match(/★/g) || []).length
    || (s.match(/\*/g) || []).length;
  if (n) return Math.min(4, Math.max(1, n));
  const m = s.match(/[1-4]/);
  return m ? Number(m[0]) : 0;
}

export function cardImportanceLevel(card: Card): number {
  const lvl = Number(card.importance_level) || 0;
  if (lvl >= 1 && lvl <= 4) return lvl;
  return importanceLevelFromRaw(card.importance);
}

export function starsLabel(level: number): string {
  const n = Math.min(4, Math.max(0, Math.floor(level) || 0));
  return n ? "★".repeat(n) : "";
}

function normalizeCard(c: Card): Card {
  const level = cardImportanceLevel(c);
  return {
    ...c,
    themes: Array.isArray(c.themes) ? c.themes : [],
    notions: Array.isArray(c.notions) ? c.notions : [],
    importance_level: level || undefined,
  };
}

export type NormalizedCardsData = {
  raw: FlipcardsData;
  allCards: Card[];
  allThemes: string[];
  allNotions: string[];
  presentImportanceLevels: number[];
  colorForLabel: (label: string, group: "theme" | "notion") => string;
};

function lookupColor(label: string, mapping: Record<string, string>): string {
  const bit = (label || "").trim();
  if (!bit) return "default";
  if (mapping[bit]) return mapping[bit];
  // Thèmes parfois stockés avec préfixe numérique dans le mapping
  for (const [k, v] of Object.entries(mapping)) {
    if (
      k === bit ||
      k.endsWith(`-${bit}`) ||
      k.endsWith(`–${bit}`) ||
      k.endsWith(`—${bit}`)
    ) {
      return v;
    }
    const m = k.match(/^\d+\s*[-–—]\s*(.+)$/);
    if (m && m[1].trim() === bit) return v;
  }
  return "default";
}

/** Normalise une réponse JSON brute (fetch) en données prêtes à l'emploi. */
export function normalizeCardsData(raw: FlipcardsData): NormalizedCardsData {
  const allCards: Card[] = (raw.cards || [])
    .filter((c) => !!c.recto)
    .map(normalizeCard);
  const allThemes = raw.classifiers?.themes || [];
  const allNotions = raw.classifiers?.notions || [];
  const presentImportanceLevels = IMPORTANCE_LEVELS.filter((lvl) =>
    allCards.some((c) => cardImportanceLevel(c) === lvl)
  );
  const themeColors = raw.classifier_colors?.themes || {};
  const notionColors = raw.classifier_colors?.notions || {};

  return {
    raw,
    allCards,
    allThemes,
    allNotions,
    presentImportanceLevels,
    colorForLabel: (label, group) =>
      lookupColor(label, group === "theme" ? themeColors : notionColors),
  };
}
