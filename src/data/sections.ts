export const HUB = {
  cours: "Cours magistral",
  bibliotheque: "Bibliothèque universitaire",
  td: "Travaux dirigés",
} as const;

/**
 * Fil d'Ariane aligné site (PR ru-public #10 / #13) :
 * section choisie, sans Accueil.
 */
export const SECTION = {
  manuel: "Cours de Droit public et administratif",
  chronologie: "Chronologie de la jurisprudence administrative",
  dictionnaire: "Dictionnaire",
  arrets: "Fiches d'arrêts et de décisions",
  flipcards: "Flipcards",
  flipcardsArrets: "Grands arrêts",
  flipcardsNotions: "Grandes notions",
  relations: "Relations",
  relationsArrets: "Grands arrêts",
  relationsNotions: "Grandes notions",
  enchainements: "Enchaînements (chrono)logiques",
  login: "Connexion",
} as const;

export const TRAIL = {
  manuel: [HUB.cours, SECTION.manuel],
  chronologie: [HUB.cours, SECTION.chronologie],
  dictionnaire: [HUB.bibliotheque, SECTION.dictionnaire],
  arrets: [HUB.bibliotheque, SECTION.arrets],
  flipcardsArrets: [HUB.td, SECTION.flipcards, SECTION.flipcardsArrets],
  flipcardsNotions: [HUB.td, SECTION.flipcards, SECTION.flipcardsNotions],
  relationsArrets: [HUB.td, SECTION.relations, SECTION.relationsArrets],
  relationsNotions: [HUB.td, SECTION.relations, SECTION.relationsNotions],
  enchainements: [HUB.td, SECTION.enchainements],
  login: [SECTION.login],
} as const;
