# Plan d'évolution vers le multi-produits

## Statut

Plan validé pour implémentation. Les commandes et ventes restent centrées sur
Balai jusqu'à l'étape commerciale. Les spécifications techniques initiales ne
sont pas encore fournies : ne créer aucune valeur métier supposée.

Première étape livrée : tables catalogue et versions de fiches, produits
initiaux, permissions de gestion et page `/produits`. La migration `0005` est
appliquée à Neon et le commit `3b4ff6c` est déployé en production.

Étape production multi-lignes : le code est prêt et la migration additive
`0006` est appliquée à Neon. Le backfill a été vérifié sans variation des
quantités ni des coûts historiques; tests, lint, TypeScript et build sont
passés. Le déploiement et la validation manuelle restent à faire. Les commandes
et ventes restent volontairement mono-Balai jusqu'à l'étape suivante.

## Cible fonctionnelle

Le catalogue configurable contiendra au minimum Balai, Brosse, Brosse à laver
avec manche, File à linge et Pavé. Les utilisateurs autorisés pourront gérer
les produits et leurs fiches techniques sans modifier le code.

Un ordre de fabrication pourra produire plusieurs produits sur des lignes
distinctes. Chaque ligne identifiera le produit, la version de sa fiche
technique, la quantité produite et la part de matière préparée. La matière
consommée, les pertes et les coûts communs resteront enregistrés sur l'ordre;
les coûts seront ventilés manuellement par ligne. Pour chaque catégorie de
coût, la somme des montants ventilés devra être égale au total de l'ordre au
centime près. La somme des kg de bandes des lignes et des pertes devra être
égale à la matière utilisée au gramme près.

Les commandes et ventes auront également des lignes par produit. À la
livraison, chaque ligne débitera atomiquement le stock de son produit; une
commande ne sera livrable que si chacun des stocks concernés est suffisant.
Le stock ne sera jamais saisi directement : il restera la somme des
mouvements d'entrée et de sortie par produit.

Le tableau de bord conservera le filtre de dates actuel et ajoutera un filtre
Année ainsi que la sélection d'une année précise. Les poids seront présentés en
kg et en tonnes équivalentes (1 tonne = 1 000 kg). Les indicateurs incluront
les quantités fabriquées et vendues, le stock courant, les coûts et les
recettes par produit, en plus des totaux globaux.

## Proposition de schéma PostgreSQL / Drizzle

### Catalogue et fiches techniques

- `products`
  - `id` UUID, `code` unique, `name`, `description`, `unit_label`,
    `is_active`, seuil d'alerte facultatif, dates d'audit.
  - Le catalogue est initialisé avec les cinq produits cités; les autres
    produits pourront ensuite être ajoutés ou désactivés.
- `product_technical_specs`
  - `id` UUID, `product_id` FK, numéro de version, date d'effet, note,
    spécifications techniques et auteur.
  - Stocker les attributs descriptifs variables (dimensions,
    composition, étapes de fabrication, accessoires) dans un objet JSONB
    validé par Zod; conserver aussi une quantité standard facultative de
    bandes en kg par unité pour comparaison avec la production réelle. Les
    valeurs non fournies restent nulles; elles ne sont pas inventées.
  - Une version référencée par une production est conservée; une modification
    crée une nouvelle version au lieu de réécrire l'ancienne.

### Production multi-lignes

- `production_orders` reste l'en-tête : date, responsable, type de plastique,
  kg utilisés, pertes et motif, coût matière/kg, main-d'œuvre, énergie,
  accessoires et coût total.
- `production_order_lines` porte le produit, sa version de fiche, les bandes,
  la quantité et les coûts ventilés. Les colonnes historiques
  `bandsPreparedKg` et `broomsProduced` restent pour compatibilité transitoire
  avec les clients déployés et les saisies hors ligne existantes; elles
  enregistrent des agrégats pour les nouveaux ordres.
