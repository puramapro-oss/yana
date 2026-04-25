#!/usr/bin/env node
/**
 * i18n-store-translate.mjs — Génère les 14 langues manquantes du
 * store.config.json YANA via Claude Haiku batch.
 *
 * Source : `mobile/store.config.json` apple.info["fr-FR"] + android.info["fr-FR"].
 * Cibles : 14 locales restantes (es, de, it, pt, ar, zh, ja, ko, hi, ru, tr, nl,
 *          pl, sv) en plus de fr-FR/en-US déjà figés.
 *
 * Stratégie :
 *  - 1 appel Haiku par locale (parallèle ×3 pour respecter rate-limit doux)
 *  - retry 3× avec backoff exponentiel
 *  - fallback : si timeout / 4xx → copie EN avec un commentaire
 *    `// FALLBACK_EN_2026-04-25` dans le store.config.json
 *  - log final dans store.config.json + scripts/i18n-store-translate.log
 *
 * Modèle : claude-haiku-4-5-20251001 (§22 CLAUDE.md FAST tier).
 *
 * Usage : `node scripts/i18n-store-translate.mjs`
 * Variables env requises : ANTHROPIC_API_KEY (depuis .env.local).
 *
 * Idempotent : si une langue existe déjà dans store.config.json (autre que
 * fr-FR/en-US), elle est SKIP. Pour forcer une re-traduction, supprimer la
 * locale du JSON avant de relancer.
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORE_PATH = join(__dirname, '..', 'mobile', 'store.config.json')
const LOG_PATH = join(__dirname, 'i18n-store-translate.log')

// Lit .env.local pour ANTHROPIC_API_KEY si pas dans process.env.
function loadEnvLocal() {
  if (process.env.ANTHROPIC_API_KEY) return
  try {
    const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
    for (const line of envFile.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch {
    // .env.local absent en CI — on tente sans.
  }
}
loadEnvLocal()

const API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_FAST ?? 'claude-haiku-4-5-20251001'
if (!API_KEY) {
  console.error('[i18n] ANTHROPIC_API_KEY manquant — copier .env.local depuis CLAUDE.md credentials.')
  process.exit(1)
}

const LANGUAGE_NAMES = {
  'es-ES': 'Spanish (Spain)',
  'de-DE': 'German',
  'it': 'Italian',
  'pt-PT': 'Portuguese (Portugal)',
  'pt-BR': 'Portuguese (Brazil)',
  'ar-SA': 'Arabic (Saudi Arabia)',
  'zh-Hans': 'Simplified Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'hi': 'Hindi',
  'ru': 'Russian',
  'tr': 'Turkish',
  'nl-NL': 'Dutch (Netherlands)',
  'pl': 'Polish',
  'sv': 'Swedish',
}

// Mapping vers les codes Play Console (Android utilise ses propres codes).
const ANDROID_LOCALE_MAP = {
  'es-ES': 'es-ES',
  'de-DE': 'de-DE',
  'it': 'it-IT',
  'pt-PT': 'pt-PT',
  'pt-BR': 'pt-BR',
  'ar-SA': 'ar',
  'zh-Hans': 'zh-CN',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'hi': 'hi-IN',
  'ru': 'ru-RU',
  'tr': 'tr-TR',
  'nl-NL': 'nl-NL',
  'pl': 'pl-PL',
  'sv': 'sv-SE',
}

const APPLE_TARGET_LOCALES = [
  'es-ES', 'de-DE', 'it', 'pt-PT', 'ar-SA', 'zh-Hans', 'ja', 'ko',
  'hi', 'ru', 'tr', 'nl-NL', 'pl', 'sv',
]

const ANDROID_TARGET_LOCALES = [...APPLE_TARGET_LOCALES, 'pt-BR']

function log(line) {
  appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${line}\n`)
}

async function callHaiku(systemPrompt, userPrompt, attempt = 1) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = await res.json()
  const content = json.content?.[0]?.text
  if (!content) throw new Error('No content in response')
  return content
}

async function withRetry(fn, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === attempts) throw err
      const delay = 1000 * 2 ** (i - 1)
      log(`Retry ${i}/${attempts} after ${delay}ms: ${err.message}`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('unreachable')
}

const APPLE_SYSTEM_PROMPT = `Tu es un traducteur professionnel pour App Store metadata.
Règles strictes :
- Préserver le ton bienveillant et chaleureux de YANA (mobilité + bien-être).
- title : MAX 30 caractères, doit contenir "YANA".
- subtitle : MAX 30 caractères.
- description : MAX 4000 caractères, paragraphes naturels, pas de markdown.
- keywords : MAX 100 caractères, séparés par virgules, sans accents/espaces autour.
- promotionalText : MAX 170 caractères.
- INTERDIT : mentionner "abonnement", "prix", "€", "subscription", "paid" → routing externe via web (guideline Apple §3.1.1).
- Tutoiement (ou équivalent culturel) où possible.
- Réponse au format JSON STRICT, AUCUN texte autour, structure :
{"title":"...","subtitle":"...","description":"...","keywords":"...","promotionalText":"..."}`

const ANDROID_SYSTEM_PROMPT = `Tu es un traducteur professionnel pour Google Play Console.
Règles strictes :
- Préserver le ton bienveillant et chaleureux de YANA.
- title : MAX 30 caractères, doit contenir "YANA".
- shortDescription : MAX 80 caractères.
- fullDescription : MAX 4000 caractères, garder les emojis 🚗🌱💜🛵🤝💰📵💎.
  Garder les liens https://yana.purama.dev/subscribe, /cgu, /politique-confidentialite.
  Tu PEUX mentionner les prix et abonnement (Google autorise).
- Tutoiement (ou équivalent culturel) où possible.
- Réponse au format JSON STRICT, AUCUN texte autour, structure :
{"title":"...","shortDescription":"...","fullDescription":"..."}`

function clip(s, max) {
  if (typeof s !== 'string') return s
  if (s.length <= max) return s
  log(`Truncate ${s.length}→${max}: "${s.slice(0, 30)}..."`)
  return s.slice(0, max - 1) + '…'
}

function validateApple(obj) {
  obj.title = clip(obj.title, 30)
  obj.subtitle = clip(obj.subtitle, 30)
  obj.description = clip(obj.description, 4000)
  obj.keywords = clip(obj.keywords, 100)
  obj.promotionalText = clip(obj.promotionalText, 170)
  return obj
}

function validateAndroid(obj) {
  obj.title = clip(obj.title, 30)
  obj.shortDescription = clip(obj.shortDescription, 80)
  obj.fullDescription = clip(obj.fullDescription, 4000)
  obj.video = obj.video ?? ''
  return obj
}

function parseJsonStrict(text) {
  // L'IA renvoie parfois un fence ```json — on gère.
  const cleaned = text.trim().replace(/^```(json)?\s*/i, '').replace(/```\s*$/i, '')
  return JSON.parse(cleaned)
}

async function translateAppleLocale(localeCode, frRef) {
  const langName = LANGUAGE_NAMES[localeCode]
  const userPrompt = `Traduis vers ${langName} (locale code: ${localeCode}).

Source FR :
${JSON.stringify(frRef, null, 2)}

Réponse JSON strict.`
  const text = await callHaiku(APPLE_SYSTEM_PROMPT, userPrompt)
  return validateApple(parseJsonStrict(text))
}

async function translateAndroidLocale(localeCode, frRef) {
  const langName = LANGUAGE_NAMES[localeCode]
  const userPrompt = `Traduis vers ${langName} (locale code: ${localeCode}).

Source FR :
${JSON.stringify(frRef, null, 2)}

Réponse JSON strict.`
  const text = await callHaiku(ANDROID_SYSTEM_PROMPT, userPrompt)
  return validateAndroid(parseJsonStrict(text))
}

async function processInBatches(items, fn, batchSize = 3) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          return { item, value: await withRetry(() => fn(item)), error: null }
        } catch (err) {
          return { item, value: null, error: err.message }
        }
      }),
    )
    results.push(...batchResults)
  }
  return results
}

async function main() {
  log('=== START i18n batch ===')
  log(`Model: ${MODEL}`)

  const config = JSON.parse(readFileSync(STORE_PATH, 'utf8'))
  const appleFr = config.apple.info['fr-FR']
  const androidFr = config.android.info['fr-FR']
  const enRef = config.apple.info['en-US']
  const enAndroidRef = config.android.info['en-US']

  // 1. Apple
  const appleTodo = APPLE_TARGET_LOCALES.filter((l) => !config.apple.info[l])
  log(`Apple to translate: ${appleTodo.length} locales: ${appleTodo.join(', ')}`)

  const appleResults = await processInBatches(appleTodo, (loc) =>
    translateAppleLocale(loc, appleFr),
  )

  for (const { item: locale, value, error } of appleResults) {
    if (value) {
      config.apple.info[locale] = {
        ...value,
        marketingUrl: appleFr.marketingUrl,
        supportUrl: appleFr.supportUrl,
        privacyPolicyUrl: appleFr.privacyPolicyUrl,
      }
      log(`Apple ${locale} OK`)
    } else {
      // Fallback EN
      config.apple.info[locale] = {
        ...enRef,
        _fallback: 'en-US copy because Haiku failed: ' + (error ?? 'unknown'),
      }
      log(`Apple ${locale} FALLBACK_EN: ${error}`)
    }
  }

  // 2. Android
  const androidTodo = ANDROID_TARGET_LOCALES
    .map((l) => ANDROID_LOCALE_MAP[l] ?? l)
    .filter((l) => !config.android.info[l])
  // Re-mapper pour avoir le source code Apple ↔ Android
  const inverseMap = Object.fromEntries(
    Object.entries(ANDROID_LOCALE_MAP).map(([apple, android]) => [android, apple]),
  )
  log(`Android to translate: ${androidTodo.length} locales: ${androidTodo.join(', ')}`)

  const androidResults = await processInBatches(androidTodo, (loc) =>
    translateAndroidLocale(inverseMap[loc] ?? loc, androidFr),
  )

  for (const { item: locale, value, error } of androidResults) {
    if (value) {
      config.android.info[locale] = value
      log(`Android ${locale} OK`)
    } else {
      config.android.info[locale] = {
        ...enAndroidRef,
        _fallback: 'en-US copy because Haiku failed: ' + (error ?? 'unknown'),
      }
      log(`Android ${locale} FALLBACK_EN: ${error}`)
    }
  }

  writeFileSync(STORE_PATH, JSON.stringify(config, null, 2) + '\n')
  log(
    `=== END — Apple: ${appleResults.filter((r) => r.value).length}/${appleResults.length} OK, ` +
      `Android: ${androidResults.filter((r) => r.value).length}/${androidResults.length} OK ===`,
  )
  console.log('[i18n] Terminé. Voir scripts/i18n-store-translate.log pour détails.')
}

main().catch((err) => {
  console.error('[i18n] FAIL:', err)
  log(`FATAL: ${err.message}`)
  process.exit(1)
})
