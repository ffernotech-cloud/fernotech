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
