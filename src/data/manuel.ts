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

export function buildChapterIndex(data: ManuelData): Map<string, Chapter> {
  return new Map(data.chapters.map((c) => [c.id, c]));
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
