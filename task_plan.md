# YANA — task_plan.md

**App** : YANA (sanskrit यान = véhicule / voyage) — PURAMA Mobility Wellness
**Slug** : `yana` | **Schema** : `yana.*` | **Bundle** : `dev.purama.yana`
**Domaine** : Mobilité voiture + moto — KARMA de la route
**Stack** : Next.js 14+ App Router · TypeScript strict · Tailwind · Supabase self-hosted · Stripe · Playwright · Vercel · Expo 52 (P7)
**Couleurs** : `#F97316` (orange route) + `#0EA5E9` (bleu voyage) + `#7C3AED` (accent éveil NAMA)
**Fonts** : Syne (titles) + Inter (body)
**NAMA** : NAMA-PILOTE (sécurité routière + écoconduite + sagesse voyage)
**Plans VITAE** : Essentiel 9,99€ (×1) · Infini 49,99€ (×5) · Legende 99,99€ (×10)
**Watch** : ❌ pas de Watch initial (P8 optionnel futur)
**OBD-II** : ❌ pas en MVP (accéléromètre+GPS+gyroscope = 80% scoring) — P7+ pour utilisateurs avancés
**Insurance** : positionnement soft "éligible à des remises" (pas de promesse ferme, partenaires en feature avancée)

---

## 🎯 GATES MASTER PROTOCOL (§1 CLAUDE.md) — à passer pour CHAQUE feature

