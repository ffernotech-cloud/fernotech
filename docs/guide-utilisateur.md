# Guide utilisateur — FERNOTECH ECO-TRACK

## Se connecter

Ouvrez l’adresse de l’application et saisissez votre identifiant et votre mot
de passe. Vos menus dépendent de votre rôle. Déconnectez-vous lorsque vous
utilisez un appareil partagé.

## Enregistrer la chaîne de recyclage

1. **Collecteurs** : créez une fiche puis enregistrez chaque apport avec sa date,
   son poids reçu, son type de plastique et son point de collecte.
2. **Tri et stock matière** : pour chaque apport reçu, saisissez le poids accepté
   et rejeté. Leur somme doit correspondre au poids reçu; tout rejet doit avoir
   un motif. Intégrez ensuite l’apport au stock. Seul le poids accepté est ajouté.
3. **Production** : créez un ordre avec une ligne par produit (Balai, Brosse,
   Brosse à laver avec manche, File à linge, Pavé ou autre produit actif).
   Choisissez la fiche technique, renseignez les quantités et bandes, puis
   ventilez les coûts par ligne. Le total des bandes et pertes doit égaler la
   matière utilisée. Le système vérifie le stock matière et crédite chaque
   produit fabriqué.
4. **Ventes et règlements** : créez le client et une commande contenant une ou
   plusieurs lignes produits. Préparez-la puis livrez-la; chaque stock produit
   est vérifié puis débité à la livraison. Saisissez les règlements partiels ou
   complets; les créances sont calculées automatiquement.
5. **Tableau de bord** : choisissez une année précise ou une période personnalisée.
   Consultez les poids en kg et tonnes, les coûts, ventes, marges estimées et
   stocks pour chaque produit. Les soldes de stock affichés sont les soldes
   actuels, même si une période passée est sélectionnée.

## Exports et rapport

Dans chaque module, utilisez les boutons **Exporter** pour télécharger un CSV
ouvrable dans Excel. Dans Excel configuré en français, le séparateur de colonnes
est le point-virgule. Le rapport de production peut être imprimé ou enregistré en
PDF depuis **Production → Rapport imprimable / PDF**.

## Préparer les saisies hors ligne

Cette fonction est réservée à l’Administrateur et au Responsable d’atelier.

1. Pendant que vous êtes connecté, ouvrez **Préparer l’espace hors ligne** depuis
   le tableau de bord et attendez la confirmation de préparation des listes.
2. Ouvrez cet espace dans l’application installée avant de quitter la zone de
   couverture. La préparation conserve sur cet appareil les collecteurs actifs,
   les 500 derniers apports encore à traiter et le stock matière courant.
3. Sans réseau, enregistrez un collecteur, un apport, un tri, une intégration ou
   une fabrication Balai dans cet espace. La production multi-produits doit
   encore être enregistrée en ligne. Chaque saisie hors ligne disponible est
   conservée dans la file locale; un indicateur montre son état.
4. Au retour du réseau, gardez l’espace ouvert et reconnectez-vous avec le même
   compte. La file est envoyée dans l’ordre et se met à jour automatiquement.
   Les fabrications sont revérifiées avec le stock serveur. En cas de conflit,
   la file s’arrête, affiche l’erreur et demande une vérification avant nouvel
   essai. Une saisie refusée peut être supprimée explicitement depuis la file.
5. Après synchronisation, vérifiez les modules concernés dans l’application
   connectée. Les opérations hors ligne sont identifiées dans le journal d’audit.

Les ventes et règlements ne sont jamais enregistrés hors ligne. Les soldes
affichés hors ligne sont provisoires et le stock serveur reste la référence.
Les listes privées et saisies en attente sont conservées localement sur
l’appareil; utilisez un appareil protégé par un code et évitez les profils de
navigateur partagés. **Effacer les données locales** supprime aussi les saisies
encore en attente.

## Sauvegarde administrateur

L’Administrateur ouvre **Utilisateurs → Sauvegarde complète de la base**, saisit
et confirme une phrase secrète d’au moins 12 caractères, puis télécharge le
fichier `.fernotech-backup.json`. L’archive contient toutes les tables métier,
les journaux d’audit et les empreintes de mots de passe; elle est chiffrée en
AES-256-GCM. Conservez le fichier et la phrase secrète séparément, dans deux
emplacements sûrs. Sans la phrase secrète, le fichier ne peut pas être déchiffré.
La phrase n’est ni enregistrée par l’application ni récupérable.

La sauvegarde administrateur est une archive de données chiffrée; ce n’est pas
un export `pg_dump` et elle ne fournit pas de restauration en un clic. Gardez
également activées les sauvegardes/restaurations gérées par Neon pour récupérer
rapidement une base en cas d’incident.

## Installer sur un téléphone

- **Android / Chrome** : ouvrez l’application, puis le menu du navigateur et
  choisissez **Installer l’application** ou **Ajouter à l’écran d’accueil**.
- **iPhone / Safari** : touchez **Partager**, puis **Sur l’écran d’accueil**.
- **Ordinateur** : dans Chrome ou Edge, utilisez l’icône d’installation dans la
  barre d’adresse ou le menu du navigateur.

L’application installée peut ouvrir l’espace de saisie hors ligne préparé au
préalable. Le tableau de bord et les autres pages nécessitent Internet.
