# CONFORMITÉ NIYAMA — YANA
> Audit du 2026-08-23, contre `NIYAMA-BRIEF.md` §7 (checklist certification). Preuve = fichier réel lu, ligne citée. Le rollout socle NIYAMA a eu lieu aujourd'hui même (cf ERRORS.md) ; cet audit vérifie qu'il est correctement et **complètement** appliqué — pas seulement la partie déjà corrigée par ERRORS.md.

## Verdict global : ORANGE — 4 gaps (dont 1 majeur)

---

## 1. Pages légales — décrivent bien YANA (mobilité), pas une autre app

**VERT.** Vérifié en lisant le contenu réellement généré :
- `src/lib/legal/app-config.ts` — `YANA_LEGAL_CONFIG.descriptionActivite` décrit explicitement "plateforme de mobilité responsable... suivi de trajets, score sécurité/éco/CO₂, covoiturage à récompense partagée, assistant NAMA-PILOTE" (ligne 17). Aucune trace résiduelle d'aides sociales/CAF/CPAM/Ciclade.
- `src/lib/legal/content/cgv.ts` clauses spécifiques : 3 plans Essentiel/Infini/Legende avec les bons prix (§7 ci-dessous).
- `src/lib/legal/content/mentions-legales.ts` — adresse Vercel à jour "440 N Barranca Avenue #4133, Covina, CA 91723" (le bug d'adresse obsolète documenté dans ERRORS.md est bien corrigé).
- Le bug de copié-collé documenté dans `ERRORS.md` (2026-08-23) est **correctement corrigé** pour CGU/CGV/politique de confidentialité/mentions légales : contenu 100% domaine YANA, aucun résidu "aides sociales/scanner financier/VIDA Aide/LAKSHMI" trouvé dans `src/lib/legal/content/*.ts`.

**MAIS** résidu du copié-collé **non traité** ailleurs dans le code (hors périmètre des 4 fichiers `content/*.ts` corrigés par le rollout — cf §2 ci-dessous, bandeau cookies).

---

## 2. Bandeau consentement cookies — fonctionnel

**ORANGE.** Deux bandeaux cookies coexistent, et c'est le mauvais qui est monté :
- Le socle NIYAMA fournit `src/lib/legal/components/CookieConsentBanner.tsx` + hook `useCookieConsent` + `POST /api/legal/cookie-consent` qui écrit en base (table `cookie_consents`, colonnes `necessaire/mesure/marketing`) — **mais rien ne l'importe** dans `src/app/**` (`grep` confirmé : aucune référence hors du module `lib/legal` lui-même).
- Le bandeau réellement monté dans `src/app/layout.tsx` est `src/components/shared/CookieBanner.tsx` — **résidu du copié-collé non nettoyé** : clé `localStorage.setItem('vida_cookie_consent', ...)` (ligne 13/21/26, préfixe `vida_` = résidu de l'app source du bug documenté dans `ERRORS.md`). Ce composant est 100% côté client, binaire accepter/refuser, n'écrit **jamais** en base — la table `cookie_consents` restera donc toujours vide, et `consentementCookies` dans l'export RGPD (`api/legal/my-data`) sera systématiquement `null`.
- Conséquence : le consentement est fonctionnel au sens UI (s'affiche, se ferme, persiste en localStorage) mais **pas conforme au socle NIYAMA prévu pour cette app** (pas de granularité mesure/marketing, pas de preuve serveur du consentement, incohérent avec le reste du dossier RGPD qui promet cette preuve).
- **Fix attendu** : remplacer `src/components/shared/CookieBanner.tsx` par `CookieConsentBanner` du socle (`src/lib/legal/components/CookieConsentBanner.tsx` + `useCookieConsent`) dans `src/app/layout.tsx`, et supprimer la clé `vida_cookie_consent`.

---

## 3. Preuve d'acceptation CGU horodatée écrite en base

**VERT.**
- `src/app/api/legal/accept/route.ts` : `POST` authentifié, version calculée **côté serveur** (`CURRENT_LEGAL_VERSIONS[docType]`, jamais envoyée par le client), `accepted_at`, `ip` (x-forwarded-for), `user_agent` capturés, upsert `onConflict: 'user_id,doc_type'` (idempotent, évite les doublons sur retry/OAuth concurrent — cf commentaire du schéma SQL socle).
- `src/app/(auth)/signup/page.tsx` monte `LegalAcceptanceNotice` (pattern "clic sur Créer mon compte vaut acceptation", zéro case à cocher — conforme à la résolution CLAUDE.md §9.5) et le bug de l'ancien checkbox pré-socle est bien documenté comme corrigé dans `ERRORS.md`.
- `LegalReacceptanceGate` (voir §9) et `MaMemoirePage` lisent bien `legal_acceptances` pour afficher/contrôler les versions acceptées.

---

## 4. "Ma mémoire" — export RGPD + suppression de compte réelle

**VERT.**
- `src/app/(dashboard)/ma-memoire/page.tsx` monte `MaMemoirePage` (`src/lib/legal/components/MaMemoirePage.tsx`), qui embarque `AccountDeletionButton`.
- Export : bouton → `GET /api/legal/my-data` → `src/app/api/legal/my-data/route.ts` : agrège `profiles`, `legal_acceptances`, `cookie_consents`, + 13 tables métier réelles (`conversations, trips, vehicles, wallet_transactions, withdrawals, payments, invoices, commissions, kyc_verifications, notifications, push_tokens, support_tickets, user_achievements`) avec commentaire explicite sur les tables exclues et pourquoi (`messages/referrals/carpool_bookings/trip_events` n'ont pas de `user_id` direct — vérifié en base 2026-08-23). Téléchargement JSON réel côté `MaMemoirePage.handleExport()`.
- Suppression : `src/app/api/account/delete/route.ts` — `POST` programme une suppression à J+30 (RGPD art. 17, période de grâce), exige `confirm: 'DELETE_MY_ACCOUNT'` en body (anti-clic-accidentel), `DELETE` permet d'annuler pendant la grâce. Schéma aligné sur `packages/legal/sql/001_legal_core.sql` (table `account_deletion_requests`, réutilisation du pattern `arogya` en prod).

---

## 5. Déclaration IA sur CHAQUE UI de chat IA réelle (NAMA-PILOTE)

**ROUGE — gap majeur, distinct du bug de rollout documenté.** YANA a DEUX surfaces de chat IA réelles :

**a) NAMA-PILOTE (chat principal, `/chat`)** — partiellement conforme :
- `src/app/(dashboard)/chat/[id]/page.tsx:11` importe et affiche `AIDisclosure` — conforme une fois dans un fil de conversation existant.
- **Mais** `src/app/(dashboard)/chat/page.tsx` (liste + démarrage rapide) permet d'envoyer un premier message à l'IA directement (`startWith()`, ligne 60, `POST /api/chat`) **sans jamais afficher `AIDisclosure`** — le composant n'est importé nulle part dans ce fichier. L'utilisateur peut donc engager une conversation IA réelle avant toute déclaration formelle IA Act.
- Le prompt système de NAMA-PILOTE (`src/lib/claude.ts:46`) est correctement scopé : "JAMAIS dire être Claude/Anthropic → je suis NAMA-PILOTE" — n'interdit que de nommer le fournisseur, pas de cacher la nature IA. Conforme à CLAUDE.md.

**b) Chatbot SAV / Aide (`/aide`, onglet "Demander à NAMA Assistant")** — non conforme :
- `src/app/api/support/escalate/route.ts:58` — le prompt système dit littéralement : **"Tu ne dévoiles JAMAIS être Claude / Anthropic / une IA générative. Tu ES NAMA Assistant."** — contrairement au prompt de NAMA-PILOTE, celui-ci va au-delà de "ne pas nommer le vendeur" : il interdit explicitement de révéler la nature IA générative elle-même.
- `src/app/aide/AideClient.tsx` : aucune trace du mot "IA" ou "intelligence artificielle" dans toute la surface chat (onglet ligne 234-236 "Demander à NAMA Assistant", réponse ligne 353-355 "NAMA Assistant répond"). `AIDisclosure` n'y est pas importé (confirmé par recherche globale : seule référence hors module `lib/legal` = `chat/[id]/page.tsx`).
- Conséquence : un utilisateur qui pose une question dans `/aide` interagit avec un assistant IA sans jamais en être informé, ET le système est explicitement instruit à le cacher — violation frontale de l'obligation de transparence IA Act rappelée en `NIYAMA-BRIEF.md` §1 ("déclaration « vous parlez à une IA » sur tout chat IA").
- **Fix attendu** : (1) retirer "une IA générative" de la règle #1 du prompt `escalate/route.ts` (garder uniquement l'interdiction de nommer Claude/Anthropic, comme dans `claude.ts`) ; (2) monter `AIDisclosure` sur `AideClient.tsx` (onglet chat) ; (3) monter `AIDisclosure` sur `chat/page.tsx` avant le premier envoi de message.

---

## 6. Lexique interdit + avis rémunérés + promesses de résultat non tenables

**ORANGE — 1 occurrence réelle d'avis rémunérés, 0 promesse de résultat non tenable, 0 lexique interdit santé/finance (hors domaine).**

**Avis rémunérés (piège gravé — famille 1 "JAMAIS d'avis/notes/installs rémunérés") :**
- `src/app/(dashboard)/guide/page.tsx:80` — texte utilisateur réel : *"Tirage mensuel : dernier jour du mois, 10 utilisateurs actifs tirés au sort se partagent 4 % du CA. Tu gagnes des tickets à chaque action (inscription, parrainage, mission, partage, **avis**, abonnement)."*
- `src/app/api/lottery/status/route.ts:9` — `TICKET_SOURCES` inclut littéralement `'review'` comme source valide de ticket de loterie (`const TICKET_SOURCES = ['signup', 'referral', 'mission', 'share', 'review', 'challenge', 'streak', 'subscription', 'points_purchase', 'daily']`).
- Aucun endpoint d'insertion `karma_tickets` pour la source `review` n'a été trouvé dans ce repo (le mécanisme de délivrance n'est peut-être pas encore câblé) — mais le texte utilisateur promet déjà cette récompense, et le type l'accepte comme source légitime. Que le mécanisme soit actif ou pas, **le texte affiché à l'utilisateur constitue déjà la promesse d'un avis rémunéré** via une loterie à valeur monétaire réelle (4% du CA reversé en €), ce qui est exactement le piège documenté sur akasha-ai/sarva/mukti/purama-origin.
- **Fix attendu** : retirer "avis" de la liste des actions génératrices de tickets (guide + `TICKET_SOURCES` + toute logique de délivrance associée si elle existe côté DB/trigger non visible dans ce repo Next.js).

**Promesses de résultat non tenables :** 0 occurrence. Grep ciblé (`garanti|sans risque|résultats garantis|argent facile`) ne remonte que des garanties légitimes et tenables (`-10% garanti` = coupon de réduction réel après 7 jours de streak — `src/components/rewards/DailyGiftCard.tsx:141`, `src/app/(dashboard)/guide/page.tsx:113`), pas de promesse financière/santé irréaliste.

**Lexique interdit domaine :** N/A pour YANA (mobilité, pas santé/finance régulée) — aucune occurrence de "soigne/guérit"/conseil financier personnalisé trouvée.

---

## 7. Chiffres cohérents avec FACTS.md

**VERT.**
- `WALLET_MIN_WITHDRAWAL = 5` dans `src/lib/constants.ts:113` — conforme (FACTS.md : WALLET_MIN=5€).
- Split KARMA `SPLIT_POOL_USERS=50 / SPLIT_POOL_ASSO=10 / SPLIT_POOL_SASU=40` dans `src/lib/constants.ts:109-111` — conforme exactement à 50/10/40 (FACTS.md, ancien 50/10/10/30 absent).
- Parrainage : `referrer_first_percent: 50, referrer_lifetime_percent: 10` (`src/lib/constants.ts:198-199`) — conforme à la résolution PARRAINAGE V4 (N1=50% premier paiement + carte à vie).
- Plans réels et cohérents partout (CGV générées, `src/lib/stripe.ts`, `src/app/pricing/page.tsx` via `PLANS` de `constants.ts`) : **Essentiel 9,99€/mois** (×1), **Infini 49,99€/mois** (×5), **Legende 99,99€/mois** (×10) — plans FACTS.md (9,99/49,99/99,99€) et non les anciens plans Gratuit/Premium 9,99€/83,90€ de l'app copiée-collée. Aucune incohérence trouvée entre CGV, `stripe.ts` et `pricing/page.tsx`.

---

## 8. Migration SQL exécutée sur le schéma `yana`

**NON VÉRIFIABLE depuis cet environnement — à confirmer avant certification finale.**
- Le socle prévoit `packages/legal/sql/001_legal_core.sql` (3 tables : `legal_acceptances`, `cookie_consents`, `account_deletion_requests`, RLS + policies, template `__SCHEMA__` à substituer).
- Aucun fichier `.sql` dans le repo `yana` (`migrations/`, `db/migrations/`, `schema.sql`) ne contient ces 3 tables — la migration a donc été appliquée directement en base (pattern standard écosystème, sed + psql via VPS), pas committée localement.
- Tentative de vérification directe : SSH vers `root@72.62.191.111` **refusée** depuis cet environnement (`Connection refused` port 22) ; déploiement Vercel de `yana.purama.dev` actuellement **`DEPLOYMENT_PAUSED`** (503 sur `/`, `/api/health`, `/mentions-legales`) — impossible de sonder l'app en prod non plus.
- Preuve indirecte (code) : les 4 routes API (`api/legal/accept`, `api/legal/cookie-consent`, `api/legal/my-data`, `api/account/delete`) référencent ces 3 tables avec les noms de colonnes exacts du template SQL (`doc_type`, `accepted_at`, `necessaire/mesure/marketing`, `scheduled_for/status/cancelled_at`), ce qui suggère fortement que la migration a été pensée et codée en cohérence — mais **ne prouve pas l'exécution réelle en base**.
- **Action requise avant certification** : dépaused le déploiement Vercel et/ou vérifier en SSH direct `\dt yana.*` sur le VPS ; si les tables sont absentes, les 4 endpoints légaux 500-eront silencieusement en prod (aucune preuve d'acceptation ne serait alors réellement écrite malgré un code qui semble correct).

---

## 9. `LegalReacceptanceGate` monté ou non

**ROUGE — non monté, gap confirmé (cohérent avec le pattern déjà observé sur la quasi-totalité des apps auditées).**
- Le composant existe (`src/lib/legal/components/LegalReacceptanceGate.tsx`) et est correctement exporté par le barrel `src/lib/legal/index.ts`.
- **Aucun fichier applicatif ne l'importe** : recherche exhaustive (`grep -rn "LegalReacceptanceGate" src/`) ne remonte que sa propre définition et l'export du barrel — jamais dans `src/app/(dashboard)/layout.tsx` ni ailleurs.
- Conséquence concrète : si `CURRENT_LEGAL_VERSIONS` change un jour (bump CGU/CGV suite à une modification substantielle), **aucun utilisateur existant ne sera bloqué pour ré-accepter** la nouvelle version — la promesse faite dans les CGU elles-mêmes ("Toute modification substantielle est signalée à l'utilisateur, dont l'acceptation de la nouvelle version est enregistrée avec horodatage avant toute nouvelle utilisation du service" — `src/lib/legal/content/cgu.ts:67`) est **non tenue en pratique**, faute de montage du gate.
- **Fix attendu** : monter `LegalReacceptanceGate` dans `src/app/(dashboard)/layout.tsx` (ou équivalent racine authentifiée), alimenté par un calcul serveur de `docsEnAttente` via `computeDocsEnAttente` (déjà exporté par `src/lib/legal/versions.ts`) comparé aux lignes `legal_acceptances` de l'utilisateur courant.

---

## Récapitulatif des gaps (4)

| # | Point checklist | Sévérité | Fichier(s) |
|---|---|---|---|
| 1 | Bandeau cookies : mauvais composant monté (résidu `vida_cookie_consent`, pas de sync DB) | ORANGE | `src/app/layout.tsx` → `src/components/shared/CookieBanner.tsx` (au lieu de `src/lib/legal/components/CookieConsentBanner.tsx`) |
| 2 | Déclaration IA absente sur le chatbot SAV `/aide`, et prompt système lui interdisant explicitement de révéler être une IA | ROUGE | `src/app/api/support/escalate/route.ts:58`, `src/app/aide/AideClient.tsx` |
| 3 | Déclaration IA absente sur `/chat` (page liste, premier message envoyable sans disclosure) | ORANGE | `src/app/(dashboard)/chat/page.tsx` |
| 4 | Mécanique d'avis rémunérés via tickets de loterie (`review` dans `TICKET_SOURCES`) | ORANGE | `src/app/(dashboard)/guide/page.tsx:80`, `src/app/api/lottery/status/route.ts:9` |
| 5 | `LegalReacceptanceGate` non monté | ROUGE | absent de `src/app/(dashboard)/layout.tsx` |
| — | Migration SQL socle sur schéma `yana` : non vérifiable (SSH/déploiement inaccessibles depuis cet environnement) | À CONFIRMER | voir §8 |

*(5 gaps listés — 2 ROUGE + 3 ORANGE — le point migration SQL n'est pas compté comme gap faute de preuve négative, mais reste bloquant tant que non confirmé.)*

Le bug de copié-collé documenté dans `ERRORS.md` (contenu CGU/CGV/politique-confidentialite/mentions-légales décrivant une autre app) est **correctement corrigé** dans les 4 fichiers `src/lib/legal/content/*.ts` — mais le rollout n'a pas couvert le montage complet du socle NIYAMA ailleurs dans l'app (gate de réacceptation, disclosure IA sur toutes les surfaces de chat, cookie banner socle vs résidu legacy).

VERDICT:yana:ORANGE:5
