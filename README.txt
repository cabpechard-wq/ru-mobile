# Les Ressources Universitaires — app mobile (Expo)

Application Android / iOS (preview web) du site
https://www.ressources-universitaires.fr

Même structure pédagogique que le web : Cours magistral, Bibliothèque
universitaire, Salle de TD (Flipcards, Relations, Enchaînements).

Les données viennent en HTTPS du site publié (`src/data/config.ts`).
Démo publique sans compte ; contenu membre via SSO (mêmes identifiants
que le site, Worker `flipcards-auth`). Il n’y a pas de cache applicatif
des fonds : une connexion est nécessaire au lancement, et le mode avion
ne conserve que ce qui est déjà en mémoire (voir docs/DIAGNOSTIC.md).

Exception temporaire : démos « Grandes notions » (Flipcards / Relations)
extraites dans `assets/demo/` tant que `ru-public` n’expose pas encore
`demo-flipcards-dico/cards.json` et `demo-relier-dico/cards.json`.

## Prérequis

Node.js 20+. Expo Go compatible **SDK 54** (pas 57).

## Setup

```bash
npm install
npm start
```

Ou : `.\Lancer.ps1` / `.\Lancer.bat`

## Documentation

- `docs/ARCHITECTURE.md` — carte des trois dépôts et des JSON.
- `docs/DIAGNOSTIC.md` — diagnostic du 17 août 2026 (branches, bugs, liens exercices).

## Dépôts liés

- Site publié : https://github.com/cabpechard-wq/ru-public
- Générateur (privé) : ressources-universitaires — source de vérité du HTML/JSON.
