# YANA — compteurs d’intentions : correction transactionnelle proposée

État au 22 novembre 2026 : préparation locale pour revue, sans publication et
sans exécution sur une base réelle. Candidat source :
`508d8a2ebffe69594842d6308afad051e3c529b0`, arbre
`85109ecd1c526d2a934517c050b3261c2bb32c52`.

## Preuves disponibles

| Contrôle | État | Résultat |
| --- | --- | --- |
| Sources des deux handlers, schéma et 10 migrations | PASS | Octets locaux comparés aux SHA de blobs du candidat GitHub ; correspondance exacte. |
| Reproduction sur les handlers source | PASS | Un contrôle positif ; sept scénarios révèlent les invariants cassés. L’exécution de référence conserve son code de sortie 1. |
| Handlers proposés avec double transactionnel | PASS | Huit scénarios passent. Ce double ne prouve pas les propriétés de PostgreSQL. |
| Syntaxe des trois scripts Node | PASS | `node --check`, code de sortie 0. |
| Précontrôle lint des trois scripts et deux handlers | PASS | Configuration Next/PURAMA du propriétaire, aucune exclusion ajoutée, zéro erreur/avertissement. ESLint local 9.39.4 ; la CI du candidat verrouille 9.39.5 et reste à exécuter. |
| PostgreSQL natif jetable | NON TESTÉ | Workflow et 35 tests préparés pour la CI, à exécuter sur la révision publiée après revue. |
| Types, lint et build de l’application composée | NON TESTÉ | À vérifier avec la CI existante après composition avec les autres correctifs du propriétaire. |
| Base réelle, politique RLS distante, déploiement | NON TESTÉ | Aucune connexion, migration ou modification de données réelle. |

Défauts observés sur la référence :

| Scénario synthétique | Lignes après appel | Compteur après appel | Réponse observée |
| --- | ---: | ---: | --- |
| Claim simple, crédit d’un arbre | 1 | 1 | 200, contrôle positif |
| Cron : insertion refusée | 0 | 1 | 200, `planted=0` |
| Claim : mise à jour du compteur refusée | 1 | 0 | 200 |
| Deux claims concurrents, crédit d’un arbre | 2 | 1 | 200 + 200 |
| Claim et cron concurrents, crédit d’un arbre | 2 | 1 | 200 + 200 |
| Deux crons concurrents, crédit de trois arbres | 6 | 3 | 200 + 200 |
| Une ligne historique, compteur 0, nouveau claim | 2 | 1 | 200 |
| Compteur historique 1 sans ligne, nouveau claim | 1 | 2 | 200 |

Les tests chargent et transpilent les vrais handlers ; seuls Supabase,
l’identité et la préparation du reçu OTS sont remplacés. Aucun réseau, secret,
compte ou reçu réel n’est utilisé par cette reproduction.

## Correction

La fonction `yana.record_manual_tree_pledge` acquiert un verrou sur le profil,
valide les compteurs et le registre, compare `SUM(tree_count)` au compteur,
recalcule l’éligibilité puis insère l’intention et incrémente le compteur dans
la même transaction. Un échec d’une écriture annule l’ensemble. Un désaccord
historique renvoie `reconciliation_required`, sans réécriture ni rattrapage.
Une quantité du registre nulle ou négative est refusée : les deux producteurs
existants enregistrent une unité et aucune compatibilité avec zéro n’est prouvée.

Les deux handlers utilisent cette RPC sans repli vers les anciennes écritures
séparées. Le claim conserve son contrat de succès `tree/payload_hash/provider` ;
il expose les refus historiques en 409. Le cron conserve ses compteurs existants
et ajoute `failed` et `reconciliation_required` ; une écriture échouée donne
HTTP 500. Les prélectures servent à préparer le lot ; elles n’autorisent pas
l’écriture. Le contrôle décisif reste dans la transaction.

La RPC est `SECURITY DEFINER`, avec `search_path=pg_catalog` et noms de tables
qualifiés. Les droits explicites d’`anon`/`authenticated`, ainsi que ceux de
`PUBLIC`, sont retirés ; seul `service_role` reçoit EXECUTE, en dehors des
prérogatives inhérentes du propriétaire de la fonction. Retirer PUBLIC seul
ne suffirait pas : `schema.sql` accorde aussi EXECUTE aux rôles clients par
défaut.

