/**
 * Base du site publié (même source que le web — voir ARCHITECTURE mobile).
 * Jeu de démo public, non authentifié.
 */
export const SITE_BASE_URL = "https://www.ressources-universitaires.fr";
export const DEMO_CARDS_ENDPOINT = `${SITE_BASE_URL}/demo/cards.json`;
export const DEMO_RELIER_ENDPOINT = `${SITE_BASE_URL}/demo-relier/cards.json`;
export const DEMO_ENCHAINEMENTS_ENDPOINT = `${SITE_BASE_URL}/demo-enchainements-logiques/data/chronology-decisions-demo.json`;
/**
 * Pas de Worker ici : contrairement à flipcards/relier, ce fonds n'est pas
 * scellé (pas d'entrée dans CONTENT_PACKS côté Worker) — juste un JSON
 * public non répertorié, comme sur le site. Le login ne fait que
 * choisir quelle URL utiliser, il n'apporte pas de contrôle d'accès
 * supplémentaire ici (fidèle à la posture actuelle du site).
 */
export const MEMBER_ENCHAINEMENTS_ENDPOINT = `${SITE_BASE_URL}/enchainements-logiques/data/chronology-decisions.json`;

/**
 * Chronologie (registre Cours, pas Exercices) : même jeu de démo que les
 * Enchaînements (identique en contenu), fonds complet à l'emplacement
 * canonique /chronologie/ (995 décisions, ~3,3 Mo — chargement explicite
 * côté app, pas automatique).
 */
export const DEMO_CHRONOLOGIE_ENDPOINT = DEMO_ENCHAINEMENTS_ENDPOINT;
export const FULL_CHRONOLOGIE_ENDPOINT = `${SITE_BASE_URL}/chronologie/data/chronology-decisions.json`;

/**
 * Dictionnaire : contenu public sur le site (pas de pack Worker, pas
 * d'auth) — un seul endpoint, pas de distinction démo/membre.
 */
export const DICTIONNAIRE_ENDPOINT = `${SITE_BASE_URL}/dictionnaire/entries.json`;

/**
 * Manuel (Cours) : contenu public, comme le Dictionnaire — un seul
 * endpoint, chargé entièrement (1,5 Mo, léger comparé aux 3 Mo de la
 * Chronologie complète, pas de bouton de chargement explicite).
 */
export const MANUEL_ENDPOINT = `${SITE_BASE_URL}/manuel/chapters.json`;

/**
 * Exercices liés par chapitre (relations Notion Jurisprudence/Index portées
 * par le manuel) : {ref: {title, jurisprudence: [...noms], notions: [...noms]}}.
 * Même fichier que celui consommé côté web pour filtrer Flipcards/Relier/
 * Enchaînements sur `?cours=DP-XXX`.
 */
export const MANUEL_EXERCISES_ENDPOINT = `${SITE_BASE_URL}/manuel/exercices.json`;

/**
 * Worker d'auth — même compte que le site web (SSO). Endpoint JSON dédié
 * mobile (`?format=json`), même session/entitlement que le web.
 */
export const AUTH_API_BASE_URL = "https://flipcards-auth.cab-pechard.workers.dev";
export const MEMBER_CARDS_ENDPOINT = `${AUTH_API_BASE_URL}/api/content/flipcards?format=json`;
export const MEMBER_RELIER_ENDPOINT = `${AUTH_API_BASE_URL}/api/content/relier?format=json`;

export const PAGE_TITLE = "Grands arrêts du droit public et administratif";
