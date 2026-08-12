# Les Ressources Universitaires — app mobile (Expo)

Flipcards jurisprudence. Parcours : Accueil (Thèmes/Notions) → Étudier.

Les données sont récupérées en direct (HTTPS) depuis le site publié
(même source que le web, `src/data/config.ts` → CARDS_ENDPOINT) — une
connexion est nécessaire à chaque lancement, aucune donnée n'est
embarquée dans l'app. Étape actuelle : jeu de démo public
(`/demo/cards.json`). Le jeu complet (membres) arrivera avec
l'authentification SSO (compte web).

## Prérequis

Node.js 20+.

## Setup

```powershell
cd mobile
npm install
npm start
```

Ou : `.\Lancer.ps1`
