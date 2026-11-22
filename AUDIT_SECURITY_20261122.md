# YANA — sécurité et reçus OpenTimestamps, 22 novembre 2026

Base examinée : `f0e5569cd25ee941e70792e0080bdc2478f1369f`.

## Défauts reproduits

- Le verrou initial contient 31 groupes d'alertes npm : 3 critiques, 8 hautes,
  19 modérées et 1 faible.
- `Buffer.from(value, 'hex')` tronque une chaîne invalide. Le wrapper acceptait
  donc un SHA-256 suivi de caractères invalides et contactait les calendriers.
- Le transport historique transforme les erreurs des calendriers en résultats
  résolus. Le wrapper pouvait alors renvoyer 84 octets sans attestation, illisibles
  comme reçu complet. Reproduction sans réseau : vrai wrapper initial, primitives
  officielles 0.4.9, seule l'entrée/sortie des calendriers remplacée.
- L'interface déduisait « scellé blockchain » de la seule présence d'une chaîne
  `ots_proof`, sans vérifier l'ancrage. Le fournisseur de plantation est actuellement
  `manual` ; aucune plantation physique ne peut être déduite de cette ligne.
- Un rejet réseau de `claimTree()` laissait le bouton de demande bloqué.

## Corrections

Next.js et eslint-config-next sont alignés sur 16.4.6 ; Zod sur la branche corrigée
4.6.7, sharp sur 0.35.5 et PostCSS sur une version corrigée 8.5.23 ou ultérieure.
Les mises à jour transitives compatibles viennent de `npm audit fix --package-lock-only`,
sans `--force`. Le correctif bn.js 4.12.5 reste dans sa version majeure existante.

