import { isCoursChapterPath, splitCoursLinks, type DictEntry } from "./dictionnaire";

/** Aligné sur `dico-cours-themes.js` + `assets/cours-themes.js` du site. */
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

export type CoursTheme = { label: string; color: string; path?: string };

/** Ordre des thèmes = fiches de cours (numéros XX- du filtre /arrets/). */
const ORDER = [
  "11-État / déconcentration",
  "12-Collectivités territoriales / décentralisation",
  "13-Entités publiques spécialisées",
  "21-Principes du système normatif",
  "22-Constitution",
  "23-Principes généraux du droit",
  "24-Loi et règlements",
  "25-Droit international",
  "31-Service public",
  "32-Biens de l'administration",
  "33-Pouvoir de police",
  "34-Actes administratifs unilatéraux",
  "35-Contrats administratifs",
  "41-Organisation et fonctionnement de la juridiction administrative",
  "42-Compétence de la juridiction administrative",
  "51-Principes généraux de la responsabilité de l'administration",
  "52-Responsabilité sans faute",
  "53-Responsabilité pour faute",
  "54-Responsabilité des agents publics",
  "55-Quasi-contrats",
];

/** Fiches de cours sans numéro d’arrêt, calées dans le sommaire. */
const EXTRA: [string, number][] = [
  ["L'organisation administrative", 10],
  ["Les établissements publics et entités assimilées", 13],
  ["Le système normatif administratif", 20],
  ["La jurisprudence", 24.5],
  ["Les grands équilibres du système normatif", 25.5],
  ["Les moyens de l'action administrative", 30],
  ["Les moyens humains et matériels", 30.5],
  ["Les fonctionnaires et agents publics", 31.5],
  ["Les moyens juridiques", 32.5],
  ["Les recours administratifs", 35.5],
  ["Le contrôle juridictionnel de l'administration", 40],
  ["La responsabilité de la puissance publique", 50],
];

const NUM_RE = /^\s*(\d{1,2}(?:\.\d+)?)\s*[-–.]\s*/;

function fold(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase();
}

export function stripNum(s: string): string {
  return String(s || "").replace(NUM_RE, "").trim();
}

function matchKey(s: string): string {
  let t = fold(stripNum(s));
  t = t.replace(/^(les|le|la)\s+/i, "");
  t = t.replace(/^(l'|l’)/i, "");
  t = t.replace(/\s+et\s+(les|le|la)\s+/g, " ");
  t = t.replace(/\s+et\s+(l'|l’)/g, " ");
  t = t.replace(/\s+\/\s+/g, " ");
  t = t.replace(/\s+et\s+/g, " ");
  t = t.replace(/['’]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function sortFrStripped(a: string, b: string): number {
  const ka = fold(a);
  const kb = fold(b);
  if (ka < kb) return -1;
  if (ka > kb) return 1;
  return String(a).localeCompare(String(b), "fr");
}

const RANK: Record<string, number> = {};
ORDER.forEach((label) => {
  const m = String(label).match(NUM_RE);
  RANK[matchKey(label)] = m ? parseFloat(m[1]) : 10000;
});
EXTRA.forEach(([label, n]) => {
  const key = matchKey(label);
  if (RANK[key] == null) RANK[key] = n;
});

function numPrefix(s: string): number | null {
  const m = String(s || "").match(NUM_RE);
  return m ? parseFloat(m[1]) : null;
}

function rank(s: string): number {
  const n = numPrefix(s);
  if (n != null) return n;
  const k = matchKey(s);
  if (Object.prototype.hasOwnProperty.call(RANK, k)) return RANK[k];
  return 10000;
}

/** Ordre du sommaire (XX- puis fiches de cours), comme `CoursThemes.compare`. */
export function compare(a: string, b: string): number {
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  return sortFrStripped(stripNum(a), stripNum(b));
}

export function uniqueSorted(arr: (string | undefined | null)[]): string[] {
  return [...new Set((arr || []).map((v) => (v || "").trim()).filter(Boolean))].sort(
    compare
  );
}

/** Masque le préfixe « XX- » à l’affichage. */
export function displayLabel(s: string): string {
  return stripNum(s);
}

function pathKey(path?: string | null): string {
  const m = String(path || "").match(/dp-\d+/g);
  return m ? m.join("/") : "";
}

export function comparePaths(pa?: string | null, pb?: string | null): number {
  const ka = pathKey(pa);
  const kb = pathKey(pb);
  if (ka && kb && ka !== kb) return ka < kb ? -1 : 1;
  return 0;
}

function compareThemes(
  a: string,
  b: string,
  pathA?: string | null,
  pathB?: string | null
): number {
  const byPath = comparePaths(pathA, pathB);
  if (byPath) return byPath;
  return compare(a, b);
}

/** Libellés uniques, ordre sommaire, préfixe XX- déjà retiré (filtre arrêts). */
export function uniqueThemeDisplayLabels(
  values: (string | undefined | null)[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of uniqueSorted(values)) {
    const label = displayLabel(raw) || raw;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

export function coursLabelsForEntry(entry: DictEntry): string[] {
  return splitCoursLinks(entry.cours || [])
    .chapitres.map((c) => (c.label || "").trim())
    .filter(Boolean);
}

export function collectDictionaryThemes(entries: DictEntry[]): string[] {
  const byLabel = new Map<string, string>();
  entries.forEach((e) => {
    splitCoursLinks(e.cours || []).chapitres.forEach((c) => {
      const label = (c.label || "").trim();
      if (!label || byLabel.has(label)) return;
      byLabel.set(label, c.path || "");
    });
  });
  return [...byLabel.keys()].sort((a, b) =>
    compareThemes(a, b, byLabel.get(a), byLabel.get(b))
  );
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
          path: c.path,
        });
      }
    });
    if (!labels.length) return;
    [termKey(entry.term), termKey(entry.id)].forEach((k) => {
      if (k) byTerm.set(k, labels);
    });
  });

  const catalog = [...catalogMap.values()].sort((a, b) =>
    compareThemes(a.label, b.label, a.path, b.path)
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
