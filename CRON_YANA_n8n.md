# YANA — Handoff CRONs n8n

Configurer 5 workflows sur `n8n.srv1286148.hstgr.cloud`.

## Secrets requis

- `CRON_SECRET` (déjà présent dans `.env.local` et Vercel env vars)

## 1. Classement hebdomadaire — dimanche 23:59 UTC

- **Trigger** : `Schedule Trigger` → cron expression `59 23 * * 0`
- **HTTP Request** :
  - Méthode : `POST`
  - URL : `https://yana.purama.dev/api/cron/classement-weekly`
  - Headers : `Authorization: Bearer {{$env.CRON_SECRET}}`
  - Timeout : 60000 ms
- **Post-processing** : si réponse `status=done`, logger `winners_count` + `total_pool_cents` dans BetterStack.
- **Idempotence** : l'endpoint skip automatiquement si `contest_results` existe déjà pour cette période (la ré-exécution manuelle ne crée pas de doublon).

## 2. Tirage mensuel — dernier jour du mois 23:59 UTC

- **Trigger** : `Schedule Trigger` → cron expression `59 23 L * *` (si n8n supporte `L`) sinon 5 jobs séparés (28/29/30/31 chaque mois).
  - Alternative robuste : `59 23 28-31 * *` + check in-workflow `if new Date(Date.now()+24*3600000).getDate() === 1` → run ; sinon skip.
- **HTTP Request** :
  - Méthode : `POST`
  - URL : `https://yana.purama.dev/api/cron/tirage-monthly`
  - Headers : `Authorization: Bearer {{$env.CRON_SECRET}}`
  - Timeout : 60000 ms
- **Comportement** : sélection aléatoire crypto-safe de 10 users uniques parmi ceux ayant des `karma_tickets` créés dans le mois. 1 user = 1 chance max peu importe le nombre de tickets.

## 3. Daily gift cleanup — tous les jours 00:00 UTC

- **Trigger** : `Schedule Trigger` → cron expression `0 0 * * *`
- **HTTP Request** :
  - Méthode : `POST`
  - URL : `https://yana.purama.dev/api/cron/daily-gift-reset`
  - Headers : `Authorization: Bearer {{$env.CRON_SECRET}}`
- **Objectif** : stats monitoring (coffres ouverts 24h, streaks actifs). La logique de reset streak vit déjà dans la fonction SQL `open_daily_gift`.

## 4. Plantation d'arbres — existant (quotidien minuit UTC)

- URL : `https://yana.purama.dev/api/cron/plant-trees`
- Déjà documenté dans `progress.md` P2.

## 5. Emails lifecycle — tous les jours 09:00 UTC

- **Trigger** : `Schedule Trigger` → cron expression `0 9 * * *`
- **HTTP Request** :
  - Méthode : `POST`
  - URL : `https://yana.purama.dev/api/cron/emails/daily`
  - Headers : `Authorization: Bearer {{$env.CRON_SECRET}}`
  - Timeout : 300000 ms
- **Comportement** : scan profiles âgés 0→37j, envoie le template daily approprié (J0/1/3/7/14/21/30) si pas déjà envoyé. Fenêtre d'acceptation = 7j (email J7 skip si user est à J20 sans l'avoir reçu). Idempotent via `email_sequences` unique index.
- **Réponse** : `{ ok: true, stats: { scanned, eligible, sent, skipped, errors } }`
- **Alerting** : alerter si `stats.errors.length > 0` pendant 3 runs consécutifs (Resend down ou template cassé).
- **Trigger events inline** (pas CRON) : `/api/email/event` est appelé depuis `/api/cron/classement-weekly` et `/api/stripe/webhook` avec body `{ kind, user_id, payload }`. Aucune config n8n séparée.

## Test manuel depuis l'admin

Super-admin peut déclencher manuellement `classement-weekly` ou `tirage-monthly` depuis `/admin/contests` :
- Bouton « Forcer la clôture maintenant » sur chaque card
- Appelle `POST /api/admin/contests/trigger-closure { target: 'weekly'|'monthly' }`
- Re-relaye en interne vers le CRON avec `Bearer CRON_SECRET`

## Test curl

```bash
SECRET=$(grep ^CRON_SECRET= .env.local | cut -d= -f2)
curl -X POST -H "Authorization: Bearer $SECRET" https://yana.purama.dev/api/cron/classement-weekly
curl -X POST -H "Authorization: Bearer $SECRET" https://yana.purama.dev/api/cron/tirage-monthly
curl -X POST -H "Authorization: Bearer $SECRET" https://yana.purama.dev/api/cron/daily-gift-reset
curl -X POST -H "Authorization: Bearer $SECRET" https://yana.purama.dev/api/cron/emails/daily
```

## Observabilité

Tous les endpoints CRON retournent JSON `{ ok, status, ... }`. Réponses HTTP :
- `200 ok` → succès (inclut `status=already_drawn` qui est un succès idempotent)
- `401` → secret manquant ou invalide
- `500` → erreur DB ; payload `{ error: 'message' }`

Configurer un alerting BetterStack / n8n sur :
- `status != 200` → Slack/Discord
- `winners_count = 0` sur `classement-weekly` = signal faible (peut-être légitime si 0 activité)
- `status=already_drawn` plusieurs fois de suite = CRON déclenche trop tôt
