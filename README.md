# FERNOTECH ECO-TRACK

Application web mobile-first en français pour tracer la collecte et la
transformation de plastique en balais.

## Stack

- Next.js App Router et TypeScript
- Tailwind CSS
- PostgreSQL sur Neon (Vercel Marketplace), avec Drizzle ORM
- Auth.js, Recharts et Vitest seront configurés dans les étapes suivantes.
- La configuration de shadcn/ui est prête; ses composants seront ajoutés au
  fil des écrans.

## Developpement local

Prerequis : Node.js 20.9 ou plus recent.

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Commandes disponibles actuellement :

```bash
npm run lint
npm run build
```

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

## Deploiement

Le projet sera deploye sur Vercel et utilisera PostgreSQL via Neon. La
configuration GitHub, les variables d'environnement et le premier deploiement
seront finalises lorsque les acces correspondants seront disponibles.
