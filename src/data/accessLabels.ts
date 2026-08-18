export type HomeAccess = "public" | "preview" | "demo";

/** Pastilles d'accueil — HTML invité du site ; « Ouvrir → » une fois connecté. */
export function homeAccessLabel(
  kind: HomeAccess,
  isMember: boolean
): string {
  if (kind === "public") return "Accès libre";
  if (isMember) return "Ouvrir →";
  if (kind === "preview") return "Aperçu (accès membres)";
  return "Démonstration (accès membres)";
}
