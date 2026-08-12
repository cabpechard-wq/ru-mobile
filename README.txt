# Les Ressources Universitaires — app mobile (Expo)

Flipcards jurisprudence + exercices (Relier, Enchaînements) + registres Cours
(Manuel, Chronologie, Dictionnaire). Parcours : Accueil → Exercices / Cours /
Étudier.

Les données sont récupérées en direct (HTTPS) depuis le site publié
(`src/data/config.ts`) — connexion nécessaire à chaque lancement, aucune
donnée embarquée. Démo publique sans compte ; contenu membre via SSO
(mêmes identifiants que le site, Worker `/api/login` + Bearer).

## Prérequis

Node.js 20+. Expo Go compatible SDK 54.

## Setup

```bash
npm install
npm start
```

Ou : `.\Lancer.ps1` / `.\Lancer.bat`
