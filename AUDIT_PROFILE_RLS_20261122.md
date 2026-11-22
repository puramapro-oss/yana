# YANA — identité du profil et politiques de lecture

Base examinée : `3cb59c60fd6a95216964b2fd7a8d6b3c0cf660df`, arbre
`e0f4bf8e3c3906e51603507363dc6bf272aa51db`.

## Défauts de source et correction bornée

Le schéma canonique relie directement `yana.profiles.id` à `auth.users.id`.
Sa politique `profiles_self_select` relit pourtant `yana.profiles` pour vérifier
le rôle, ce qui réintroduit la même politique et provoque PostgreSQL `42P17`.
La migration historique `0003_fix_profiles_rls_recursion.sql` utilise une colonne
`auth_user_id` absente et retire un autre nom de politique. Elle échoue avec
`42703` sur ce schéma et ne résout pas la première erreur.

La migration additive `db/migrations/20261122_profiles_rls_identity.sql` conserve
`id` comme unique identité, vérifie les préconditions et remplace les deux noms
de politique de lecture connus par `profiles_self_select`. Son helper sans
argument `yana.is_super_admin()` utilise le rôle du profil correspondant à
`auth.uid()`. Il s’exécute sous un propriétaire de migration vérifié, avec
`search_path=pg_catalog` et `row_security=off`. Les rôles `authenticated` et
`service_role` peuvent l’exécuter ; les droits hérités PUBLIC et `anon` sont
retirés. Le helper ne renvoie qu’un booléen sur l’utilisateur courant.

Un utilisateur authentifié peut lire son profil, et un rôle serveur
`super_admin` peut lire les profils conformément au contrat du schéma. Le rôle
admin n’accorde aucun droit client de modification du profil d’autrui. Email et
métadonnées ne servent pas de preuve de rôle.

## Préconditions et installation réellement prise en charge

Le correctif exige une table ordinaire avec la clé primaire `id uuid`, sa clé
étrangère validée vers `auth.users(id)`, le rôle texte non nul, et **aucune seconde
colonne d’identité `auth_user_id`**. Il refuse les politiques ou triggers
personnalisés qui ne correspondent pas aux définitions examinées. Il n’interprète
pas une identité ambiguë et ne réécrit aucun enregistrement.

Le garde des six champs publics, publié dans
`20261122_atomic_tree_pledges.sql`, doit déjà être installé et actif. Sans lui,
réparer la lecture rendrait également utilisable une mise à jour permissive du
rôle. Le préflight vérifie donc le corps exact du garde, son mode invoker et son
trigger inconditionnel, ainsi que le trigger de date existant. Les empreintes de
corps sont des repères de compatibilité de cette version, pas une preuve de
l’intégrité historique des données. Une modification ultérieure de ces triggers
exige une nouvelle revue et une mise à jour coordonnée de ce contrat.

Le chemin qualifié utilise les DDL exacts des profils et tables associées du
schéma, le signup et l’horodatage existants, puis les migrations de naissance,
garde/transactions arbres et permissions wallet déjà examinées. Il remplace
ensuite les policies de la fixture par le **bloc exact de `schema.sql`**, reproduit
l’erreur et applique ce nouveau correctif. Il ne s’agit pas d’une installation
complète de toutes les tables et de toutes les anciennes migrations de YANA.

Pour le périmètre canonique du profil, ce correctif est appliqué **après les
prérequis ci-dessus et à la place de la réparation historique erronée 0003**.
L’appliquer après `schema.sql` ne rend pas rétroactivement exécutable un processus
qui s’arrête auparavant dans les anciennes migrations 0002/0003. Les fichiers
historiques sont conservés sans modification ; aucun runner global de migrations
ni aucune conversion de production ne sont ajoutés.

## Tests natifs prévus dans la CI jetable

Les 61 tests PostgreSQL existants et les 8 scénarios des handlers sont conservés.
L’inspection de l’enregistrement compte 43 cas supplémentaires, soit 104 cas
natifs attendus ; ce comptage statique n’est pas une exécution de PostgreSQL.
La suite supplémentaire `scripts/profile-rls-cases.mjs` s’exécute ensuite dans le
même service PostgreSQL 17 jetable, avec les mêmes contrôles empêchant une URL de
base externe. Chaque nouveau cas utilise les politiques réelles du schéma.

Les contrôles portent sur les erreurs antérieures, l’isolation entre utilisateurs,
la lecture admin légitime, l’absence ou la corruption d’identité, les droits du
helper, le détournement du search path, les six champs éditables, les refus
d’escalade, le signup, les écritures serveur, l’idempotence, FORCE RLS et le refus
atomique des schémas/politiques/triggers ambigus. Les cas de refus comparent le
catalogue et les données avant/après rollback.

Au moment de la préparation de ce fichier, les tests natifs de ce complément
restent **NON TESTÉS** : leurs résultats doivent être attachés au nouveau SHA
publié dans la PR. Les résultats PASS du parent ne qualifient pas ce complément.

## Limites conservées, sans conversion financière

Les tests gardent distinctement la preuve de deux incompatibilités historiques :

- `0002_story_shares.sql` utilise encore `auth_user_id`, absent du modèle canonique.
- `0003_financement_pools.sql` introduit `reward/asso/partner` et `in/out`, alors
  que `schema.sql` définit `reward_users/asso_purama/sasu_purama/eco_trees` et
  `credit/debit`. Son seed ne respecte pas la contrainte canonique des pools.

Ces migrations ne sont pas déclarées réparées. Réconcilier leurs contrats et les
soldes existants exige de déterminer le modèle réellement déployé ; aucune
conversion, suppression ou répartition financière n’est supposée.

Le correctif de profil protège les accès futurs dans son périmètre. Il ne prouve
pas la légitimité passée des rôles, soldes ou compteurs. Aucune base réelle,
migration distante, transaction financière ou publication en production n’a été
exécutée. Le parcours PostgREST complet et les comptes réels restent non qualifiés.

## Impact et sources techniques

Impact manuel sensible : toutes les lectures du profil et les politiques qui le
consultent. Aucun handler applicatif n’est modifié. GitNexus ne trouve pas les
symboles SQL (`UNKNOWN`). L’indexation isolée initiale a quitté avec le code 137,
sans cause établie ; ce résultat ne constitue pas une analyse réussie. La revue
SQL et les essais natifs complètent explicitement cette limite.

Une analyse restreinte aux scripts de qualification a ensuite réussi avec un
budget borné : 6 fichiers modifiés, 21 symboles et 4 parcours de test affectés,
risque MEDIUM dans ce seul index. Les symboles SQL restent UNKNOWN et ce graphe
partiel ne mesure pas l’impact global sur les applications. Aucun résultat SQL
natif n’est déduit de ce contrôle.

- [PostgreSQL 17 — Row security policies](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
- [PostgreSQL 17 — CREATE FUNCTION / SECURITY DEFINER](https://www.postgresql.org/docs/17/sql-createfunction.html)
- [PostgreSQL 17 — CREATE POLICY](https://www.postgresql.org/docs/17/sql-createpolicy.html)