Le paquet ancien `javascript-opentimestamps@0.4.5` devient le paquet officiel
`opentimestamps@0.4.9` : c'est le nom utilisé par le projet depuis 0.4.6
([source officielle](https://github.com/opentimestamps/javascript-opentimestamps)).
La fonctionnalité utilisée est conservée. Aucun appel au point d'entrée historique
ni au transport request/request-promise : seules les primitives officielles servent
à parser et sérialiser les reçus.

`ots-stamp.ts` reprend le transport de `ots-core.ts` de JurisPurama ;
`request-deadline.ts` en reprend exactement la gestion d'échéance déjà testée.
La construction nonce/Merkle suit la bibliothèque officielle. Les quatre origines
HTTPS sont fixes, les redirections et les credentials exclus, chaque réponse limitée
à 10 000 octets et chaque requête à 10 secondes, corps compris. Deux calendriers
doivent renvoyer des attestations utilisables ; aucun succès n'est inventé après
une panne. Les URI contenues dans les reçus ne sont jamais appelées par ce code.

La seconde revue a reproduit neuf entrées corrompues acceptées par le parseur officiel : longueurs tronquées, octets ignorés et varints non minimaux. Après parsing borné, le réencodage officiel doit restituer exactement tous les octets reçus, y compris les attestations imbriquées. Les neuf régressions échouent avant correction et passent après ; les cinq reçus officiels restent compatibles.

Les contrats publics `sha256Hex`, `sha256Bytes`, `stampHashHex` et `stampString`
restent identiques. Une empreinte est strictement composée de 64 caractères
hexadécimaux et n'est pas hachée deux fois. En cas d'indisponibilité, le reçu vaut
`null`, sans empêcher l'enregistrement de l'intention.

L'interface distingue demande, reçu disponible et ancrage non vérifié. Les textes
du guide, du tutoriel et du tableau administrateur suivent cette distinction.
Le bouton sort systématiquement de son chargement, y compris en cas de rejet réseau.

## Vérifications

- PASS local : 34 scénarios sur le vrai wrapper et les primitives officielles,
  dont 5 reçus officiels conservant octet pour octet leur sérialisation.
- PASS local : 6 scénarios de rendu réel de la page GREEN et du callback réel,
  avec seules les données distantes remplacées.
- PASS local : 6 régressions des lectures Abonnement, reproduites avant correction :
  absence de mise à jour synchrone au montage, erreurs visibles, annulation avant
  réponse ou après JSON, rejet tardif et nettoyage réel du signal. L'état de la
  page est isolé par compte ; les relances utilisateur initialisent le chargement.
- PASS local : 5 tests du portail Abonnement, dont 3 régressions reproduites.
  Une réponse tardive après sortie ou changement de compte ne redirige plus
  vers l’ancien portail ; deux clics simultanés ne lancent qu’une requête.
  Le succès courant et la relance après refus restent disponibles. Aucun appel
  Stripe réel dans ces tests.
- PASS local : 46 régressions existantes d'admission des sources privées,
  d'installation et de suppression de l'authentification temporaire.
- PASS local : les 21 fichiers SMARANA et 2 fichiers ESLint correspondent aux
  empreintes et commits immuables déjà suivis par le projet. Aucun paquet privé
  n'est copié dans le dépôt public.
- La CI existante conserve installation complète, types, build et navigation
  Chromium/Firefox/WebKit. Elle ajoute ces 51 régressions et une barrière npm
  refusant les alertes hautes ou critiques. Son résultat doit être lié au SHA final.
- Première CI `44970199456` : installation complète sous Node 22, contrôle des
  sources privées, audit et 40 régressions PASS. Le lint a révélé un appel de
  mise à jour synchrone dans l'effet Abonnement. Le correctif structurel ci-dessus
  conserve la règle ; types, build et navigateur n’avaient pas été exécutés à ce stade.
- CI du candidat `508d8a2`, run `44971076219` : PASS installation complète,
  audit, lint ciblé, types, build de 95 pages, 46 contrôles de sources privées,
  46 régressions et 52 tests navigateur. Les ajouts ultérieurs, dont la protection
  du portail, doivent être requalifiés au SHA de publication ; la PR lie cette preuve.
- Deux installations npm complètes locales ont été arrêtées avec le code 137 ;
  leur cause n'est pas établie et elles ne valent pas un test réussi. Les tests
  locaux utilisent les versions publiques exactes déjà disponibles ; la CI
  qualifie le verrou complet. Aucune nouvelle tentative locale lourde prévue.

## Limites conservées explicitement

L'absence d'alerte haute/critique ne signifie pas l'absence de toute vulnérabilité.
L’audit final conserve 8 groupes : 6 modérés et 2 faibles, aucun haut ou critique.
Des alertes modérées et faibles subsistent dans le SDK Anthropic et dans des
dépendances OpenTimestamps. Le transport request n'est pas chargé par le nouveau
wrapper, mais ses dépendances restent inventoriées. Aucun passage forcé au SDK
Anthropic 1.x ou suppression artificielle de dépendances pour masquer l'audit.

La réalisation d'une plantation, l'activation du partenaire, l'actualisation et
la vérification Bitcoin d'un reçu, les données de production, les parcours avec
un compte réel et les applications mobiles ne sont pas qualifiés par ces tests.
La comptabilité des intentions reçoit désormais une RPC transactionnelle commune
au claim et au cron : verrou du profil, contrôle du registre et écriture atomique.
Les incohérences historiques sont refusées sans réécriture. Huit scénarios locaux
passent, dont sept défauts reproduits sur la référence. Les 35 vérifications PostgreSQL
natives préparées doivent encore être exécutées dans le service jetable de CI.
La migration doit précéder les deux nouveaux writers ; leur coexistence avec les
anciens writers ne serait pas sûre. Les divergences du schéma historique et les
autres champs sensibles du profil restent à examiner sur une base réellement
accessible. Voir `AUDIT_TREE_TRANSACTIONS_20261122.md`. Aucun appel payant,
opération financière, migration de données distantes ou déploiement n’est effectué.

Les sources partagées restent épinglées à SMARANA
`531cc653c81ffa3c99ab94667067f217deb5f944` et purama-master
`6e50837af08ad57d8db37077f0363b3e05289e31`.

Le premier contrôle GitNexus préalable signalait un risque élevé : 12 symboles
et 8 parcours affectés, dont GREEN et les routes arbres. Les analyses des handlers
du second lot donnent UNKNOWN pour le claim HTTP et LOW pour le cron ; elles ne
suffisent pas à prouver l’absence d’impact. Le contrôle cumulé avant publication couvre
29 fichiers, 20 symboles et 14 parcours : risque HIGH, signalé avant publication.
La revue et les deux CI doivent qualifier le SHA composé.
