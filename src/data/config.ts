/**
 * Base du site publié (même source que le web — voir ARCHITECTURE mobile).
 * Jeu de démo public, non authentifié.
 */
export const SITE_BASE_URL = "https://www.ressources-universitaires.fr";
export const DEMO_CARDS_ENDPOINT = `${SITE_BASE_URL}/demo/cards.json`;

/**
 * Worker d'auth — même compte que le site web (SSO). Endpoint JSON dédié
 * mobile (`?format=json`), même session/entitlement que le web.
 */
export const AUTH_API_BASE_URL = "https://flipcards-auth.cab-pechard.workers.dev";
export const MEMBER_CARDS_ENDPOINT = `${AUTH_API_BASE_URL}/api/content/flipcards?format=json`;

export const PAGE_TITLE = "Grands arrêts du droit public et administratif";