| Gate | Critère |
|---|---|
| G1 | `tsc --noEmit` = 0 erreur |
| G2 | `npm run build` = 0 erreur 0 warning |
| G3 | Test humain (chaque bouton cliqué, chaque formulaire rempli, chaque état vérifié) |
| G4 | Responsive 375px (pas d'overflow, boutons ≥44px, texte lisible) |
| G5 | États complets (loading + error FR + empty + success feedback) |
| G6 | Navigation cohérente (aller + retour possibles de chaque page) |
| G7 | Régression zéro (3 flows critiques : signup→dashboard→feature, parrainage→commission, wallet→retrait) |
| G8 | Code propre (0 TODO, 0 `console.log`, 0 `any`, 0 placeholder, 0 faux contenu) |

**1 gate échouée → corriger AVANT feature suivante. JAMAIS "je ferai après".**

---

## PHASE P0 — Bootstrap (EN COURS)

- [x] Lire CLAUDE.md V7.2 (3×) + KARMA-BRIEF V3 + KARMA_INTEGRATION + LEARNINGS + ERRORS + PATTERNS + AGENTS
- [x] Plan validé par Tissma → "ok, lance P0 puis P1"
- [ ] `task_plan.md` (ce fichier)
- [ ] `progress.md`
- [ ] `.claude/agents/qa-agent.md` (22 points V13)
- [ ] `.claude/agents/security-agent.md` (niveaux sévérité V13)
- [ ] `schema.sql` (23 tables `yana.*` + RLS + triggers + seed 45 aides + missions + affirmations)

## PHASE P1 — Foundation Web

### P1.1 — Scaffold + deps
- [ ] rsync vida-aide → yana (exclure node_modules/.next/.git/.vercel/*.md/progress.md/task_plan.md/schema.sql/mobile)
- [ ] Rebrand package.json (name=yana)
- [ ] Rebrand constants.ts (APP_SLUG, APP_NAME, colors, fonts, NAMA_PILOTE prompt)
- [ ] Rebrand types/index.ts (Vehicle, Trip, TripEvent, Carpool, CarpoolBooking, FatigueSession, TreePlanted)
- [ ] `npm i` → 0 audit high
- [ ] `tsc --noEmit` → 0 erreur

### P1.2 — Env + lib + middleware
- [ ] `.env.local` généré depuis §17 CLAUDE.md (toutes les clés + INSEE + PAPPERS + OpenTimestamps)
- [ ] `src/lib/supabase.ts` — `createBrowserClient` de `@supabase/ssr` avec `schema: 'yana'` (ERRORS §OAuth solution permanente)
- [ ] `src/lib/supabase-server.ts` — `createServerClient` + cookies next/headers
- [ ] `src/lib/claude.ts` — askClaude/streamClaude avec `ANTHROPIC_MODEL_MAIN=claude-sonnet-4-6`
- [ ] `src/lib/nama.ts` — getSystemPrompt('yana') = NAMA-PILOTE persona + 3 lignes rouges
- [ ] `src/lib/stripe.ts` — 3 plans VITAE
- [ ] `src/lib/constants.ts` — SUPER_ADMIN_EMAIL, WALLET_MIN=5, COMPANY_INFO, COLORS_YANA
- [ ] `src/lib/utils.ts` — cn, formatPrice, formatDate, formatDistance, formatDuration, formatCO2
- [ ] `src/middleware.ts` — @supabase/ssr + public paths (/, /pricing, /legal/*, /manifest.json, /robots.txt, /sitemap.xml, /api/*, /go/*, /offline)
- [ ] `useAuth`, `useWallet`, `useReferral`, `useTrip`, `useVehicle`, `useCarpool`, `useFatigue` hooks

### P1.3 — VPS schema + PostgREST
- [ ] scp schema.sql → VPS /tmp/
- [ ] `docker exec -i supabase-db psql -U supabase_admin -d postgres -f /tmp/schema.sql`
- [ ] Ajouter `yana` à `PGRST_DB_SCHEMAS` dans `/opt/supabase/docker/.env`
- [ ] `docker compose up -d --force-recreate rest` (PAS `restart` — ERRORS #75)
- [ ] GRANT USAGE/ALL ON SCHEMA yana TO anon, authenticated, service_role
- [ ] ALTER DEFAULT PRIVILEGES IN SCHEMA yana GRANT ... (INSERT/SELECT/UPDATE/DELETE ON TABLES)
- [ ] NOTIFY pgrst, 'reload schema'
- [ ] Vérif : `curl -H "Accept-Profile: yana" https://auth.purama.dev/rest/v1/profiles?limit=1` → 200 []

### P1.4 — Auth
- [ ] `/login` — email + OAuth Google avec `redirectTo: \`${window.location.origin}/auth/callback\``
- [ ] `/signup` — email + OAuth
- [ ] `/auth/callback/route.ts` — `exchangeCodeForSession` + **attribution parrainage dupliquée path OAuth** (LEARNINGS #27)
- [ ] `/forgot-password`
- [ ] signOut complet : `supabase.auth.signOut()` + clear storage + `window.location.href='/login'` (ERRORS #2)
- [ ] Test humain RÉEL signup email → confirmation → login
- [ ] Test humain RÉEL Google OAuth → dashboard
- [ ] 30j session persist (double vérification via cookies Vercel env)

### P1.5 — Pages statiques
- [ ] `/` — **écran accueil APP** : logo YANA + "Commencer" + "Se connecter" (PAS landing 13 sections, §1 INTERDICTIONS)
- [ ] `/pricing` — 3 cartes VITAE + -33% annuel + **bandeau vert /financer** + 14j essai
- [ ] `/mentions-legales`, `/politique-confidentialite`, `/cgv`, `/cgu` (LEARNINGS #6 JURISPURAMA)
- [ ] `/legal/privacy`, `/legal/terms`, `/legal/cookies`
- [ ] `/subscribe` + `/confirmation` (L221-28, waiver implicite par clic — §21)
- [ ] `/not-found`, `/error`, `/offline`
- [ ] `/how-it-works`, `/ecosystem`, `/status`, `/changelog`
- [ ] `sitemap.xml` + `robots.txt` + `manifest.json`
- [ ] OG images via Satori `/api/og`

### P1.6 — Stripe
- [ ] Créer 3 Products dans Stripe : `prod_yana_essentiel`, `prod_yana_infini`, `prod_yana_legende`
- [ ] 6 Prices : monthly + annual (-33%) pour chaque plan
- [ ] Webhook https://yana.purama.dev/api/stripe/webhook avec events : checkout.session.completed, customer.subscription.(created/updated/deleted), invoice.payment_(succeeded/failed), charge.refunded
- [ ] `whsec_*` → env Vercel
- [ ] `src/app/api/stripe/webhook/route.ts` — raw body + constructEvent + handler chaque event (idempotent)
- [ ] `src/app/api/stripe/checkout/route.ts` — Zod + auth + metadata user_id + trial_period_days=14
- [ ] `src/app/api/stripe/portal/route.ts` — customer portal

### P1.7 — Deploy Vercel
- [ ] `vercel pull --yes --environment=production --token=$VERCEL_TOKEN` (ERRORS #76 pattern prebuilt)
- [ ] `vercel build --prod --yes`
- [ ] `vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN`
- [ ] PATCH `/v9/projects/$ID?teamId=$TEAM` avec `ssoProtection:null` (ERRORS #77)
- [ ] Alias DNS `yana.purama.dev` via Vercel API
- [ ] `curl -s https://yana.purama.dev` → HTTP 200 + HTML renvoyé
- [ ] Lighthouse desktop >90 sur /
- [ ] Safari mobile test manuel

### P1.8 — Handoff P1
- [ ] Commit atomique "P1 — Foundation + Auth + Legal + Deploy"
- [ ] Update `progress.md` (dernier état)
- [ ] Update `LEARNINGS.md` (leçons P1)
- [ ] Update `ERRORS.md` si nouveaux bugs rencontrés
- [ ] **Test humain simulé** : nav privée → signup email → signup Google → dashboard → déconnexion → OK
- [ ] **3 flows critiques (§1 REGRESSION GUARDIAN)** : (1) signup→dashboard, (2) parrainage (pas testé en P1 mais pas cassé), (3) wallet (pas testé en P1 mais pas cassé)
- [ ] "✅ P1 terminé. Relance-moi P2."

---

## PHASE P2 — Core YANA (4 features cœur)

### P2.1 — SAFE DRIVE (scoring conduite)
- [ ] Table `trips` + `trip_events` + `vehicles` déjà en P0 schema
- [ ] `/vehicles` — liste + CRUD véhicules (car/moto)
- [ ] `/drive` — écran "Démarrer trajet" 3 boutons max (règle KARMA §18)
- [ ] Tracking web MVP : `navigator.geolocation.watchPosition` + `DeviceMotionEvent` (fallback)
- [ ] `POST /api/trips/start` — auth + Zod (vehicle_id, start_lat, start_lng)
- [ ] `POST /api/trips/event` — auth + Zod (trip_id, type, severity, lat, lng)
- [ ] `POST /api/trips/end` — auth + calcul safety_score + eco_score + CO2 + Graines earned
- [ ] `/dashboard` — derniers trajets + score moyen + CO₂ total + Graines
- [ ] Anti-slop design check : Tesla dashboard-like (glass + 1 chiffre géant + sparkline)

### P2.2 — GREEN DRIVE (CO₂ + arbres)
- [ ] Seed DB `co2_factors` ADEME officielle
- [ ] Calcul `co2_kg = distance_km × factor(fuel_type)`
- [ ] `/green` — forêt visuelle (grille d'arbres plantés)
- [ ] Trigger plantation : `every 10kg CO2 offset → 1 tree`
- [ ] Intégration Tree-Nation API (context7/tavily AVANT code)
- [ ] Certificat OpenTimestamps par plantation (§35.9)
- [ ] Bouton "Planter maintenant" micro-don 1€

### P2.3 — COVOITURAGE DUAL
- [ ] Table `carpools` + `carpool_bookings` déjà en P0
- [ ] `/carpool` — liste + créer trajet (geohash matching, rayon 10km)
- [ ] `/carpool/[id]` — détail + booking
- [ ] Dual Reward logic : 80% driver + 15% YANA + 5% pool écologique (plantation) + **50 Graines chacun**
- [ ] KYC Onfido déclenché **au 1er booking** (KARMA §10 TRUST)
- [ ] Safe Walk : partage géoloc 3 contacts (KARMA couche 2)
- [ ] Rating mutuel 5 étoiles après trajet

### P2.4 — NAMA-PILOTE (chat IA)
- [ ] `/chat` — streaming SSE Claude (pattern LEARNINGS #21)
- [ ] System prompt NAMA-PILOTE avec 3 lignes rouges + bases expertise
- [ ] Rate limit Upstash 20 msg/j free (multiplier plan × VITAE)
- [ ] Persist conversations + messages via service client (bypass RLS)
- [ ] Mode hands-free préparé (Whisper + ElevenLabs, branché P7)

---

## PHASE P3 — Universels PURAMA

- [ ] `/referral` — 3 niveaux, dashboard filleuls, attribution cookie + OAuth path
- [ ] `/wallet` — solde, historique, retrait IBAN ≥5€, anti-double-retrait (LEARNINGS #24)
- [ ] `/financer` — wizard 4 étapes, 45 aides FR **adaptées mobilité** seedées
- [ ] Bandeau vert `/financer` sur `/pricing`
- [ ] `/contest` + `/lottery` — 25 jeux KARMA (Roue Dharma quotidien, Tournoi mensuel, Jackpot Terre...) + random.org signed
- [ ] `/achievements` — 15 achievements mobilité (Zen Driver, Eco Warrior, Carpool Master...)
- [ ] `/guide` + `/classement` + `/profile` + `/settings` + `/settings/abonnement` (résil 3 étapes §21)
- [ ] `/notifications` + `/invoices`
- [ ] Tutoriel OnboardingFlow (7 étapes spring — LEARNINGS #23)
- [ ] Cinématique intro 3-4s skip
- [ ] Points Purama + `/boutique` + daily gift + anniversaire + cross-promo

---

## PHASE P4 — Admin + SAV ✅ COMPLÈTE (2026-04-24)

- [x] `/admin/*` — super_admin dashboard (users, withdrawals, tickets, contests) — commit `09bdb84`
- [x] `/aide` — FAQ 15 articles + search fuzzy NFD + accordion catégorisé + 👍 helpful — commit `2de1282`
- [x] Chatbot IA "NAMA Assistant" expert (tutoie, emojis, jamais "IA") via Claude Haiku + FAQ strict source
- [x] Formulaire escalade `/api/support/escalate` → Resend → purama.pro@gmail.com + ticket DB
- [x] n8n CRONs (handoff `CRON_YANA_n8n.md`) : classement-weekly + tirage-monthly + daily-gift-reset + trigger-closure admin — commit `4cca68d`

---

## PHASE P5 — Design polish + Anim + i18n + Éveil ✅ COMPLÈTE (2026-04-24)

- [x] `next-intl` 16 langues — déjà branché P1 (16 messages/*.json + i18n/{config,request}.ts + LocaleSwitcher + /api/locale)
- [x] Switcher langue audit visuel FR→EN→AR (RTL) sur / — 16/16 locales zéro MISSING_MESSAGE — commit `caad25c`
- [x] Dark/Light + **oled** thème fonctionnel (ERRORS #4) — commit `21471e6`
- [x] Affirmations quotidiennes mobilité — seed 15 existants + API déterministe + widget dashboard — commit `21471e6`
- [x] Citations voyage footer (Rumi, Bashō, Lao Tseu, Saint-Exupéry) — rotation déterministe daysSinceEpoch % 4 — commit `caad25c`
- [x] `/breathe` 4-7-8 — cercle animé 2/4/6/8 cycles — commit `a45b3f0`
- [x] `/gratitude` journal — commit `a45b3f0`
- [x] `/intention` début de trajet — commit `a45b3f0`
- [ ] `SpiritualLayer` + `SubconsciousEngine` composants avancés — **déféré P6**
- [x] Homepage 3 blocs above-fold — Hero3D + 3 practices Safe/Green/Carpool + LiveCounters + TravelQuote — commit `caad25c`
- [x] Hero3D R3F route infinie — shader GLSL grid orange/cyan + Stars drei + montage post-LCP requestIdleCallback — commits `f8ae3aa` `caad25c` `55a17a4`
- [ ] 10 emails Resend sequences — **déféré P6**
- [ ] Notifs push intelligentes engagement score — **déféré P6**
- [x] Anti-slop validation homepage — score mental 8/10 + Lighthouse Perf 97 · A11y 96 · BP 100 · SEO 100 · LCP 1719ms · CLS 0 — commit `55a17a4`
- [ ] Polish 13 locales i18n home.* (fallback EN → natif) — **déféré P6** (es/de/it/pt/zh/ja/ko/hi/ru/tr/nl/pl/sv)
- [x] Fix dette `--accent-primary` CSS var non définie (§ISSUES #2 progress.md) — définie dans les 3 thèmes — commit `f8ae3aa`

---

## PHASE P6 — QA + Security sub-agents

- [ ] Playwright 21 SIM complet
- [ ] 113 tests si applicable (§testing.md)
- [ ] Lighthouse ≥90 sur 4 pages clés (home, dashboard, pricing, carpool list)
- [ ] qa-agent.md exécuté (22 points)
- [ ] security-agent.md exécuté (niveaux sévérité)
- [ ] Fix max 10, au-delà `/clear`

---

## PHASE P7 — Mobile Expo (iOS + Android)

- [ ] `create-expo-app` + NativeWind + reanimated + Zustand + expo-router
- [ ] Bundle `dev.purama.yana`
- [ ] `lib/supabase.ts` SecureStore adapter (§16 CLAUDE.md — CRITIQUE)
- [ ] Tracking natif : `expo-location` (background) + `expo-sensors` (accel+gyro)
- [ ] `lib/health.ts` cross-platform : `react-native-health` (iOS HealthKit) + `react-native-health-connect` (Android) — fatigue HRV/sleep (§36.3)
- [ ] `lib/screen-time.ts` (§36.4) : FamilyControls iOS + UsageStats Android — mode No-Phone-While-Driving opt-in
- [ ] **Moto Mode** : écran ultra-simplifié (3 gros boutons, notifs haptique, voix NAMA on)
- [ ] Icônes Pollinations+sharp (icon 1024², adaptive 1024² pad 100px, splash, feature)
- [ ] `app.json` + `eas.json` complets
- [ ] Maestro 10 flows YAML + testID
- [ ] `store.config.json` 16 langues
- [ ] `GOOGLE_PLAY_SETUP.md` personnalisé (3 min clics Tissma)
- [ ] GitHub Actions `.eas/workflows/full-deploy.yaml` (push main → build+test+submit)
- [ ] EAS build + submit iOS (boutons neutres §23) + Android
- [ ] **iOS boutons neutres** : "Continuer" / "Activer" (§23) — jamais "S'abonner" visible
- [ ] Deep link `yana://activate` + `.well-known/apple-app-site-association`
- [ ] OBD-II BLE via `react-native-ble-plx` **feature avancée** (pas MVP)

---

## PHASE P8 — Watch (OPTIONNEL futur)

- [ ] ❌ **Pas de Watch en version initiale** (décision Tissma 2026-04-23)
- [ ] Si activé plus tard : complication cadran score safety + streak + fatigue warning

---

## 📋 TRACKING

| Phase | Statut | Commit | Deploy | Notes |
|---|---|---|---|---|
| P0 | ✅ | - | - | Bootstrap artefacts |
| P1 | ✅ | - | live | Structure + Auth + DB + 45 aides seeded |
| P2 | ✅ | `8595589` | live yana.purama.dev | SAFE DRIVE + GREEN DRIVE + COVOITURAGE + NAMA-PILOTE |
| P3 Session A | ✅ | `36affb2` | live | /referral + /wallet + /financer wizard + /contest + /lottery |
| P3 Session B | ✅ | `a90b16b` | live | /achievements, /guide, /profile, /settings, tuto, daily gift, anniversaire, cross-promo |
| P4 | ✅ | `4cca68d` | live | Admin + Aide + FAQ + SAV chatbot NAMA + 3 CRONs n8n-ready + trigger admin |
| P5.1+5.2 | ✅ | `a45b3f0` | live | Theme 3 modes + Affirmation + /breathe /gratitude /intention |
| P5.3 | ✅ | `55a17a4` | live yana.purama.dev | Hero3D R3F + homepage 3 blocs + i18n 16 langues + Lighthouse Perf 97 |
| P6 | ⏳ | - | - | QA + Security sub-agents + Lighthouse |
| P7 | ⏳ | - | - | Mobile Expo + EAS + stores |
| P8 | ❌ | - | - | Pas en version initiale |
