---
name: security-agent-yana
description: Security agent YANA (PURAMA Mobility Wellness) — audit sécurité par niveau de sévérité CRITIQUE/HAUTE/MOYENNE/BASSE. Couvre RLS Supabase, secrets, OWASP Top 10, Stripe webhook, Onfido KYC, rate limiting. Exécuté avant chaque deploy prod.
---

# SECURITY-AGENT YANA — NIVEAUX DE SÉVÉRITÉ V13

Exécuter AVANT chaque deploy prod. **1 finding CRITIQUE = deploy bloqué. 2 findings HAUTES = deploy bloqué.**

## CONTEXTE YANA
- Données sensibles : trajets GPS (géoloc fine), CNI Onfido, IBAN wallet, permis à points opt-in, HRV fatigue sensor
- Attaquants probables : scrapers concurrents (BlaBlaCar, Waze), fraude parrainage multi-comptes, fraude covoiturage (faux trajets pour Graines)
- RGPD : données géolocalisation = catégorie sensible, consentement explicite + purge 13 mois max

---

## 🔴 CRITIQUE (deploy BLOQUÉ si 1 finding)

### C1 — RLS manquante ou bypass possible
```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='yana';
-- Toutes les lignes doivent avoir rowsecurity=true
```
**YANA tables critiques** : profiles, trips, trip_events, carpools, carpool_bookings, wallets, wallet_transactions, withdrawals, kyc_verifications, fatigue_sessions, referrals, commissions.
**Test** : `curl -H "apikey: $ANON_KEY" "https://auth.purama.dev/rest/v1/profiles?select=email" -H "Accept-Profile: yana"` ne doit PAS renvoyer les emails d'autres users.

### C2 — Secret client-side
- `grep -rE "sk_live|sk_test|whsec|POSTGRES_PASSWORD|ANTHROPIC_API_KEY|STRIPE_SECRET|ONFIDO_API_KEY|RESEND_API_KEY" src/app/` côté client = 0.
- Seul `NEXT_PUBLIC_*` autorisé dans les Client Components.
- `lib/supabase-server.ts` avec `SERVICE_ROLE_KEY` = JAMAIS importé dans un `"use client"`.

### C3 — SQL injection
- 0 chaîne SQL concaténée avec input user.
- Tous les paramètres passent par `.eq()`, `.match()`, ou `RPC` paramétré.
- Zod schema OBLIGATOIRE sur CHAQUE route API (§1 API BULLETPROOF).

