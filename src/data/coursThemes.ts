import { isCoursChapterPath, splitCoursLinks, type DictEntry } from "./dictionnaire";
import { sortFr } from "./sortFr";

/** Aligné sur `dico-cours-themes.js` du site. */
export function termKey(s: string): string {
  return String(s || "")
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Couleur de chip selon la partie du manuel (dp-100 … dp-500). */
export function colorForManuelPath(path: string): string {
  const p = String(path || "");
  if (p.includes("/dp-500/")) return "red";
  if (p.includes("/dp-400/")) return "purple";
  if (p.includes("/dp-300/")) return "green";
  if (p.includes("/dp-200/")) return "yellow";
  if (p.includes("/dp-100/")) return "orange";
  return "default";
}

export type CoursTheme = { label: string; color: string };

export function coursLabelsForEntry(entry: DictEntry): string[] {
  return splitCoursLinks(entry.cours || [])
    .chapitres.map((c) => (c.label || "").trim())
    .filter(Boolean);
}

export function collectDictionaryThemes(entries: DictEntry[]): string[] {
  const set = new Set<string>();
  entries.forEach((e) => {
    coursLabelsForEntry(e).forEach((label) => set.add(label));
  });
  return [...set].sort(sortFr);
}

export function filterEntriesByCoursTheme(
  entries: DictEntry[],
  theme: string
): DictEntry[] {
  const t = theme.trim();
  if (!t) return entries;
  return entries.filter((e) => coursLabelsForEntry(e).includes(t));
}

export function buildCoursIndex(entries: DictEntry[]): {
  byTerm: Map<string, string[]>;
  catalog: CoursTheme[];
} {
  const catalogMap = new Map<string, CoursTheme>();
  const byTerm = new Map<string, string[]>();

  entries.forEach((entry) => {
    const labels: string[] = [];
    (entry.cours || []).forEach((c) => {
      if (!isCoursChapterPath(c.path)) return;
      const label = String(c.label || "").trim();
      if (!label) return;
      labels.push(label);
      if (!catalogMap.has(label)) {
        catalogMap.set(label, {
          label,
          color: colorForManuelPath(c.path),
        });
      }
    });
    if (!labels.length) return;
    [termKey(entry.term), termKey(entry.id)].forEach((k) => {
      if (k) byTerm.set(k, labels);
    });
  });

  const catalog = [...catalogMap.values()].sort((a, b) =>
    sortFr(a.label, b.label)
  );
  return { byTerm, catalog };
}

export function coursLabelsForTerm(
  byTerm: Map<string, string[]>,
  ...keys: string[]
): string[] {
  for (const key of keys) {
    const labels = byTerm.get(termKey(key));
    if (labels?.length) return labels;
  }
  return [];
}

export function catalogPresentFor(
  catalog: CoursTheme[],
  hasLabel: (label: string) => boolean
): CoursTheme[] {
  return catalog.filter((item) => hasLabel(item.label));
}

export function nameKeySet(names: string[]): Set<string> {
  return new Set(names.map(termKey).filter(Boolean));
}

export function nameInSet(name: string, keys: Set<string>): boolean {
  return keys.has(termKey(name));
}
