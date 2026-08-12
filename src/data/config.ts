/**
 * Base du site publié (même source que le web — voir ARCHITECTURE mobile).
 * Étape actuelle : jeu de démo public (`/demo/cards.json`, non authentifié).
 * Le jeu complet (membres) arrivera avec l'auth SSO (token du Worker
 * flipcards-auth), via un endpoint distinct côté Worker.
 */
export const SITE_BASE_URL = "https://www.ressources-universitaires.fr";
export const CARDS_ENDPOINT = `${SITE_BASE_URL}/demo/cards.json`;

export const PAGE_TITLE = "Grands arrêts du droit public et administratif";
