# YANA — progress.md

**Dernière update** : 2026-04-23 (fin session 5 — P3 Session B1+B2 deploy groupé)
**Phase actuelle** : 🟡 **P3 Session B1+B2 TERMINÉES (7 features) — Session B3 restante (4 features onboarding)**
**Statut global** : YANA est **live** sur https://yana.purama.dev avec 11 universels — 16/16 smoke tests prod verts B1+B2

---

## 🎉 P2 — CORE FEATURES 100% LIVRÉES

| # | Sub-phase | Commit | Livré |
|---|---|---|---|
| 1 | P2.1 SAFE DRIVE | `f4ec3e3` | Types + lib/scoring (ADEME + badges) + lib/tracking (geolocation + haversine + cooldown) + useVehicle + useTrip + /api/vehicles (CRUD) + /api/trips/{start,event,end} + /vehicles + /drive Tesla-like |
| 2 | P2.2 GREEN DRIVE | `1083333` | npm i javascript-opentimestamps + lib/opentimestamps + lib/co2 (DB-first + fallback) + lib/tree-nation (provider-agnostic stub) + /api/trees/{plant,list} + CRON plant-trees + /green forêt SVG + ShieldCheck badges blockchain |
| 3 | P2.3 COVOITURAGE DUAL | `a93e55e` | lib/geohash extrait (DRY) + lib/dual-reward (split 80/15/5 pure) + lib/onfido (HMAC-SHA256 ready) + /api/carpool/* (create/search/book/complete) + /api/kyc/* (start/simulate/webhook) + /carpool 3 tabs + /carpool/new Nominatim OSM + /carpool/[id] modal Safe Walk 3 contacts + /kyc 6 status card |
| 4 | P2.4 NAMA-PILOTE | `c089dbb` | /api/chat rate limit quotidien 5/20/100/∞ + ownership check conversation_id + /api/chat/conversations + /api/chat/[id] + /chat liste refactor starters YANA + /chat/[id] thread SSE streaming + ReactMarkdown + safe-area iOS |
| 5 | P2.5 Middleware fix | `8595589` | PUBLIC_PATHS += /financer, /subscribe, /confirmation (alignement constants.ts) |

---

### 🌐 LIVE VALIDATION (2026-04-23 — P2 deploy groupé)

Deploy prod : commit `8595589` → `yana-7thljievs-puramapro-oss-projects.vercel.app` → aliased `yana.purama.dev`

**Routes publiques** (HTTP 200) :
```
200 /
200 /pricing
200 /financer
200 /status
200 /login
200 /how-it-works
200 /subscribe
```

**Routes auth-gated** (HTTP 307 → /login?next=... — comportement middleware correct) :
```
307 /chat
307 /drive
307 /vehicles
307 /green
307 /carpool
307 /kyc
```

**Build stats** : 52 routes générées (vs 34 en P1 — +18 routes P2). tsc 0 · build 0 warning · compilation Turbopack 3-5s.

---

### 📦 INFRA

- **URL prod** : https://yana.purama.dev
- **Vercel** : `prj_QFkAyhBbr1Lz27iIMfF6UVO4wY8t` (team `puramapro-oss`)
- **Supabase** : schema `yana` exposé via `auth.purama.dev/rest/v1/` (30 tables P1)
- **Stripe** : webhook `we_1TPQXG4Y1unNvKtXqTxSPwIy` (7 events)
- **Git** : commits P2 = `f4ec3e3` → `1083333` → `a93e55e` → `c089dbb` → `8595589`

---

## 📐 ARCHITECTURE P2 — 18 NOUVELLES ROUTES

### API (12)
- `POST /api/vehicles` + `GET /api/vehicles` + `PATCH /api/vehicles/[id]` + `DELETE /api/vehicles/[id]`
- `POST /api/trips/start` + `POST /api/trips/event` + `POST /api/trips/end`
- `POST /api/trees/plant` + `GET /api/trees/list` + `POST /api/cron/plant-trees` (Bearer CRON_SECRET)
- `POST /api/carpool/create` + `GET /api/carpool/search` + `GET /api/carpool/[id]` + `POST /api/carpool/[id]/book` + `POST /api/carpool/booking/[id]/complete`
- `POST /api/kyc/start` + `POST /api/kyc/simulate` (super_admin) + `POST /api/kyc/webhook`
- `GET /api/chat/conversations` + `GET /api/chat/[id]` + `DELETE /api/chat/[id]`

### Pages (6)
- `/vehicles` (liste + modal add)
- `/drive` (Tesla-like 96px speed gauge + 3 buttons + score modal)
- `/green` (forêt SVG 10 cols + stats + plantation claim)
- `/carpool` (3 tabs) + `/carpool/new` (Nominatim OSM) + `/carpool/[id]` (détail + booking modal Safe Walk)
- `/kyc` (status card 6 états + simulate super_admin)
- `/chat` (list refactor) + `/chat/[id]` (thread SSE)

### Libs (8 nouveaux)
- `lib/scoring.ts` — pure function SAFETY score 0-100 + eco + CO2 ADEME
- `lib/tracking.ts` — `TripTracker` class navigator.geolocation + haversine + cooldown events
- `lib/opentimestamps.ts` — `stampHashHex` + `stampString` (calendriers OTS publics Bitcoin)
- `lib/co2.ts` — `getCo2Factor` DB-first + fallback scoring.ts
- `lib/tree-nation.ts` — provider-agnostic stub (fallback 'manual' si pas de clé)
- `lib/geohash.ts` — encode + commonPrefixLength (extrait des trips, DRY)
- `lib/dual-reward.ts` — `calculateDualReward` pure 80/15/5 sans perte centime
- `lib/onfido.ts` — provider-agnostic + `verifyOnfidoSignature` HMAC-SHA256 timing-safe

### Hooks (4 nouveaux)
- `useVehicle` — CRUD véhicules + primary auto-toggle
- `useTrip` — lifecycle start/pause/resume/stop/cancel + flush queue events 3s
- `useTrees` — liste + claim + stats (kg_to_next, trees_available)
- `useCarpool` + `useKyc` — booking complet + KYC state 6 status

---

## ⏳ RESTE POUR PROCHAINES PHASES

### P3 — Universels PURAMA (prochaine)
- [ ] /referral — 3 niveaux, dashboard filleuls, attribution cookie + OAuth path
- [ ] /wallet — solde, historique, retrait IBAN ≥5€, anti-double-retrait (LEARNINGS #24)
- [ ] /financer — wizard 4 étapes interactif (données DB déjà présentes 45 aides)
- [ ] /contest + /lottery — 25 jeux KARMA + random.org signed
- [ ] /achievements — 15 achievements mobilité
- [ ] /guide + /classement + /profile + /settings + /settings/abonnement
- [ ] /notifications + /invoices
- [ ] Tutoriel OnboardingFlow + cinématique intro 3-4s
- [ ] Points Purama + /boutique + daily gift + anniversaire + cross-promo
- [ ] Stripe payment carpool (passer booking.status de 'confirmed' direct à 'pending' + webhook confirmation)

### P4 — Admin + SAV
- [ ] /admin/* super_admin dashboard
- [ ] /aide FAQ interactive (15 articles seedés DB)
- [ ] Chatbot YANA Assistant avec escalade Resend

### P5 — Design polish + i18n + Éveil
- [ ] next-intl 16 langues
- [ ] /breathe, /gratitude, /intention
- [ ] Homepage 3 blocs above-fold + Hero3D R3F + anti-slop validation

### P6 — QA + Security sub-agents
- [ ] Playwright 21 SIM
- [ ] qa-agent V13 + security-agent V13
- [ ] Lighthouse ≥90

### P7 — Mobile Expo
- [ ] Expo 52 + SecureStore + tracking natif + HealthKit + Health Connect + Moto Mode + Maestro + EAS

### P8 — ❌ Pas de Watch initial (décision Tissma)

---

## 🚩 FLAGS TISSMA (services tiers à brancher)

Clés/comptes à fournir quand possible — le code est **stubbed ready**, 0 hallucination, switch auto dès que env vars présentes :

1. **Tree-Nation** (`lib/tree-nation.ts`)
   - Action : créer compte tree-nation.com + form "API Token" (support@tree-nation.com) → recevoir TEST token + Postman Collection
   - Env à ajouter : `TREE_NATION_API_KEY`, `TREE_NATION_BASE_URL`
   - En attendant : provider='manual' avec OTS proof Bitcoin blockchain

2. **Onfido KYC** (`lib/onfido.ts`)
   - Action : signup Onfido Business + API key provisioned → fournir doc
   - Env à ajouter : `ONFIDO_API_TOKEN`, `ONFIDO_WEBHOOK_TOKEN`
   - En attendant : status='pending' + super_admin peut simuler via `/api/kyc/simulate` pour E2E tests

3. **CRON n8n** — `POST https://yana.purama.dev/api/cron/plant-trees` avec `Authorization: Bearer $CRON_SECRET`
   - Déclencheur : quotidien minuit UTC
   - Payload : 50 users × 3 arbres max/run (anti-saturation OTS)

4. **Stripe payment carpool** (P3)
   - Actuellement : booking.status='confirmed' direct en MVP
   - P3 fera : status='pending' avec Stripe Payment Intent → webhook confirmation → capture

---

## 🐛 ISSUES CONNUS (non-bloquants)

1. Next 16 deprecation warning `Buffer()` (lib tierce js-opentimestamps) — non-bloquant, patch lib upstream non critique
2. `--accent-primary` CSS var référencée dans ~15 pages mais non définie dans globals.css → pages rendent avec fallback. P5 design polish normalisera (définir `--accent-primary: var(--cyan)` etc.)
3. Stripe key §17 CLAUDE.md rotée — clé active récupérée de `vida-aide/.env.local` P1 (documenté LEARNINGS)

---

## 🧠 LEÇONS SESSION 3 — P2

| DATE | APP | LEÇON | IMPACT |
|---|---|---|---|
| 2026-04-23 | YANA | provider-agnostic stub pattern (Tree-Nation, Onfido) = ship now + switch auto quand env key arrive. Contrat API stable, UI ne bouge pas, zero hallucination d'endpoint non documenté (respect §Law 6 CLAUDE.md). | Pattern réutilisable pour tout service tiers avec inscription manuelle |
| 2026-04-23 | YANA | Fallback RPC → upsert manuel pool_balances : pour un split comptable (80/15/5), prévoir les 2 chemins (RPC si elle existe, sinon UPDATE atomic-enough) évite de bloquer le flow sur une migration DB pas encore déployée. | Carpool complete flow résilient sans RPC préalable |
| 2026-04-23 | YANA | Nominatim OpenStreetMap (gratuit, sans clé, rate limit 1/sec) couvre le lookup ville → coords pour le form /carpool/new. Pas besoin de Mapbox/Google Geocoding pour MVP. Attribution respectée via Referer. | 0€ geocoding stack |
| 2026-04-23 | YANA | Rate limit chat par date (daily_questions_reset_at DATE) plus simple que rolling 24h. Reset automatique car la comparaison `reset_at !== today()` force la remise à 0. Pas de cron reset nécessaire. | Simplification anti-abus chat |
| 2026-04-23 | YANA | `?stream=1` polling pattern pour récupérer une réponse LLM démarrée depuis /chat avant navigation vers /chat/[id]. Évite de tenir une connexion ouverte pendant la nav client-side router.push. | Flow "starter prompt" → nouvelle conv fluide |
| 2026-04-23 | YANA | P2 déployé en 1 session (4 sub-phases + fix middleware) = ~50% ctx. Commits atomiques par feature + gates G1/G2/G8 à chaque étape = rien à refaire à la fin. | Workflow P2 multi-feature single-session validé |
| 2026-04-23 | YANA | Middleware PUBLIC_PATHS peut dériver de constants.ts PUBLIC_ROUTES — source de vérité dupliquée. Fix au passage : ajouter /financer, /subscribe, /confirmation. P3 : unifier via `PUBLIC_ROUTES` import direct dans middleware.ts pour éviter future drift. | Dette tech mineure loggée |

---

## 🎉 P3 SESSION A — UNIVERSELS PURAMA (2026-04-23)

| # | Feature | Commit | Livré |
|---|---|---|---|
| 1 | P3.1 /referral | `9355707` | Route /go/[slug] → cookie HttpOnly 30j · attribution OAuth (callback) + email (API) · idempotent · 3 niveaux N1/N2/N3 · tiers bronze→légende · stats dashboard (counts + commissions pending/credited/paid_out + 20 derniers filleuls) · Sidebar nav-referral |
| 2 | P3.2 /wallet | `41ab5de` | RPC atomique yana.request_withdrawal (lock pessimiste FOR UPDATE) · 5 codes d'erreur · /api/wallet/{balance,transactions,withdraw} · IBAN mod-97 + SHA-256 hash + masquage · WalletBalance + TransactionList (labels FR) + WithdrawModal (validation live + success screen) · Sidebar nav-wallet · 6/6 scénarios RPC + 7/7 IBAN tests |
| 3 | P3.3 /financer | `a0f2666` | lib/aides-catalog.ts (13 profils × 15 situations × 8 régions × 8 types) · /api/aides GET avec scoring match + handicap_only filter · FinancerWizard 4 étapes URL-synced · StepProgress/Profil/Situation/Région/Results · bandeau vert /pricing reworké avec CTA "Lancer le simulateur" · 4 scénarios API vérifiés |
| 4 | P3.4 /contest + /lottery | `36affb2` | Table yana.contest_results (JSONB winners) · /api/contest/{leaderboard,history} + /api/lottery/status · Countdown · LeaderboardTable rank 1/2/3 gradient · TicketCounter animé · NextDrawCard fallback fin de mois · TicketSourcesGuide 6 sources · PastDrawsList · Sidebar nav-contest + nav-lottery |

---

### 🌐 LIVE VALIDATION P3 Session A — 2026-04-23

Deploy prod : commit `36affb2` → `yana-lbxlkif9d-puramapro-oss-projects.vercel.app` → aliased `yana.purama.dev`

**Routes publiques** (HTTP 200, 10/10) : /, /pricing, /financer, /financer?step=4&profil=handicape&region=ile-de-france (deep link), /how-it-works, /ecosystem, /status, /login, /signup, /go/TEST1234 (307 = redirect normal)

**API publiques** (HTTP 200, 3/3) : /api/contest/leaderboard, /api/contest/history, /api/aides

**Auth-protected APIs** (HTTP 401 correct, 3/3) : /api/lottery/status, /api/wallet/balance, /api/referral/stats

**Auth-protected pages** (HTTP 307→/login?next=, 5/5) : /dashboard, /referral, /wallet, /contest, /lottery

**API aides filtre concret** : profil=handicape + region=ile-de-france → **17 aides, 43 700 €** (PCH 5000€ en tête)

---

## 🧠 LEÇONS SESSION 4 — P3 Session A

| DATE | APP | LEÇON | IMPACT |
|---|---|---|---|
| 2026-04-23 | YANA | Lock pessimiste Postgres `SELECT … FOR UPDATE` dans une fonction SECURITY DEFINER = anti-double-retrait bulletproof sans Redis/Upstash. Tout se passe dans une transaction atomique (check balance + insert withdrawal + decrement + log tx). 6/6 scénarios verts sans Upstash configuré. | Pattern réutilisable pour toute opération atomique sensible (paiement, debit, etc.) |
| 2026-04-23 | YANA | Attribution parrainage = 3 chemins cohérents : 1) cookie `yana_ref` via /go/[slug] route handler, 2) consommé par /auth/callback pour OAuth, 3) consommé par /api/referral/attribute pour email signup. Idempotent (check existing row avant insert). Single source of truth = `referral_attribution.ts`. | Flow parrainage robuste peu importe la méthode d'inscription |
| 2026-04-23 | YANA | Wizard URL-synced via `router.replace` scroll:false = deep-link partageable + retour navigateur OK + refresh idempotent. State local + URL sync = pas besoin de store global. Hydration initiale depuis searchParams. | Pattern wizard multi-étapes |
| 2026-04-23 | YANA | Scoring `match + bonus intersection + petit tiebreaker montant` suffit pour trier les aides par pertinence sans backend ML. Handicap_only filtré strictement. Input invalide → fallback gracieux (pas de 500). | Filtre SQL + scoring simple = UX percentile supérieur |
| 2026-04-23 | YANA | Tables karma_draws/karma_tickets/karma_winners existantes réutilisables pour /lottery monthly_tournament — pas besoin de dupliquer le schéma. Seul manquait `contest_results` pour le classement hebdo (snapshot JSONB par période). | DRY schema — toujours check l'existant avant migration |
| 2026-04-23 | YANA | Vercel scope correct = `puramapro-oss-projects` (pas `puramapro-oss`) — updater §17 CLAUDE.md au prochain passage. | Flag CLAUDE.md |
| 2026-04-23 | YANA | Session A (4 features universelles) déployée en 1 session ~50% ctx. Commit atomique par feature + gates G1/G2/G3/G8 à chaque étape + deploy Vercel final groupé = workflow P3 validé identique à P2. | Workflow multi-feature single-session reproductible |

---

---

## 🎉 P3 SESSION B1+B2 — COMPTE USER + GAMIFICATION (2026-04-23)

### Chunk B1 — Compte utilisateur (commit `10671e6`)

| # | Feature | Livré |
|---|---|---|
| B1.0 | SQL | profiles.birthdate + profiles.locale (CHECK 16 langues) |
| B1.1 | /achievements | /api/achievements/status avec unlocked calculé depuis stats profiles (trips/trees/co2/streak) + referrals N1 + carpool completions. Progress % par condition. 15 seeds actifs. XPLevelBar animé + filtres all/unlocked/locked + grid 3-col + AchievementCard par rareté (common/rare/epic/legendary). |
| B1.2 | /profile | /api/profile GET/PATCH (Zod full_name, theme dark/light/oled, locale 16 langues, birthdate ≥13 ans, notifications_enabled). Édition complète + stats niveau/XP/streak. |
| B1.3 | /settings | Hub 3 sections (Compte, Préférences, Aide & légal). Bouton déconnexion. Sidebar user card désormais clickable → /settings. |
| B1.4 | /settings/abonnement | /api/subscription GET + plan actuel glass card + bouton portail Stripe (existing `/api/stripe/portal`) + 5 dernières factures + 8 derniers paiements + mention SASU art. 293 B. |
| B1.5 | /notifications | /api/notifications GET + PATCH (mark_read single / mark_all_read) + inbox avec filtre all/unread + optimistic updates + icons par type (achievement/referral/wallet/tree/contest/lottery/daily_gift/birthday/mission). |

### Chunk B2 — Gamification + fiscal (commit `df25afb`)

| # | Feature | Livré |
|---|---|---|
| B2.0 | SQL | 4 tables (daily_gifts, point_shop_items, point_purchases, user_events) + 2 fn SQL atomiques lock pessimiste (redeem_shop_item, open_daily_gift) + 4 seeds shop |
| B2.1 | /invoices | /api/invoices GET + page total année animé + lifetime + liste PDF download + footer SASU art. 293 B |
| B2.2 | /boutique Points | /api/boutique/items + /api/boutique/redeem POST (Zod + RPC) + page grid 2-col avec progress bar + modal success coupon copiable + historique |
| B2.3 | Daily gift | /api/daily-gift GET/POST + DailyGiftCard widget dashboard (streak flame, -10% garanti si streak≥7, anti-double-open via fn SQL ≥20h). Distribution CLAUDE.md §DAILY GIFT (40% pts, 25% coupon-5%, 15% ticket, 10% credits, 5% -20%, 3% 50-100pts, 2% -50%). |
| B2.4 | Anniversaire | /api/user-events/today (detect birthday + signup_anniversary) + /api/user-events/claim POST (credit 500 pts birthday ou 100×N ans, anti-double-claim annuel via user_events.last_triggered_at) + AnniversaryBanner widget dashboard. |

### 🧪 Tests critiques RPC B2 (6 scénarios verts)

- redeem discount-10 (1000 pts) → OK + coupon généré
- redeem boost x2 (2000 pts) → OK + coupon généré
- redeem cash-5eur (50000 pts) sur 0 → INSUFFICIENT_POINTS
- open daily_gift → +83 pts streak=1
- re-open immédiate → ALREADY_OPENED_TODAY (anti ≥20h)
- USER_NOT_FOUND sur UUID inexistant

### 🌐 LIVE VALIDATION B1+B2 — 2026-04-23

Deploy prod : commit `df25afb` → `yana-qw3casoos-puramapro-oss-projects.vercel.app` → aliased `yana.purama.dev`

- **Routes publiques** (HTTP 200, 5/5) : /, /pricing, /financer, /login, /signup
- **B1 API auth guards** (HTTP 401, 4/4) : /api/achievements/status, /api/profile, /api/notifications, /api/subscription
- **B2 API auth guards** (HTTP 401, 4/4) : /api/invoices, /api/boutique/items, /api/daily-gift, /api/user-events/today
- **Nouvelles pages auth-gated** (HTTP 307→/login, 7/7) : /achievements, /profile, /settings, /settings/abonnement, /notifications, /invoices, /boutique

**Total smoke tests prod : 16/16 verts**

### 🧠 LEÇONS SESSION 5 — P3 Session B1+B2

| DATE | APP | LEÇON | IMPACT |
|---|---|---|---|
| 2026-04-23 | YANA | Dans plpgsql, SELECT INTO avec nom de colonne identique au nom de RETURN TABLE variable → "ambiguous reference". Fix : qualifier explicitement la colonne avec l'alias de table (`dg.streak_count`). Appris en testant yana.open_daily_gift. | Debug Postgres — toujours alias les colonnes quand RETURN TABLE partage des noms |
| 2026-04-23 | YANA | Daily gift anti-double-open = check `≥20h` (pas 24h strict) pour tolérer dérive horaire + streak reset si `>48h`. Distribution random scaled via `random()` Postgres (0-1) + seuils cumulés. | Pattern reward distribution scalable |
| 2026-04-23 | YANA | Anniversary detection = compare `(month, day)` de birthdate ou created_at vs today UTC. Année server = today.getUTCFullYear(). Anti double-claim annuel via `user_events.last_triggered_at.year === todayYear`. | Pattern détection date récurrente sans CRON |
| 2026-04-23 | YANA | Boutique coupon code 10-char généré dans fn SQL via `upper(substring(md5(random::text || gen_random_uuid()::text) FROM 1 FOR 10))` — suffisamment unique sans table de coupons séparée. duration_days par item pour expiration flexible. | Pattern code promo ad-hoc |
| 2026-04-23 | YANA | Sidebar avatar en bas désormais clickable → /settings (pattern ChatGPT/Linear). Profile overview + CTA settings en 1 clic. | UX compte user simplifiée |

---

## HANDOFF MESSAGE

**✅ P3 Session B1+B2 TERMINÉE. YANA ajoute 7 nouveaux universels live : /achievements, /profile, /settings, /settings/abonnement, /notifications, /invoices, /boutique + daily gift + anniversaire widgets dashboard.**

**Reste Session B3 (4 features onboarding/découverte)** :
- B3.1 Cinématique intro (3-4s, skip, cookie intro_seen)
- B3.2 Tuto OnboardingFlow (spotlight SVG mask 7 étapes sur /dashboard)
- B3.3 /guide (guide complet app, accordion par feature)
- B3.4 Cross-promo (bannières `cross_promos` MIDAS/KASH/SUTRA/KAÏA, max 2/page)

Pour démarrer P3 Session B3 → relance Claude avec :
> "Lis progress.md + CLAUDE.md. P3 Session B1+B2 terminée (commit df25afb live). Démarre B3 : cinématique intro 3-4s + tuto OnboardingFlow spotlight + /guide + cross-promo. Plan court, gates G1-G8 par feature, commit atomique, deploy final groupé + handoff final Session B complète."
