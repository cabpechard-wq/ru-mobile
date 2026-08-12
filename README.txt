# Les Ressources Universitaires — app mobile (Expo)

Même structure que le site : Cours magistral, Bibliothèque universitaire,
Salle de TD (Flipcards / Relations / Enchaînements).

Les données sont récupérées en direct (HTTPS) depuis le site publié
(`src/data/config.ts`) — connexion nécessaire à chaque lancement pour les
fonds principaux. Démo publique sans compte ; contenu membre via SSO
(mêmes identifiants que le site).

Exception temporaire : démos « Grandes notions » (Flipcards / Relations)
extraites dans `assets/demo/` tant que `ru-public` n'expose pas encore
`demo-flipcards-dico/cards.json` et `demo-relier-dico/cards.json`.

## Prérequis

Node.js 20+. Expo Go compatible SDK 54.

## Setup

```bash
npm install
npm start
```

Ou : `.\Lancer.ps1` / `.\Lancer.bat`
