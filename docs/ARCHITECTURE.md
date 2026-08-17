# Architecture — Les Ressources Universitaires (site + app)

Document vivant. Le diagnostic daté du 17 août 2026 (sessions Claude Code
sur téléphone, divergences de branches, bug Considérant hors-ligne) est dans
[`DIAGNOSTIC.md`](./DIAGNOSTIC.md).

## Trois dépôts

| Dépôt | Rôle | Visibilité |
| --- | --- | --- |
| **ressources-universitaires** | Générateur du site (Notion → HTML/JSON, `build_assets.py`, packs scellés `app.enc`). Source de vérité du web. | **Privé** — inaccessible depuis l’environnement GitHub de `ru-mobile`. |
| **[ru-public](https://github.com/cabpechard-wq/ru-public)** | Site publié (GitHub Pages → `https://www.ressources-universitaires.fr`). Presque uniquement des déploiements `deploy: site depuis ressources-universitaires (privé)`. | Public |
| **[ru-mobile](https://github.com/cabpechard-wq/ru-mobile)** | App Expo (Android / iOS / preview web). Consomme les JSON (et parfois le HTML) de `ru-public`, plus un Worker d’auth. | Public |

Le contenu pédagogique (fiches, cours, dictionnaire, exercices) naît dans
Notion, est compilé dans le dépôt privé, puis poussé vers `ru-public`.
L’app ne duplique pas ce fonds : elle le télécharge.

## App mobile (ce dépôt)

- **Expo SDK 54** (`expo@^54.0.36`, React Native 0.81.5, React 19.1.0).
  Compatible Expo Go actuel. Ne pas monter en SDK 57 tant que le client
  Expo Go de test ne le supporte pas. Docs :
  https://docs.expo.dev/versions/v54.0.0/
- Identifiants Play : package `lru.droit_public_et_administratif`, slug
  `les-ressources-universitaires`.
- Auth SSO : Worker `https://flipcards-auth.cab-pechard.workers.dev`
  (même compte que le site). Token dans SecureStore (natif) /
  `localStorage` (preview web).

### Écrans (branche la plus complète)

La branche **`claude/google-play-first-publish-qrs8mu`** (versionCode 6)
est en avance sur la branche par défaut
`claude/ru-mobile-strategy-0j8lp7`. C’est elle qui reflète l’app
installée / testée récemment. Elle ajoute notamment :

| Hub (comme le site) | Sections |
| --- | --- |
| Cours magistral | Manuel (`/manuel`), Chronologie |
| Bibliothèque | Dictionnaire, **Fiches d’arrêts** (`/arrets`) |
| Salle de TD | Flipcards Grands arrêts + Grandes notions, Relations (Relier) idem, Enchaînements (chrono)logiques |

Sur la branche par défaut, l’accueil est encore un écran Flipcards unique ;
les fiches d’arrêts n’existent que comme page Chronologie
(`app/chronologie/[id].tsx`) **sans Considérant**.

### Sources de données

Toutes les URLs sont dans `src/data/config.ts` (`SITE_BASE_URL`).

| Fonds | Démo (anonyme) | Membre | Notes |
| --- | --- | --- | --- |
| Flipcards (arrêts) | `/demo/cards.json` | Worker `/api/content/flipcards?format=json` | Champ `considerant` présent |
| Relier (arrêts) | `/demo-relier/cards.json` | Worker `/api/content/relier?format=json` | |
| Flipcards / Relier notions | JSON embarqué `assets/demo/` (Play) | Worker `flipcards-dico` / `relier-dico` | `demo-flipcards-dico/cards.json` **n’existe pas** encore sur le site (404) |
| Enchaînements | `/demo-enchainements-logiques/data/chronology-decisions-demo.json` | `/enchainements-logiques/data/chronology-decisions.json` | Pas de pack Worker ; JSON public non répertorié |
| Chronologie / Fiches | même démo Enchaînements | `/chronologie/data/chronology-decisions.json` (~3,3 Mo, 993 décisions) | **Pas de champ `considerant`** |
| Dictionnaire | `/dictionnaire/entries.json` | identique (public) | |
| Manuel | `/manuel/chapters.json` | identique (public) | |
| Exercices par chapitre | `/manuel/exercices.json` | identique (public) | `{ "DP-110": { title, jurisprudence[], notions[] } }` |

CORS : `Access-Control-Allow-Origin: *` sur les JSON et le HTML du site.
Cache GitHub Pages : `max-age=600` (sauf chemins membres `_headers` en
`no-store` : `/flipcards/*`, `/relier/*`, `/chronologie/*`, etc.).

Il n’y a **pas de cache applicatif persistant** (pas d’AsyncStorage des
fonds). Hors-ligne, seuls survivent : l’état React en mémoire, le token
SSO, et éventuellement le cache HTTP du système.

## Fiche d’arrêt : où vit chaque champ

```
Notion (Jurisprudence)
        │
        ▼
ressources-universitaires (générateur)
        │
        ├─► ru-public/arrets/<slug>/index.html
        │     Objet, Portée, <blockquote> Considérant, Faits, Enjeu, Solution, Perspective
        │
        ├─► ru-public/chronologie/data/chronology-decisions.json
        │     Objet, Portée, Faits, Enjeu, Solution, Perspective
        │     PAS de considerant
        │
        └─► Flipcards cards.json (démo publique / pack membre Worker)
              Objet, Portée, considerant, + recto/verso
              sous-ensemble pédagogique, pas les 993 fiches
```

Conséquence : ouvrir une fiche dans l’app affiche le corps depuis la
Chronologie (déjà en mémoire) et **rattrape le Considérant** soit dans
le pack Flipcards, soit par un `fetch` HTML de
`/arrets/<slug>/`. Détail et bug hors-ligne : [`DIAGNOSTIC.md`](./DIAGNOSTIC.md).

## Liens « exercices de ce cours »

Le site injecte en bas de chaque page de chapitre deux blocs :

1. **Apprendre la jurisprudence** → Flipcards / Relations / Enchaînements
   avec `?cours=DP-XXX`.
2. **Apprendre les notions** → Flipcards-dico / Relier-dico, même paramètre.

Le filtre lit `manuel/exercices.json` (noms d’arrêts / de notions liés
dans Notion). Côté web, Enchaînements l’applique (fonds **membre**
uniquement, pas la démo). Flipcards et Relier sont des `app.enc` scellés
: le filtrage `?cours=` n’est actif que si le générateur privé a
recompilé le pack avec ce code.

Côté app, `ManuelProvider` charge `exercices.json` en best-effort.
`refForChapterId("dp-000-dp-100-dp-110")` → `"DP-110"`.

## Règle de contribution

1. Une seule branche « canonique » à la fois (aujourd’hui : fusionner
   `claude/google-play-first-publish-qrs8mu` dans la branche par défaut
   avant d’empiler du nouveau travail).
2. Ne pas patcher `ru-public` à la main pour du contenu généré : ça se
   fait écraser au prochain `deploy:` depuis le privé (incident du 14/08 :
   `chapters.json` / `entries.json` disparus).
3. Tout champ affiché hors-ligne doit vivre dans le JSON déjà chargé,
   pas dans un second `fetch` au tap.
