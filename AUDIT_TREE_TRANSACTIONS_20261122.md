# YANA — transactions des intentions et permissions des profils

Le premier lot est publié en `f6f002bece30bd6db8900760307532e3d3cbea85`,
arbre `e43c40be01783d9c82444f01ce1229ac86977bf2`. Ses deux CI sont PASS :
[Web 44973775476](https://github.com/puramapro-oss/yana/actions/runs/44973775476)
et [PostgreSQL 44973775426](https://github.com/puramapro-oss/yana/actions/runs/44973775426).
Le présent complément resserre les permissions ; ses nouvelles vérifications
doivent être liées à son SHA de publication. Aucune base réelle n’a été migrée.
La reproduction initiale reste attachée à la référence `508d8a2`.

## Preuves disponibles

| Contrôle | État | Résultat |
| --- | --- | --- |
| Sources des deux handlers, schéma et 10 migrations | PASS | Octets locaux comparés aux SHA de blobs du candidat GitHub ; correspondance exacte. |
| Reproduction sur les handlers source | PASS | Un contrôle positif ; sept scénarios révèlent les invariants cassés. L’exécution de référence conserve son code de sortie 1. |
| Handlers proposés avec double transactionnel | PASS | Huit scénarios passent. Ce double ne prouve pas les propriétés de PostgreSQL. |
| Syntaxe des trois scripts Node | PASS | `node --check`, code de sortie 0. |
| Précontrôle lint des trois scripts et deux handlers | PASS | Configuration Next/PURAMA du propriétaire, aucune exclusion ajoutée, zéro erreur/avertissement. ESLint local 9.39.4 ; la CI complète f6f002be utilisait le verrou 9.39.5. Le nouveau delta doit être requalifié. |
| PostgreSQL natif du premier lot | PASS | 35 tests natifs et 8 modèles de handlers réussis sur f6f002be ; trois courses avec deux connexions réellement bloquées chacune. |
| Complément de permissions | NON TESTÉ en PostgreSQL avant publication | La suite native élargie doit passer sur le nouveau SHA ; les résultats anciens ne lui sont pas attribués. |
| Types, lint et build du premier lot composé | PASS | CI f6f002be : installation complète, audit, lint, types, build 95 pages et 52 tests navigateur. Le complément doit repasser cette CI. |
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

Le trigger distinct `SECURITY INVOKER` protège désormais tous les champs
serveur du profil. Les INSERT directs `anon`/`authenticated` sont refusés :
la création légitime passe par la fonction serveur `handle_new_user`. Les UPDATE
clients sont limités aux six champs publics de PATCH `/profile` : `full_name`,
`theme`, `locale`, `birthdate`, `notifications_enabled`, `tutorial_completed`.
La comparaison des lignes JSON exclut uniquement cette liste ; rôle, email,
plan, multiplicateur, solde, quotas, identifiants Stripe, métadonnées et compteurs
restent protégés, ainsi que les colonnes ajoutées ultérieurement.

Les 20 mutations applicatives de profils inventoriées passent par le client
serveur ; le mobile ne contient qu’une lecture. Les éditions ordinaires, les
écritures serveur et la création de profil sont conservées. `updated_at` reste
protégé : le vrai trigger `profiles_touch_updated` s’exécute après le garde dans
l’ordre alphabétique du schéma. La fixture le reproduit. Les politiques RLS
globales ne sont pas remplacées par ce complément.

### Fonction de demande de retrait réservée au serveur

La déclaration canonique de `request_withdrawal(uuid,integer,text,text)` ne retirait
que PUBLIC, alors que les droits par défaut du schéma peuvent accorder EXECUTE
explicitement à `anon` et `authenticated`. La correction retire les trois grants
et conserve `service_role`. Le seul appelant applicatif passe déjà par l’API
authentifiée `/api/wallet/withdraw`, avec `p_user_id` issu d’Auth.

La migration incrémentale `20261122_wallet_withdrawal_permissions.sql` resserre
les droits d’une fonction déjà installée sans changer son identité ni son corps.
Si elle est absente, cette absence est signalée ; aucun objet wallet n’est créé.
La déclaration canonique corrigée assure les mêmes droits aux installations futures.
Les deux corps de RPC restent identiques aux sources examinées.

La suite native composée prépare 61 cas : 54 arbres/profils et 7 permissions
wallet. Elle recrée les droits historiques depuis les vrais DEFAULT PRIVILEGES,
vérifie les refus clients avant toute écriture, l’absence optionnelle de fonction,
un retrait strictement synthétique par le serveur et son rollback en cas d’échec
du registre de débits. Aucun transfert, prestataire ou paiement n’est appelé.
Le résultat de ces nouveaux cas doit être lu dans la CI du nouveau candidat.

`plantTree` produit actuellement une intention manuelle et éventuellement un
reçu OTS. La RPC enregistre exclusivement `manual`. L’ajout futur d’un prestataire
de plantation réel nécessite une réservation/outbox avec clé d’idempotence
avant l’appel externe ; la transaction actuelle ne garantit pas l’unicité d’un
paiement ou d’une plantation externe. Un reçu préparé mais non enregistré peut
être abandonné lors d’une concurrence, sans consommation de crédit.

## Banc PostgreSQL natif

Le workflow utilise un service jetable `postgres:17`, une base nommée uniquement
`yana_tree_ci`, et des identités synthétiques. Le script refuse les URL de
connexion et exige l’identifiant du conteneur de service GitHub Actions. Il
appelle `psql` dans ce conteneur ; aucun secret de production n’est nécessaire.

Les définitions de `profiles`, `trees_planted`, `wallet_transactions` et
`withdrawals`, ainsi que les fonctions de création de profil et de timestamp,
sont extraites exactement de `schema.sql`. La migration birthdate existante est
appliquée telle quelle. `trips`
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

Les migrations de ce lot doivent être examinées et appliquées avant le code
qui appelle la RPC. La correction canonique wallet ne remplace pas la migration
incrémentale pour une fonction déjà installée.
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

L’examen des sources SQL conserve deux limites distinctes à qualifier avant exploitation :

- `schema.sql` associe `profiles.id` à `auth.users.id`, tandis que
  `0003_fix_profiles_rls_recursion.sql` utilise `auth_user_id`. Cette migration
  retire `profiles_select_own`, alors que le schéma crée `profiles_self_select`,
  dont la sous-requête sur `profiles` est récursive.
- La politique `profiles_self_update` ne protège que l’identité de la ligne.
  Le nouveau garde limite désormais ses écritures, mais l’état des politiques
  distantes et l’intégrité des valeurs historiques restent inconnus. Une
  ancienne élévation de rôle ou modification de solde ne serait pas réparée
  automatiquement par un trigger qui protège les écritures futures. Aucune
  exploitation en production n’est affirmée.

GitNexus préalable : POST du claim `UNKNOWN` (appelant HTTP non résolu) ;
`run` du cron `LOW` (POST puis GET, cinq parcours), POST du cron `LOW` (GET).
L’usage HTTP `useTrees` et les lecteurs de statistiques ont été contrôlés
séparément. Le lot f6f002be avait un signal HIGH (29 fichiers, 20 symboles,
14 parcours). L’impact du garde administrateur complémentaire est CRITICAL :
neuf appelants et neuf parcours, signalés avant édition. Les nouvelles fonctions
SQL ne sont pas indexées : UNKNOWN est complété par la revue des producteurs,
des consommateurs et les tests natifs. `detect-changes` est exécuté sur le lot
composé avant publication ; la PR consigne le résultat et les CI exacts.

## Références techniques

- [PostgreSQL 17 : verrous de lignes](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS)
- [PostgreSQL 17 : droits et contexte des fonctions](https://www.postgresql.org/docs/17/sql-createfunction.html)
- [PostgREST : transactions et rollback](https://docs.postgrest.org/en/stable/references/transactions.html)