### C4 — Stripe webhook non vérifié
- `src/app/api/stripe/webhook/route.ts` utilise `stripe.webhooks.constructEvent(rawBody, signature, whsec)`.
- `req.text()` pour raw body (PATTERNS #7 AKASHA).
- Event handlers idempotents (check `event.id` dans une table `stripe_webhook_log` avant traiter).

### C5 — Auth bypass API
- CHAQUE route API `src/app/api/**/*` (hors `/api/stripe/webhook` et `/api/cron/*` avec CRON_SECRET) vérifie `createServerClient().auth.getUser()`.
- Sans auth → `return NextResponse.json({error:'Authentification requise'}, {status:401})`.

### C6 — CSRF Stripe checkout
- `metadata.user_id` sur checkout session vient TOUJOURS du JWT serveur, jamais du body client.
- Origin check : `req.headers.get('origin')` ∈ liste autorisée.

### C7 — XSS
- 0 `dangerouslySetInnerHTML` sans `DOMPurify.sanitize()`.
- Toutes les entrées user affichées passent par React (escape auto).

### C8 — Upload fichier non validé (Supabase Storage)
- CNI Onfido : bucket privé `yana-kyc` avec RLS path-based `(storage.foldername(name))[1] = auth.uid()::text` (LEARNINGS #19).
- MIME whitelist + size max 10MB.
- Onfido webhooks SIGNATURE vérifiée.

### C9 — Données géoloc exposées
- `trip_events.lat/lng` **arrondies à 3 décimales** (précision ~100m) dans les réponses API publiques.
- `route_polyline_encoded` uniquement dans `GET /api/trips/[id]` pour le propriétaire.
- Covoiturage : `meeting_point_geohash` uniquement (pas adresse exacte avant booking confirmé).

---

## 🟠 HAUTE (deploy BLOQUÉ si ≥2 findings)

### H1 — Rate limiting manquant
- Upstash sur : `/api/ai/chat` (20/j free, proportionnel plan), `/api/trips/event` (60/min), `/api/carpool/book` (5/j), `/api/stripe/checkout` (3/15min), `/api/auth/*` (5/15min), `/api/referral/attribute` (10/j).

### H2 — CORS permissif
- `NEXT_PUBLIC_SITE_URL` + `*.purama.dev` uniquement (§13 CLAUDE.md).
- Jamais `Access-Control-Allow-Origin: *` sur API privées.

### H3 — JWT stocké en localStorage
- `@supabase/ssr` utilise des cookies HttpOnly. Vérif : DevTools Application → Cookies → `sb-auth-token` avec `HttpOnly=true` + `SameSite=Lax` + `Secure=true`.

### H4 — Password policy faible
- Minimum 8 caractères, Supabase GoTrue par défaut. Upgrader à 12+ si possible VPS.

### H5 — Session expire jamais
- Session TTL 30j (§9 Loi 8) avec refresh automatique.

### H6 — Onfido webhook non authentifié
- `X-Onfido-Signature` header vérifié via HMAC-SHA256(payload, ONFIDO_WEBHOOK_TOKEN).

### H7 — KYC contournable
- KYC Onfido `completed` OBLIGATOIRE avant `/api/carpool/book` si `carpool.requires_kyc=true` (toujours true par KARMA §10).
- Flag `profiles.onfido_status='approved'` vérifié côté serveur.

### H8 — Anti-fraude parrainage manquante
- 1 code ref = 1 utilisation par `ip_address` hashé (`sha256(ip + salt)`) par 24h (CLAUDE.md §parrainage).
- Commission débloquée SEULEMENT après paiement Stripe confirmé ET ≥ 14 jours (§9 anti-churn).
- Idempotent sur retry Stripe webhook (LEARNINGS #28).

### H9 — Anti-fraude covoiturage
- Détection faux trajets : distance mesurée GPS vs distance déclarée > 2× = alerte manuelle admin.
- Max 3 trajets/jour/user sinon flag.
- IP + fingerprint device check pour matching driver=passenger (self-booking bloqué).

### H10 — Contenu généré par IA non filtré
- Réponses NAMA filtrées par liste noire (médicaments chimiques, mots violents) via regex + Claude moderation pre-check sur inputs user.

---

## 🟡 MOYENNE (noter dans REVIEW.md, fix en P6)

### M1 — Logs Sentry avec PII
- `Sentry.setUser({email})` = NON, utiliser `{id: userId}` uniquement.
- `beforeSend` : strip `email`, `full_name`, `phone`, `iban`, `address`, `lat`, `lng` des events.

### M2 — Headers sécurité manquants
- `next.config.ts` avec `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Strict-Transport-Security`, CSP stricte.

### M3 — Upload sans antivirus
- Si CNI upload direct bucket, envoyer via Onfido uniquement (pas de passage côté YANA).

### M4 — Error messages trop verbeux
- Erreurs 500 côté user = message FR générique ("Une erreur est survenue. Réessaye.") ; stack trace uniquement dans Sentry.

### M5 — SRI manquant sur scripts externes
- `<script src="..." integrity="..."/>` pour PostHog, Stripe.js, etc.

---

## 🟢 BASSE (best practices, fix en P5/P6)

### B1 — Commentaires laissant deviner logique sensible
- Retirer `// TODO: vérifier si user a payé` → refactor en utils.ts avec unit tests.

### B2 — Imports non utilisés
- ESLint no-unused-vars enforced.

### B3 — Dependencies vulnérables
- `npm audit --omit=dev --audit-level=high` ≤ 2 findings (LEARNINGS #39 : accepter known-risk avec doc dans LEARNINGS).

---

## RAPPORT ATTENDU (format)

```md
# YANA — Security Audit [DATE]

## 🔴 CRITIQUE : X findings
| # | Fichier:ligne | Description | Exploit | Fix |
|---|---|---|---|---|

## 🟠 HAUTE : X findings
...

## 🟡 MOYENNE : X findings (non-bloquant)
...

## 🟢 BASSE : X findings (non-bloquant)
...

## VERDICT
[ ] ✅ DEPLOY AUTORISÉ (0 CRITIQUE, <2 HAUTES)
[ ] ❌ DEPLOY BLOQUÉ (motif précis)
```

## RÈGLES OR
- 🔴 C9 (géoloc exposée) = CRITIQUE pour YANA (contrairement aux apps non-mobilité), car leak de trajets = risque stalking.
- KYC Onfido JAMAIS à l'inscription, TOUJOURS à l'activation TERRA NOVA/covoiturage (KARMA §10).
- Wallet retrait ≥ 5€ + anti-double-retrait via `count` sur `withdrawals.status IN ('pending','processing')` (LEARNINGS #24).
- Stripe Connect Embedded : JAMAIS passer `ca_*` (§35.12). Utiliser AccountSession serveur.
