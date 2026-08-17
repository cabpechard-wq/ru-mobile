# Diagnostic — 17 août 2026

Premier temps demandé après les sessions Claude Code depuis un téléphone :
état des trois dépôts, causes du « bordel », bug **Considérant de principe**
en mode avion, et statut des **liens d’exercices filtrés** en bas des pages
de cours. **Aucun correctif applicatif dans ce passage** — documentation
seulement.

Périmètre inspecté :

- `ru-mobile` (ce dépôt), toutes les branches distantes et les PR GitHub ;
- `ru-public` (clone + site live `www.ressources-universitaires.fr`) ;
- `ressources-universitaires` : **dépôt privé, non clonable** avec le jeton
  de cet environnement (seuls `ru-mobile` et `ru-public` sont visibles).
  Les constats sur le générateur s’appuient sur l’artefact publié et sur
  les messages de commit.

## 1. Synthèse

Le téléphone n’a pas « cassé » un fichier au hasard. Il a **empilé des
lignes de travail parallèles** (Cursor desktop, Claude Code mobile, PRs
non fusionnées) sur une branche par défaut qui n’est plus celle que l’app
Play Store / Expo Go utilise.

| Constat | Gravité | Où |
| --- | --- | --- |
| Branche par défaut `claude/ru-mobile-strategy-0j8lp7` **en retard de 29 commits** sur `claude/google-play-first-publish-qrs8mu` (versionCode 6, fiches `/arrets`, SDK 54 documenté, liens exercices directs) | Critique (gouvernance) | `ru-mobile` |
| **Considérant absent hors-ligne** : le champ n’est pas dans le JSON Chronologie (0/993). L’app le rattrape via Flipcards (sous-ensemble) puis `fetch` HTML `/arrets/<slug>/`. En mode avion ce `fetch` échoue → le bloc disparaît, le reste de la fiche (déjà en mémoire) s’affiche. | Bug produit, reproduit | App Play (`considerant.ts`) + `ru-public` |
| Liens exercices **présents sur le site** (26 chapitres, `manuel/exercices.json`, HTML en bas de page). Filtre JS **Enchaînements membre : oui** ; démo Enchaînements : **non**. Flipcards/Relier : packs `app.enc` scellés, régénération privée requise. | Fonctionnel côté HTML ; filtre JS partiel | `ru-public` |
| App : jurisprudence filtrée livrée (PR #5 + suite Play). **Notions** : boutons encore inactifs sur Play ; absents sur la branche par défaut. | Écart site / app | `ru-mobile` |
| Incident 14/08 : un `deploy:` du privé a **écrasé** `manuel/chapters.json` et `dictionnaire/entries.json` (ajoutés à la main, hors générateur) → Cours/Dico mobile en 404. Restauré depuis l’historique. | Dette générateur | `ru-public` + privé |
| `AGENTS.md` de la branche par défaut pointe encore vers **Expo SDK 57** alors que `package.json` est en **54** (rétrogradé pour Expo Go). | Piège agents | `ru-mobile` |

## 2. Carte des dépôts

Voir aussi [`ARCHITECTURE.md`](./ARCHITECTURE.md).

```
Notion ──► ressources-universitaires (privé, générateur)
                 │  git push / deploy
                 ▼
            ru-public  ──GitHub Pages──►  www.ressources-universitaires.fr
                 │  JSON + HTML
                 ▼
            ru-mobile  (+ Worker flipcards-auth pour packs membres)
```

`ru-public` n’est pas un dépôt d’application : `main` est une suite de
commits `deploy: site depuis ressources-universitaires (privé)`
(dernier : `ebcb110`, 16 août 2026 17:13 UTC, 993 fiches HTML, JSON
Chronologie généré à `2026-08-16T17:13:20Z`).

Exceptions notables, faites **dans** `ru-public` plutôt que via le
générateur :

- 12/08 — publication des JSON mobile (démo Flipcards/Relier, CORS,
  `chapters.json`, `entries.json`) sur `claude/ru-mobile-strategy-0j8lp7` ;
- 14/08 — restauration d’urgence de `chapters.json` / `entries.json` ;
- 15/08 — `d1eebc1e` (Claude) : liens exercices + `manuel/exercices.json`
  + filtre Enchaînements, branche
  `claude/sourcing-architecture-json-krsw9b`.

Ces patchs directs sont fragiles : le déploiement du 14/08 l’a déjà
prouvé.

## 3. `ru-mobile` : pourquoi ça a l’air en bordel

### 3.1 Branche par défaut ≠ code le plus avancé

La branche GitHub par défaut est `claude/ru-mobile-strategy-0j8lp7`
(HEAD au moment du diagnostic : `b9bd32b`, merge de la PR #5).

`origin/claude/google-play-first-publish-qrs8mu` est **29 commits en
avance, 0 en retard**. C’est la ligne Play Store / Claude mobile. Elle
contient notamment :

- refonte Fiches d’arrêts (`app/arrets/`, lignée à 6 niveaux) ;
- restauration du Considérant (`60d3589`, `src/data/considerant.ts`) ;
- fallback JSON embarqué si le réseau renvoie du HTML (`6b09d45`) ;
- workflow EAS Android depuis le téléphone ;
- liens exercices, puis démarrage **direct** Relier / Enchaînements
  (`a4179f0`) ;
- `versionCode` Android **6**.

Un agent (ou un humain) qui clone « le dépôt » travaille donc sur une
app **sans écran Fiches d’arrêts**, alors que le téléphone teste l’autre
ligne.

### 3.2 PR ouvertes qui se recouvrent

| # | Titre | Branche | État | Remarque |
| --- | --- | --- | --- | --- |
| 6 | Dictionnaire → Manuel : liens Cours navigables | `claude/google-play-first-publish-qrs8mu` | **OPEN** (titre obsolète : la branche contient toute la refonte) | Cible `claude/ru-mobile-strategy-0j8lp7`, fusionnable |
| 5 | Liens d’exercices filtrés par chapitre | `claude/exercices-liens-cours` | MERGED 15/08 | Déjà dans la branche par défaut |
| 4 | versionCode Android | `cursor/play-package-name-9362` | DRAFT | Dépassée (Play est à 6) |
| 3 | EAS npm ci / lockfile SDK 54 | `cursor/eas-npm-ci-lockfile-9362` | MERGED | |
| 2 | Sept corrections majeures | `cursor/sept-corrections-f9c8` | DRAFT | **Déjà fusionnée dans Play** (`55bb01d`) ; 18 commits d’avance / 12 de retard vs défaut |
| 1 | Liens Dico → Manuel + docs SDK 54 | `cursor/dict-manuel-links-sdk54-f9c8` | DRAFT | Idem, déjà dans Play |

Autres branches mortes ou partielles :
`claude/publish-app-github-ut8m5i`,
`claude/ru-mobile-google-play-publish-m31wch`,
plusieurs `cursor/eas-*`.

### 3.3 Deux outils, deux styles de commits

- **Cursor Agent** (12–13/08) : refonte fiches, Considérant, SDK 54,
  identifiants Play.
- **Claude** (`noreply@anthropic.com`, 14–16/08, sessions téléphone) :
  fusion Play ← fiches, versionCode 3→6, workflow EAS, liens cours,
  démarrage direct Relier/Enchaînements. Trailers
  `Claude-Session: https://claude.ai/code/session_…`.

Les fusions portent des marqueurs de conflits (`package-lock.json`,
`ManuelChapterView.tsx`, `config.ts`) — résolus, mais typiques d’un
travail sans branche unique.

### 3.4 Expo : 57 dans AGENTS.md, 54 dans le code

`package.json` (toutes les branches utiles) : `expo@^54.0.36`.
Commit `d990fae` : « Rétrograde le projet en Expo SDK 54 ».

La branche par défaut gardait `AGENTS.md` = « lisez les docs v57 ».
La branche Play l’avait déjà corrigé. Ce PR aligne la doc par défaut
sur le SDK réellement installé.

## 4. Bug : Considérant de principe en mode avion

### 4.1 Ce que vous voyez

Fiche d’arrêt ouverte après un usage en ligne, puis **mode avion** :
Objet, Portée, Faits, Enjeu, Solution, Perspective, liens, lignée —
tout y est. Le **Considérant de principe** manque (le bloc entier,
pas un texte vide : le composant ne rend rien sans texte).

### 4.2 Pourquoi le reste charge encore

Les 993 fiches « corps » viennent de
`/chronologie/data/chronology-decisions.json` (ou de la démo), chargé
une fois par `ChronologieProvider` et **gardé en mémoire React**. Couper
le réseau ne l’efface pas tant que l’app n’est pas tuée.

Comptage sur `ru-public` au 16/08 :

| Champ | Chronologie JSON (993) | Fiches HTML (993) | Démo Flipcards (8) |
| --- | --- | --- | --- |
| objet, portee | 993 | 993 | 8 |
| faits / enjeu / solution / perspective | 987–992 | dans `<aside class="fiche-decision">` | 8 |
| **considerant** | **0** | **843** `<blockquote>` | **8** |

Le générateur n’écrit tout simplement pas le Considérant dans le JSON
Chronologie. C’est documenté dans le commit `60d3589` :
« Le Considérant n’est pas dans la chronologie ».

### 4.3 Comment l’app rattrape le Considérant (branche Play)

Fichier `src/data/considerant.ts`, écran `app/arrets/[id].tsx` :

1. **Flipcards** déjà chargées → matching élargi (`id`, `slugFiche`,
   nom normalisé ↔ `recto`). Si `card.considerant` est non vide, on
   l’affiche. Ça couvre le **jeu Flipcards**, pas les ~995 fiches.
2. Sinon **`fetch(SITE_BASE_URL + "/arrets/" + slug + "/")`**, regex
   sur le premier `<blockquote><p>…</p></blockquote>`.

En mode avion : (1) ne suffit que pour les cartes du pack chargé et
correctement appariées ; (2) échoue (`catch` → `undefined`). Le
`HighlightSection` avec `tone="accent"` n’est alors pas monté.

Sur la **branche par défaut**, il n’y a même pas cet écran : la « fiche »
Chronologie (`app/chronologie/[id].tsx`) n’a pas de champ Considérant
du tout. Si le téléphone tourne un build Play, c’est bien le scénario
ci-dessus.

### 4.4 Correctif (17 août, second temps)

L’app hydrate `Decision.considerant` **au chargement** de la Chronologie,
depuis `assets/considerants.json` (843 slugs extraits des blockquotes HTML)
éventuellement fusionné avec `/chronologie/data/considerants.json` si le
site le publie, puis le pack Flipcards.

Ouvrir une fiche en mode avion n’effectue plus de `fetch` HTML : le texte
est déjà sur la décision en mémoire, comme Objet / Portée.

Les 150 fiches sans `<blockquote>` n’ont toujours pas de Considérant
(ni sur le site). Le générateur privé devrait à terme écrire le champ
dans `chronology-decisions.json` pour supprimer l’index parallèle.

## 5. Liens d’exercices filtrés par chapitre

Intention (confirmée par les commits Claude des 15–16/08) : en bas de
**chaque page de cours**, des liens vers Flipcards / Relier /
Enchaînements **déjà filtrés** sur les arrêts (et notions) liés au
chapitre dans Notion.

### 5.1 Site (`ru-public` / live)

- Fichier `manuel/exercices.json` : **26** clés `DP-XXX`
  (24 avec jurisprudence, 26 avec notions). Live :
  `last-modified: Sun, 16 Aug 2026 17:14:41 GMT`, CORS `*`.
- HTML : section `manuel-exercises` sur les pages chapitre, ex. DP-110
  « Apprendre la jurisprudence (6) » + « Apprendre les notions (25) ».
- Enchaînements (`enchainements-logiques/assets/enchainements.js`) :
  lit `?cours=`, charge `exercices.json`, verrouille le lot
  (`coursFilter` sur `d.nom`). **Ignoré si `config.demo`** — la démo
  publique n’applique pas le filtre.
- Flipcards / Relier / *-dico : `app.enc` chiffrés. Le commit
  `d1eebc1e` dit explicitement que le JS de filtre n’était **pas** dans
  le pack (clé de scellement absente de la session) et devait être
  régénéré par `build_assets.py` sur la branche privée
  `claude/exercices-filtres-par-chapitre-manuel`. Impossible de le
  vérifier ici dans le binaire. **À valider à la main** : ouvrir
  `/flipcards/?cours=DP-110` connecté membre et confirmer que le fonds
  est restreint.

### 5.2 App

| Branche | Jurisprudence | Notions |
| --- | --- | --- |
| Défaut (`…-strategy-…`, PR #5) | Flipcards démarre la session ; Relier / Enchaînements vont à l’écran de config avec `?cours=` | absent |
| Play (`…-first-publish-…`) | les **trois** démarrent l’exercice filtré (`a4179f0`) | libellés présents, **boutons inactifs** (dette « filtrage par thème plus tard ») |

Le site, lui, a déjà les liens notions **actifs** vers
`flipcards-dico/?cours=` et `relier-dico/?cours=`.

`refForChapterId` dérive `DP-110` depuis `dp-000-dp-100-dp-110`. Les
chapitres racines type `DP-400` / `DP-500` (notions seulement) sont
dans `exercices.json` ; l’app Play n’expose pas encore ces actions.

### 5.3 Écarts connus déjà notés par Claude (15/08)

- DP-520 était absent de l’arbre publié puis **réapparu** dans le
  deploy du 16/08 (`manuel/dp-000/dp-500/dp-520/`).
- Matching jurisprudence = **nom exact** (`CE, 1903, Terrier`). Un
  écart d’orthographe Notion / Flipcards `recto` / Chronologie `nom`
  fait tomber le filtre à 0 carte (la PR #5 a validé DP-110 = 6/6).

## 6. Autres dettes vues en passant

- **Pas de cache hors-ligne** des fonds lourds (Chronologie 3,3 Mo,
  Manuel 1,5 Mo). Mode avion « après usage » ≠ mode avion « après kill ».
- **Grandes notions démo** : `assets/demo/*.json` dans l’app Play parce
  que `https://www.ressources-universitaires.fr/demo-flipcards-dico/cards.json`
  répond **404** (le dossier n’a que `index.html` + `robots.txt`).
- **Enchaînements membre** : JSON public sous
  `/enchainements-logiques/data/` — le login change l’URL, il ne
  s’authentifie pas. Commentaire assumé dans `config.ts`.
- **`chapters.json` / `entries.json` hors pipeline** (14/08). Tant que
  le générateur privé ne les émet pas, chaque deploy `site/**` peut
  recasser Cours et Dictionnaire mobile.
- **Worker CONTENT_PACKS** : Flipcards/Relier sont scellés ; Chronologie,
  Manuel, Dictionnaire, Enchaînements, `exercices.json` ne le sont pas.
- Builds EAS : historique de `versionCode` remote bloqué à 1, puis
  local 3→6 ; workflow GitHub Actions ajouté depuis le téléphone
  (install npm manquant au premier essai).

## 7. Second temps recommandé (hors de ce PR)

1. **Fusionner** `claude/google-play-first-publish-qrs8mu` dans la
   branche par défaut (PR #6, en mettant à jour titre/description) et
   fermer les DRAFT #1, #2, #4 devenus redondants.
2. **Porter `considerant` dans le JSON Chronologie** (privé) puis
   l’afficher depuis `Decision` sans fetch HTML.
3. **Valider / régénérer** les `app.enc` Flipcards & Relier avec le
   filtre `?cours=` ; aligner la démo Enchaînements (aujourd’hui skip).
4. Activer côté app les exercices **notions** (même `exercices.json`).
5. Intégrer `chapters.json` / `entries.json` / `exercices.json` au
   générateur pour qu’ils survivent aux deploys.
6. Décider d’un cache hors-ligne (même partiel) si le mode avion est
   un usage réel (train, bibliothèque).

## 8. Méthode de ce diagnostic

- Git : `ru-mobile` (log `--all`, `diff --stat` défaut…Play, `git grep`
  considerant / offline) ; `ru-public` (historique, PR, fichiers live).
- Comptages Python sur `chronology-decisions.json`, `demo/cards.json`,
  993 `arrets/*/index.html`, `manuel/exercices.json`.
- HTTP : en-têtes CORS/cache des JSON et d’une fiche Blanco ;
  404 `demo-flipcards-dico/cards.json`.
- GitHub : `gh pr list/view`, `gh repo list` (2 repos accessibles).
- Non lu : transcripts complets des cloud agents Cursor ; code source
  du générateur privé ; packs `app.enc` en clair.
