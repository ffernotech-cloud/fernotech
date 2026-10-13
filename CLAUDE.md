# FERNOTECH ECO-TRACK — consignes du projet

## Objectif

Application en français pour tracer la collecte, le tri, les stocks, la
production, les ventes et les règlements de plastique transformé en balais.
Interface mobile-first, boutons faciles à utiliser et formulaires courts.

## Stack

- Next.js avec App Router et TypeScript strict.
- Tailwind CSS et composants shadcn/ui.
- PostgreSQL hébergé sur Neon via Vercel Marketplace; Drizzle ORM et migrations
  versionnées.
- Auth.js avec identifiant et mot de passe haché.
- Recharts pour les graphiques, Vitest pour les calculs critiques.
- Deploiement Vercel; ne jamais utiliser SQLite en production.

## Règles métier non négociables

1. Le stock ne se saisit jamais directement. Le solde est la somme des
   mouvements de stock traces.
2. Seul le poids de plastique accepté au tri peut créer un mouvement d'entrée
   de matière.
3. Les operations liees (par exemple tri et entree en stock, ou vente et sortie
   de produits finis) doivent être dans une transaction de base de données.
4. La consommation de production et les ventes ne peuvent pas faire passer le
   stock disponible sous zéro. Une consommation supérieure au stock doit être
   refusée explicitement.
5. Toute modification de stock doit être reliée à une opération d'origine ou à
   un ajustement motivé et audité.
6. Le bilan matiere d'une production doit verifier les kg utilises, les bandes
   préparées et les pertes selon les règles métier validées.
7. Les droits sont vérifiés côté serveur pour chaque action protégée.
8. Les opérations sensibles journalisent l'auteur, l'action, l'objet et la date.
9. Toute erreur utilisateur est expliquée en français; ne pas masquer une
   erreur sous un resultat de succes.

## Conventions

- Code, noms de fichiers et identifiants techniques en anglais; interface,
  validations visibles et documentation utilisateur en français.
- Utiliser TypeScript strict, des types explicites et des validations Zod aux
  limites des formulaires et des API.
- Préférer les composants serveur Next.js; ajouter `"use client"` uniquement
  lorsqu'une interaction navigateur le demande.
- Garder les calculs metier dans des fonctions pures testables avec Vitest.
- Afficher les dates en JJ/MM/AAAA, les poids en kg et la devise configurable
  (XAF par défaut).
- Conserver les saisies de formulaire si l'enregistrement echoue.
- Ne jamais commiter de secrets, de données personnelles réelles ou de fichier
  `.env`.
- Les migrations de base sont versionnées; les changements de schéma passent
  par Drizzle.

## Commandes

Commandes disponibles a l'initialisation :

```bash
npm run dev
npm run lint
npm run build
```

Quand les outils correspondants seront ajoutés aux étapes suivantes :

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run test
```

Avant de terminer une étape, lancer au minimum le lint, le build et les tests
pertinents disponibles. Ne pas annoncer une commande comme disponible tant
qu'elle n'est pas definie dans `package.json`.