Un trigger distinct `SECURITY INVOKER` protège seulement
`co2_offset_total_kg` et `trees_planted_total` : INSERT à zéro et absence de
modification à UPDATE pour `anon`/`authenticated`. Les champs ordinaires,
les écritures du serveur et la création de profil existante sont préservés.
Les droits généraux sur la table ne sont pas réorganisés.

`plantTree` produit actuellement une intention manuelle et éventuellement un
reçu OTS. La RPC enregistre exclusivement `manual`. L’ajout futur d’un prestataire
de plantation réel nécessite une réservation/outbox avec clé d’idempotence
avant l’appel externe ; la transaction actuelle ne garantit pas l’unicité d’un
paiement ou d’une plantation externe. Un reçu préparé mais non enregistré peut
être abandonné lors d’une concurrence, sans consommation de crédit.

## Banc PostgreSQL natif préparé

Le workflow utilise un service jetable `postgres:17`, une base nommée uniquement
`yana_tree_ci`, et des identités synthétiques. Le script refuse les URL de
connexion et exige l’identifiant du conteneur de service GitHub Actions. Il
appelle `psql` dans ce conteneur ; aucun secret de production n’est nécessaire.

Les définitions de `profiles` et `trees_planted`, ainsi que la fonction de
création de profil serveur, sont extraites exactement de `schema.sql`. `trips`
et `auth.users` sont des fixtures minimales. Les politiques de profil sont
explicitement non récursives, avec sélection/mise à jour de son propre profil.
Une permission INSERT et un accès anon sont ajoutés **dans la fixture seulement**
pour exercer la protection même si ces opérations sont autorisées ailleurs.
Il ne s’agit pas d’une reconstruction de l’historique SQL complet.

Les handlers proposés s’exécutent contre ce vrai PostgreSQL via un adaptateur
de données de test ; l’identité et OTS restent synthétiques. Les tests de
concurrence exigent que deux connexions RPC indépendantes apparaissent en attente
d’un verrou réel dans `pg_stat_activity` avant de les libérer. Les autres cas
couvrent rollback d’insert et d’update, désaccords historiques dans les deux
sens, données invalides, propriété du trajet, ACL de la RPC, deux rôles clients,
INSERT/UPDATE des colonnes protégées, éditions ordinaires et créations serveur.

## Déploiement et limites de portée

La migration doit être examinée et appliquée avant le code qui appelle la RPC.
Les deux anciens écrivains (claim et cron) doivent être arrêtés ou remplacés
ensemble pendant la transition ; une coexistence avec l’ancien protocole
read/insert/update ne conserve pas l’invariant. Sans migration, le nouveau code
échoue explicitement et ne revient pas au chemin vulnérable.

Aucune correction automatique du registre historique n’est incluse. Les profils
incohérents doivent être examinés et réconciliés avec des preuves réelles avant
de réautoriser de nouvelles intentions. Les prélectures du claim et du cron refusent ou ignorent les profils déjà
inéligibles avant de préparer un reçu OTS ; ces routes ne constituent donc pas
un audit exhaustif de cet historique ni un diagnostic de chaque ancien désaccord. Les autres
écrivains privilégiés éventuels doivent respecter le même protocole.

L’examen des 11 fichiers SQL présents révèle deux alertes distinctes non résolues :

- `schema.sql` associe `profiles.id` à `auth.users.id`, tandis que
  `0003_fix_profiles_rls_recursion.sql` utilise `auth_user_id`. Cette migration
  retire `profiles_select_own`, alors que le schéma crée `profiles_self_select`,
  dont la sous-requête sur `profiles` est récursive.
- La politique `profiles_self_update` ne protège que l’identité de la ligne.
  Les autres champs sensibles tels que rôle, plan et solde ne sont pas couverts
  par ce correctif limité aux deux compteurs. L’état des politiques distantes
  reste inconnu ; aucune exploitation en production n’est affirmée.

GitNexus préalable : POST du claim `UNKNOWN` (appelant HTTP non résolu) ;
`run` du cron `LOW` (POST puis GET, cinq parcours), POST du cron `LOW` (GET).
L’usage HTTP `useTrees` et les lecteurs de statistiques ont été contrôlés
séparément. Le propriétaire doit exécuter `detect-changes` sur le delta composé
avant son commit ; aucun commit ni modification de son checkout n’a été effectué
par cette sous-tâche.

## Références techniques

- [PostgreSQL 17 : verrous de lignes](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS)
- [PostgreSQL 17 : droits et contexte des fonctions](https://www.postgresql.org/docs/17/sql-createfunction.html)
- [PostgREST : transactions et rollback](https://docs.postgrest.org/en/stable/references/transactions.html)