- `production_order_lines` : `id`, `production_order_id`, `product_id`,
  `technical_spec_id`, quantité produite, kg de bandes affectés et ventilation
  manuelle par catégorie (matière/main-d'œuvre/énergie/accessoires). Les coûts
  de l'en-tête sont calculés à partir de ces lignes; la somme des coûts matière
  affectés doit égaler le coût matière calculé au kg utilisé.
  Plusieurs lignes du même produit sont permises lorsqu'elles utilisent des
  fiches techniques ou lots distincts.
- Le coût de revient unitaire sera calculé par ligne à partir du coût alloué
  et de la quantité réellement produite.

### Stocks finis par produit

- Ajouter `product_id` non nul à `finished_product_stock_movements`.
- Remplacer la source production au niveau de l'ordre par une source unique au
  niveau `production_order_line_id`; référencer aussi une future
  `sale_line_id` pour les sorties de vente.
- Conserver le type de mouvement, la quantité, l'acteur, le motif et les
  contrôles de cohérence entrée/production et sortie/vente.
- Ajouter des index sur le produit et la date/source pour calculer les soldes
  et consulter l'historique rapidement.

### Commandes et ventes multi-produits

- Conserver `sales_orders` comme en-tête (client, date, statut, créateur,
  total) et déplacer quantité/prix unitaire dans `sales_order_lines`
  (`product_id`, quantité, prix unitaire, total de ligne, libellé/code
  historiques).
- Conserver `sales` comme en-tête de vente et ajouter `sale_lines` liées à la
  vente et à la ligne de commande, avec produit, quantité, prix et total
  historiques.
- Les règlements restent attachés à la vente entière; les créances sont
  calculées sur le total de l'en-tête, égal à la somme de ses lignes.
- Une livraison vérifiera et débitera les quantités de tous les produits dans
  une transaction, avec verrouillage cohérent des produits pour éviter les
  ventes concurrentes en surstock.

### Tableau de bord

- Étendre la période avec un filtre Année : période personnalisée, année en
  cours ou année précise sélectionnée parmi les années disponibles.
- Calculer les tonnes par conversion explicite kg / 1 000, sans remplacer les
  valeurs exactes en kg.
- Grouper les indicateurs de production, ventes, coûts, recettes et stock par
  produit; les soldes de stock resteront des soldes actuels, non des soldes
  historiques de fin de période.
- Adapter les séries mensuelles et les tests aux lignes de production et de
  vente.

## Migration et compatibilité des données

La migration sera additive et versionnée avec Drizzle. Elle créera le produit
Balai et une fiche technique initiale sans valeur métier inventée, puis
rattachera à Balai les ordres,
mouvements, commandes, ventes et quantités historiques aujourd'hui enregistrés
comme balais. Les anciens coûts et tarifs seront conservés. Les contraintes
et colonnes ne seront retirées qu'après le backfill et la vérification des
totaux avant/après migration. Les données métier existantes ne seront ni
supprimées ni recréées.

La même évolution devra couvrir les validations Zod, les transactions et
verrous, les rapports PDF, les exports, l'archive de sauvegarde, les données de
démonstration et la file hors ligne de production. La synchronisation devra
revalider le catalogue, les versions techniques et les stocks côté serveur.

## Étapes de réalisation

1. Catalogue, fiches versionnées et permissions : livré, migration `0005`
   appliquée à Neon.
2. Production en-tête + lignes, bilan matière, ventilation manuelle des coûts
   et stock fini par produit : code livré et migration `0006` appliquée à Neon;
   contrôles historiques passés, déploiement et validation manuelle restent à
   faire.
3. Commandes et ventes multi-produits, avec sorties de stock par ligne à la
   livraison.
4. Tableau de bord : filtre Année/année précise, équivalents en tonnes et
   indicateurs détaillés par produit.
5. Déployer l'étape production, valider manuellement les parcours et reprendre
   ensuite les commandes et ventes multi-produits.

## Décisions validées

- Les commandes client peuvent contenir plusieurs produits.
- Les coûts sont ventilés manuellement par ligne et par catégorie; les totaux
  des catégories de l'en-tête sont calculés depuis les lignes. Le coût matière
  ventilé doit concorder avec le coût calculé au prix par kg de l'ordre.
- L'Administrateur et le Responsable d'atelier peuvent gérer le catalogue et
  les fiches techniques.
- Les données techniques exactes des cinq produits ne sont pas encore
  disponibles. Les produits et fiches pourront être créés sans valeurs
  techniques chiffrées; aucune valeur ne sera supposée.
