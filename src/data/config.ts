/**
 * Base du site publié (même source que le web).
 * Jeu de démo public, non authentifié.
 */
export const SITE_BASE_URL = "https://www.ressources-universitaires.fr";
export const CHECKOUT_URL = `${SITE_BASE_URL}/checkout/`;

export const DEMO_CARDS_ENDPOINT = `${SITE_BASE_URL}/demo/cards.json`;
export const DEMO_RELIER_ENDPOINT = `${SITE_BASE_URL}/demo-relier/cards.json`;
/**
 * Démo Chronologie / Enchaînements : même JSON (site PR #27,
 * `demo-chronologie/`). Hors connexion uniquement.
 */
export const DEMO_CHRONOLOGIE_ENDPOINT = `${SITE_BASE_URL}/demo-chronologie/data/chronology-decisions-demo.json`;
export const DEMO_ENCHAINEMENTS_ENDPOINT = DEMO_CHRONOLOGIE_ENDPOINT;

/**
 * Fonds jurisprudence membres — JSON public sur le site, chargé seulement
 * une fois connecté (pas de pack Worker). Même fichier pour Chronologie
 * et Enchaînements.
 */
export const FULL_CHRONOLOGIE_ENDPOINT = `${SITE_BASE_URL}/chronologie/data/chronology-decisions.json`;
export const MEMBER_ENCHAINEMENTS_ENDPOINT = FULL_CHRONOLOGIE_ENDPOINT;
/**
 * Index slug → Considérant, extrait des fiches HTML. Best-effort : l'app
 * embarque le même fichier (`assets/considerants.json`) si le réseau échoue
 * ou si le générateur privé n'a pas encore publié l'URL.
 */
export const CONSIDERANTS_ENDPOINT = `${SITE_BASE_URL}/chronologie/data/considerants.json`;

/**
 * Dictionnaire : contenu public sur le site (pas de pack Worker, pas
 * d'auth) — un seul endpoint, pas de distinction démo/membre.
 */
export const DICTIONNAIRE_ENDPOINT = `${SITE_BASE_URL}/dictionnaire/entries.json`;
export const DICTIONNAIRE_META_ENDPOINT = `${SITE_BASE_URL}/dictionnaire/entries-meta.json`;
export const CHRONOLOGIE_META_ENDPOINT = `${SITE_BASE_URL}/chronologie/data/chronology-meta.json`;

/**
 * Cours (ex-`manuel/`) : JSON d'index public. L'UI tronque hors session.
 */
export const MANUEL_ENDPOINT = `${SITE_BASE_URL}/cours/chapters.json`;

/**
 * Exercices liés par chapitre : {ref: {title, jurisprudence[], notions[]}}.
 */
export const MANUEL_EXERCISES_ENDPOINT = `${SITE_BASE_URL}/cours/exercices.json`;

/** Aperçu audio hors session (site PR #30) — lecture complète une fois connecté. */
export const TTS_PREVIEW_MS = 30_000;

/**
 * Worker d'auth — même compte que le site web (SSO). Endpoint JSON dédié
 * mobile (`?format=json` si le Worker le gère ; sinon HTML `const DATA`).
 */
export const AUTH_API_BASE_URL = "https://flipcards-auth.cab-pechard.workers.dev";
export const MEMBER_CARDS_ENDPOINT = `${AUTH_API_BASE_URL}/api/content/flipcards?format=json`;
export const MEMBER_RELIER_ENDPOINT = `${AUTH_API_BASE_URL}/api/content/relier?format=json`;
export const MEMBER_FLIPCARDS_DICO_ENDPOINT = `${AUTH_API_BASE_URL}/api/content/flipcards-dico?format=json`;
export const MEMBER_RELIER_DICO_ENDPOINT = `${AUTH_API_BASE_URL}/api/content/relier-dico?format=json`;

/**
 * Démos Grandes notions : pas encore de cards.json sur ru-public (données
 * encore embarquées dans le HTML du site). Les providers chargent donc un
 * JSON extrait dans assets/demo/ en mode anonyme, et le Worker une fois
 * connecté.
 */

export const PAGE_TITLE = "Grands arrêts du droit public et administratif";
export const PAGE_TITLE_NOTIONS = "Grandes notions du droit public et administratif";

/** Nombre de suggestions « au hasard » sous la carte Flipcards. */
export const ASIDE_RANDOM_COUNT = 3;
