export type CoursLink = { path: string; label: string };

export type DictEntry = {
  id: string;
  term: string;
  definition: string;
  cours: CoursLink[];
};

/** Le champ `cours` mélange en fait chapitres du Manuel et arrêts liés. */
export function splitCoursLinks(cours: CoursLink[]): {
  chapitres: CoursLink[];
  arrets: CoursLink[];
} {
  const chapitres = cours.filter((c) => c.path.includes("/manuel/"));
  const arrets = cours.filter((c) => c.path.includes("/arrets/"));
  return { chapitres, arrets };
}

export type DictionnaireData = {
  kind: string;
  count: number;
  entries: DictEntry[];
};

export type LetterGroup = {
  letter: string;
  items: DictEntry[];
};

function firstLetter(term: string): string {
  const c = (term || "").trim().charAt(0).toUpperCase();
  return c || "#";
}

export function groupByLetter(entries: DictEntry[]): LetterGroup[] {
  const sorted = [...entries].sort((a, b) => a.term.localeCompare(b.term, "fr"));
  const groups = new Map<string, DictEntry[]>();
  sorted.forEach((e) => {
    const letter = firstLetter(e.term);
    const list = groups.get(letter) || [];
    list.push(e);
    groups.set(letter, list);
  });
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "fr"))
    .map(([letter, items]) => ({ letter, items }));
}

export function searchEntries(entries: DictEntry[], query: string): DictEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) =>
    `${e.term} ${e.definition}`.toLowerCase().includes(q)
  );
}
