# FERNOTECH ECO-TRACK

Application web mobile-first en français pour tracer la collecte et la
transformation de plastique en balais.

## Stack

- Next.js App Router et TypeScript
- Tailwind CSS
- PostgreSQL sur Neon (Vercel Marketplace), avec Drizzle ORM
- Auth.js (identifiant/mot de passe, sessions JWT et rôles)
- Vitest pour tester les permissions et les règles sensibles
- Recharts sera ajouté avec le tableau de bord complet.
- La configuration de shadcn/ui est prête; ses composants seront ajoutés au
  fil des écrans.

## Developpement local

Prérequis : Node.js 20.19 ou plus récent.

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Commandes disponibles actuellement :

```bash
npm run lint
npm run build
npm test
npm run db:generate
npm run db:migrate
npm run admin:create
```

## Authentification et base de données

L'application utilise Auth.js avec un identifiant et un mot de passe haché
(bcrypt), des sessions JWT et quatre rôles. Les comptes et les journaux d'audit
sont stockés dans PostgreSQL sur Neon.

### Préparer un environnement local ou de production

1. Lier ce dossier au projet Vercel `fernotech` si ce n'est pas déjà fait :

   ```bash
   npx vercel link
   ```

2. Générer un secret Auth.js :

   ```bash
   npx auth secret
   ```

   Ajoutez la valeur générée à **Vercel → fernotech → Settings → Environment
   Variables** sous le nom `AUTH_SECRET`, pour Production, Preview et
   Development. Ne la partagez pas et ne la commitez pas.

3. Récupérer les variables de la base Neon et le secret depuis Vercel :

   ```bash
   npx vercel env pull .env.local --environment production
   ```

   `.env.local` est ignoré par Git. Ne le partagez pas. Après ajout/modification
   des variables Vercel, redéployez l'application.

4. Créer les tables et le premier administrateur dans la base Neon connectée :

   ```bash
   npm run db:migrate
   npm run admin:create
   ```

   La commande d'administration ne fonctionne que lorsque la table `users`
   est vide. Elle demande l'identifiant et le nom, puis saisit le mot de passe
   sans l'afficher. Le mot de passe est haché avant son enregistrement.

L'administrateur peut ensuite créer les comptes de l'équipe dans
`/utilisateurs`, attribuer leurs rôles et désactiver les comptes. Le dernier
administrateur actif ne peut pas être supprimé par erreur.

### Rôles

- **Administrateur** : toutes les autorisations.
- **Responsable d'atelier** : collecteurs, livraisons, tri, production et stocks.
- **Commercial / Caissier** : ventes et lecture du stock de produits finis.
- **Lecteur** : tableau de bord uniquement.

Les permissions sont contrôlées dans les fonctions serveur, même lorsqu'une
page ou une action est appelée directement.

## Module Collecteurs

Les rôles Administrateur et Responsable d’atelier peuvent ouvrir
`/collecteurs` depuis le tableau de bord. Ils peuvent créer et modifier une
fiche (nom, type, téléphone, zone et notes), puis activer ou désactiver le
collecteur. Les fiches ne sont pas supprimées afin de préserver l’historique.

Un apport reçu est associé à un collecteur et conserve sa date, son point de
collecte, son type de plastique et son poids. Les totaux et le classement sont
calculés depuis les livraisons enregistrées; le taux d’acceptation repose sur
les poids confirmés à l’étape de tri. Un apport encore « reçu » n’alimente pas
le stock : il faudra l’accepter au tri avant de créer un mouvement de matière.
Les créations et modifications sont consignées avec l’auteur dans
`audit_logs`.

## Module Tri et stock matière

Les rôles Administrateur et Responsable d’atelier accèdent à `/tri`. Le type
de plastique est saisi librement lors de l’enregistrement d’un apport (PET,
PEHD, sachets, autres ou toute nouvelle catégorie). Pour chaque apport reçu,
le poids accepté et rejeté doit totaliser exactement le poids reçu, au gramme
près; tout rejet exige un motif.

Le tri et l’intégration sont deux étapes explicites. L’intégration du poids
accepté, la clôture de l’apport et l’écriture de l’audit sont atomiques. Le
stock disponible est calculé depuis `material_stock_movements`, jamais saisi
manuellement. Un apport entièrement rejeté peut être clôturé sans créer
d’entrée de stock. Les mouvements restent rattachés à leur apport et à
l’utilisateur qui les a enregistrés.

## Module Production

Les rôles Administrateur et Responsable d’atelier peuvent ouvrir
`/production`. Un ordre de fabrication précise la date, le plastique utilisé,
les kilos de bandes préparées, le nombre de balais et les pertes. Le bilan
matière doit correspondre au gramme près; toute perte doit être motivée.

Le stock disponible par type de plastique est calculé depuis les mouvements.
Si le poids demandé dépasse le solde, la fabrication est refusée. L’ordre, la
sortie de matière, l’entrée des balais en stock fini et l’audit sont enregistrés
dans une transaction PostgreSQL. Chaque ordre conserve le coût matière/kg
saisi pour cette fabrication ainsi que la main-d’œuvre, l’énergie et les
accessoires; le coût total et le coût par balai en sont calculés.

## Principes du projet

- L'interface et les messages utilisateurs sont en français.
- La devise par defaut est le XAF (FCFA BEAC), configurable.
- Le stock est calcule a partir des mouvements; il n'est jamais saisi
  directement.
- Toute operation liee sur les donnees et les mouvements de stock doit etre
  executee dans une transaction PostgreSQL.
- Ne jamais placer de secret dans Git ou dans le code client.
- SQLite n'est pas utilise en production.

Consulter [CLAUDE.md](./CLAUDE.md) pour les conventions et les prochaines
commandes du projet.

## Déploiement

Le projet est déployé sur Vercel et utilise PostgreSQL via Neon. N'ajoutez
jamais `.env.local` ou de secret au dépôt.
