# FERNOTECH ECO-TRACK — consignes du projet

## Objectif

Application en français pour tracer la collecte, le tri, les stocks, la
production, les ventes et les règlements de plastique transformé en plusieurs
produits finis. Le catalogue cible comprend Balai, Brosse, Brosse à laver avec
manche, File à linge et Pavé. Interface mobile-first, boutons faciles à
utiliser et formulaires courts.

Le schéma et les écrans actuellement en place sont encore centrés sur le balai.
L’évolution multi-produits validée et ses choix sont suivis dans
[docs/plan-multi-produits.md](./docs/plan-multi-produits.md); les données
techniques propres à chaque produit restent à fournir et ne doivent pas être
inventées.

## Stack

- Next.js avec App Router et TypeScript strict.
- Tailwind CSS et composants shadcn/ui.
- PostgreSQL hébergé sur Neon via Vercel Marketplace; Drizzle ORM et migrations
  versionnées.
- Auth.js avec identifiant et mot de passe haché.
- Recharts pour les graphiques, Vitest pour les calculs critiques.
- Déploiement Vercel; ne jamais utiliser SQLite en production.

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
10. Un apport au statut « reçu » n'alimente pas le stock; seul le poids accepté
    au tri pourra créer le mouvement d'entrée correspondant.
11. Le bilan du tri doit correspondre exactement au poids reçu, au gramme près;
    l'intégration du poids accepté et le mouvement de stock sont atomiques.
12. Une fabrication consomme le stock matière du type choisi et alimente le
    stock de chaque produit fini via des mouvements atomiques; le bilan utilisé
    = bandes + pertes est exact au gramme près.
13. Le coût matière/kg est saisi à chaque ordre de fabrication et ne doit pas
    être présenté comme un coût d’achat historique moyen.
14. Le stock de chaque produit fini est calculé depuis les mouvements: les
    lignes de production enregistrent des entrées et les lignes livrées des
    sorties atomiquement. Aucun solde de stock n'est saisi directement.
15. Une commande en attente ou préparée ne débite pas le stock; le débit et la
    création de la vente sont atomiques lors de la livraison, pour chaque
    produit commandé.
16. Les règlements cumulés d’une vente ne peuvent pas dépasser son montant;
    toute évolution commerciale ou financière est auditée.
17. Toute ligne de production et de vente référence un produit du catalogue;
    les quantités, tarifs et versions de fiche technique utilisés sont
    conservés pour préserver l'historique.
18. Le catalogue et les fiches techniques sont configurables sans modifier le
    code. Une fiche technique utilisée par un ordre de fabrication reste
    historisée et n'est pas écrasée par une nouvelle version.

## Conventions

- Code, noms de fichiers et identifiants techniques en anglais; interface,
  validations visibles et documentation utilisateur en français.
- Utiliser TypeScript strict, des types explicites et des validations Zod aux
  limites des formulaires et des API.
- Préférer les composants serveur Next.js; ajouter `"use client"` uniquement
  lorsqu'une interaction navigateur le demande.
- Garder les calculs metier dans des fonctions pures testables avec Vitest.
- Afficher les dates en JJ/MM/AAAA, les poids en kg et la devise configurable
  (XAF par défaut via `NEXT_PUBLIC_CURRENCY_CODE`).
- Conserver les saisies de formulaire si l'enregistrement echoue.
- Ne jamais commiter de secrets, de données personnelles réelles ou de fichier
  `.env`.
- Les migrations de base sont versionnées; les changements de schéma passent
  par Drizzle.
- Auth.js utilise des sessions JWT pour Credentials; ne pas ajouter de session
  SQLite ni de mot de passe en clair.
- Les actions et pages protégées vérifient leurs permissions côté serveur.
- Toute création ou modification de compte est enregistrée dans `audit_logs`.
- Les fiches collecteur restent liées aux livraisons historiques et ne sont pas
  supprimées physiquement.
- Les créations et modifications des collecteurs et apports sont auditées dans
  la même transaction que l'enregistrement métier.
- Le stock matière est toujours calculé depuis `material_stock_movements`;
  aucune action ne saisit directement un solde.
- Le stock fini doit être calculé par produit depuis les mouvements associés à
  ce produit; aucun champ de quantité dans le catalogue ne constitue un stock.
- Les commandes et les ordres de fabrication multi-produits doivent utiliser
  des lignes liées au catalogue, avec un mouvement de stock par ligne source.
- Le dernier administrateur actif et le compte de l'administrateur courant ne
  peuvent pas être désactivés ou rétrogradés.

## Évolution validée — catalogue multi-produits

L'évolution cible ajoute un catalogue configurable pour Balai, Brosse, Brosse
à laver avec manche, File à linge et Pavé, des fiches techniques versionnées,
des ordres de fabrication multi-lignes, des stocks par produit et des ventes
composées de plusieurs produits. Le tableau de bord doit proposer un filtre
Année avec sélection d'une année précise, afficher les équivalents en tonnes
(1 000 kg = 1 tonne) et détailler les indicateurs par produit.

Le schéma validé, la migration des données historiques (balais vers le produit
Balai) et les étapes de réalisation sont décrits dans
[docs/plan-multi-produits.md](./docs/plan-multi-produits.md). Les coûts sont
ventilés manuellement par ligne et la configuration catalogue est accessible à
l'Administrateur et au Responsable d'atelier.

## Commandes

Commandes disponibles :

```bash
npm run dev
npm run lint
npm run build
npm test
npm run db:generate
npm run db:migrate
npm run admin:create
```

Pour initialiser une base Neon et le premier compte dans un terminal sécurisé :

```bash
npx vercel env pull .env.local --environment production
npm run db:migrate
npm run admin:create
```

Avant de terminer une étape, lancer au minimum le lint, le build et les tests
pertinents disponibles. Ne pas annoncer une commande comme disponible tant
qu'elle n'est pas definie dans `package.json`.
