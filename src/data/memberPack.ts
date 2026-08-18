import { sortFr } from "./sortFr";

/** Parse la réponse Worker : JSON (`?format=json`) ou HTML membre (`const DATA = […]`). */

function decodeHtml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractJsArray(source: string, marker: string): unknown[] | null {
  const idx = source.indexOf(marker);
  if (idx < 0) return null;
  const start = source.indexOf("[", idx);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(source.slice(start, i + 1));
          return Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

type ChipCatalog = {
  themes: string[];
  notions: string[];
  themeColors: Record<string, string>;
  notionColors: Record<string, string>;
};

function chipsFromHtml(html: string): ChipCatalog {
  const themes: string[] = [];
  const notions: string[] = [];
  const themeColors: Record<string, string> = {};
  const notionColors: Record<string, string> = {};
  const re =
    /data-group="(theme|notion)"\s+data-value="([^"]*)"\s+data-color="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const group = m[1];
    const value = decodeHtml(m[2]).trim();
    const color = m[3];
    if (!value) continue;
    if (group === "theme") {
      if (!themeColors[value]) themes.push(value);
      themeColors[value] = color;
    } else {
      if (!notionColors[value]) notions.push(value);
      notionColors[value] = color;
    }
  }
  return { themes, notions, themeColors, notionColors };
}

function uniqueLabels(cards: Record<string, unknown>[], key: string): string[] {
  const set = new Set<string>();
  cards.forEach((c) => {
    const arr = c[key];
    if (!Array.isArray(arr)) return;
    arr.forEach((v) => {
      const s = String(v || "").trim();
      if (s) set.add(s);
    });
  });
  return [...set].sort(sortFr);
}

function normalizeCardRows(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((raw, i) => {
    const c = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >;
    const recto = String(c.recto || "");
    const verso = String(c.verso || c.objet || "");
    const objet = String(c.objet || c.verso || "");
    return {
      ...c,
      id: c.id || recto || String(i),
      recto,
      verso,
      objet,
      themes: Array.isArray(c.themes) ? c.themes : [],
      notions: Array.isArray(c.notions) ? c.notions : [],
    };
  });
}

/**
 * Transforme le corps HTTP du Worker (JSON ou HTML scellé) en objet
 * consommable par Flipcards / Relier (`{ cards, classifiers }`) ou
 * Enchaînements (`{ decisions }`).
 */
export function parseWorkerPayload(text: string): unknown {
  const trimmed = (text || "").trim();
  if (!trimmed) throw new Error("Réponse vide du serveur.");

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error("Réponse JSON invalide.");
    }
  }

  if (!trimmed.startsWith("<")) {
    throw new Error("Réponse JSON invalide.");
  }

  const data = extractJsArray(trimmed, "const DATA");
  if (!data || !data.length) {
    throw new Error("Pack membre HTML sans données.");
  }

  const cards = normalizeCardRows(data);
  const chips = chipsFromHtml(trimmed);
  const themes = chips.themes.length
    ? chips.themes
    : uniqueLabels(cards, "themes");
  const notions = chips.notions.length
    ? chips.notions
    : uniqueLabels(cards, "notions");

  return {
    kind: "member-html",
    count: cards.length,
    classifiers: { themes, notions, theme_field: "Thème", notions_field: "Notions" },
    classifier_colors: {
      themes: chips.themeColors,
      notions: chips.notionColors,
    },
    cards,
  };
}
