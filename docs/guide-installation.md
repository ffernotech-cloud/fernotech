# Guide d’installation et d’exploitation

## Architecture

L’application utilise Next.js (App Router) avec TypeScript, PostgreSQL sur Neon,
Drizzle ORM et Auth.js. Vercel héberge l’application. Les données privées ne
sont pas mises en cache par le service worker PWA.

## Préparer un poste de développement

1. Installer Node.js 20.19 ou une version plus récente et Git.
2. Cloner le dépôt GitHub puis ouvrir le dossier du projet.
3. Installer les dépendances :

   ```bash
   npm install
   ```

4. Lier le projet Vercel et récupérer les variables d’environnement :

   ```bash
   npx vercel login
   npx vercel link --project fernotech
   npx vercel env pull .env.local --environment production
   ```

   `DATABASE_URL` doit pointer vers la base Neon et `AUTH_SECRET` doit être
   présent. Le fichier `.env.local` est privé et ne doit jamais être commité.
5. Appliquer les migrations si elles sont en attente, puis démarrer :

   ```bash
   npm run db:migrate
   npm run dev
   ```

   Ouvrir [http://localhost:3000](http://localhost:3000). L’administrateur
   existant gère les comptes et rôles depuis **Utilisateurs**.

## Déploiement

Les changements poussés sur la branche reliée à Vercel déclenchent le
déploiement. Vérifier les variables d’environnement pour Production, Preview et
Development avant de lancer un nouvel environnement. Après une migration de
schéma, lancer `npm run db:migrate` avec la bonne base Neon et vérifier le
déploiement dans Vercel.

## Mode hors ligne

Le service worker ne met pas en cache les pages privées ni leurs réponses API.
Il conserve uniquement l’espace de saisie statique. Les listes métier sont
chargées par une API protégée, puis conservées dans IndexedDB sur l’appareil.
La synchronisation repasse par l’API authentifiée et revalide les permissions,
les bilans matière et le stock au moment de l’écriture. Les opérations de tri,
d’intégration et de production restent transactionnelles.

Après déploiement, ouvrir une session Responsable d’atelier ou Administrateur,
visiter **Préparer l’espace hors ligne** une fois avec une connexion, puis
vérifier l’enregistrement local et la synchronisation sur un environnement
autorisé avant usage opérationnel. Les opérations financières restent en ligne.
Les données IndexedDB sont propres au navigateur et ne sont pas chiffrées par
l’application; protéger les appareils et ne pas partager le profil du navigateur.

## Fichiers de sauvegarde administrateur

Dans **Utilisateurs**, l’Administrateur peut télécharger l’archive complète
chiffrée. AES-256-GCM protège son contenu avec une phrase secrète d’au moins
12 caractères (PBKDF2-SHA256, 600 000 itérations). La perte de cette phrase rend
l’archive illisible. Ne conservez pas fichier et phrase au même endroit. Le
téléchargement couvre les tables de données, mais l’application ne restaure pas
directement cette archive; utilisez les fonctions de restauration Neon pour les
reprises de base de données.

## Vérifications avant livraison

```bash
npm run lint
npm test
npm run build
```

Ne jamais ajouter des identifiants, mots de passe ou `.env.local` au dépôt. Les
stocks sont calculés depuis les mouvements; ne pas modifier directement un solde
dans la base. Pour les procédures opérationnelles, consulter le
[guide utilisateur](./guide-utilisateur.md).
