export type InlineRun = {
  type: "text" | "link";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  kind?: "dict" | "arret" | "manuel" | "external";
  target?: string;
};

export type Block =
  | { type: "heading"; level: 2 | 3; runs: InlineRun[] }
  | { type: "paragraph"; runs: InlineRun[] }
  | { type: "blockquote"; runs: InlineRun[] }
  | { type: "list"; ordered: boolean; items: InlineRun[][] }
  | { type: "aside"; title?: string; blocks: Block[] };

export type Chapter = {
  id: string;
  title: string;
  parentId: string | null;
  children: string[];
  blocks: Block[];
};

export type ManuelData = {
  kind: string;
  count: number;
  rootIds: string[];
  chapters: Chapter[];
};

export type ChapterExercises = {
  title: string;
  jurisprudence: string[];
  notions: string[];
};

/** {ref: exercices} — voir manuel/exercices.json (web). */
export type ManuelExercisesData = Record<string, ChapterExercises>;

export function buildChapterIndex(data: ManuelData): Map<string, Chapter> {
  return new Map(data.chapters.map((c) => [c.id, c]));
}

/**
 * "dp-000-dp-100-dp-120" -> "DP-120" : dérive la référence de chapitre
 * (clé de manuel/exercices.json) depuis l'id de chapitre du manuel mobile.
 */
export function refForChapterId(id: string): string | null {
  const m = id.match(/dp-(\d+)$/);
  return m ? `DP-${m[1]}` : null;
}

/** Fil d'Ariane, racine en premier. */
export function breadcrumb(byId: Map<string, Chapter>, id: string): Chapter[] {
  const trail: Chapter[] = [];
  let cur = byId.get(id);
  while (cur) {
    trail.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return trail;
}
