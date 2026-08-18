/** Tri FR : É comme E, À comme A (comme `dico-cours-themes` / site PR #16). */
export function sortFr(a: string, b: string): number {
  return String(a).localeCompare(String(b), "fr", { sensitivity: "base" });
}

export function uniqueSortedFr(values: (string | undefined | null)[]): string[] {
  return [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))].sort(
    sortFr
  );
}
