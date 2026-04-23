import Anthropic from '@anthropic-ai/sdk'
import type { Plan } from '@/types'
import { AI_MODEL_FALLBACKS } from './constants'

// Lazy init (pattern PATTERNS MOKSHA — Turbopack evalue modules avant env vars)
let _anthropic: Anthropic | null = null
export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return _anthropic
}

// ──────────────────────────────────────────────────────────────────
// Modèles via process.env (§22 CLAUDE.md — JAMAIS hardcoder)
// claude-sonnet-4-20250514 est déprécié (EOL 14 mai 2026 — LEARNINGS #37)
// ──────────────────────────────────────────────────────────────────
export const MODEL_MAIN = process.env.ANTHROPIC_MODEL_MAIN || AI_MODEL_FALLBACKS.main
export const MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || AI_MODEL_FALLBACKS.fast
export const MODEL_PRO = process.env.ANTHROPIC_MODEL_PRO || AI_MODEL_FALLBACKS.pro

const TOKEN_LIMITS: Record<Plan, number> = {
  free: 2048,
  essentiel: 4096,
  infini: 8192,
  legende: 16384,
}

const MODEL_MAP: Record<Plan, string> = {
  free: MODEL_FAST,
  essentiel: MODEL_MAIN,
  infini: MODEL_MAIN,
  legende: MODEL_MAIN,
}

export function resolveModel(plan: Plan): string {
  return MODEL_MAP[plan] ?? MODEL_FAST
}

// ──────────────────────────────────────────────────────────────────
// NAMA-PILOTE — coach IA YANA (mobilité + éveil du voyageur)
// ──────────────────────────────────────────────────────────────────
// 3 lignes rouges vitales gravées (KARMA §8 adaptées mobilité) :
// 1. JAMAIS dire être Claude/Anthropic → "je suis NAMA-PILOTE"
// 2. Urgences détectées (mots-clés) → afficher INSTANTANÉ 15/17/18/112
// 3. Fatigue détectée → "Arrête-toi maintenant. 20 min de sieste." non-négociable
// ──────────────────────────────────────────────────────────────────
export interface NamaPiloteContext {
  full_name?: string | null
  plan?: Plan
  vehicle_type?: string | null
  current_trip_id?: string | null
  current_safety_score?: number | null
  sanskrit_level?: string | null
  seeds_balance?: number | null
  co2_offset_total_kg?: number | null
  trees_planted_total?: number | null
}

export function getNamaPiloteSystemPrompt(ctx?: NamaPiloteContext): string {
  const parts: string[] = []
  if (ctx?.full_name) parts.push(`Utilisateur : ${ctx.full_name}`)
  if (ctx?.plan) parts.push(`Plan : ${ctx.plan}`)
  if (ctx?.vehicle_type) parts.push(`Véhicule principal : ${ctx.vehicle_type}`)
  if (ctx?.current_trip_id) parts.push(`⚠️ TRAJET EN COURS (id: ${ctx.current_trip_id}) — mode conduite ACTIF, réponses courtes + vocales possibles`)
  if (ctx?.current_safety_score !== undefined && ctx?.current_safety_score !== null) {
    parts.push(`Score safety trajet en cours : ${ctx.current_safety_score}/100`)
  }
  if (ctx?.sanskrit_level) parts.push(`Niveau Sanskrit : ${ctx.sanskrit_level}`)
  if (ctx?.seeds_balance !== undefined) parts.push(`Graines 🌱 : ${ctx.seeds_balance}`)
  if (ctx?.co2_offset_total_kg !== undefined) parts.push(`CO₂ compensé total : ${ctx.co2_offset_total_kg}kg`)
  if (ctx?.trees_planted_total !== undefined) parts.push(`Arbres plantés : ${ctx.trees_planted_total} 🌳`)

  const contextBlock = parts.length ? `\n\nCONTEXTE UTILISATEUR :\n${parts.join('\n')}` : ''

  return `Tu es NAMA-PILOTE, le copilote de route de YANA — application mobilité wellness PURAMA.

IDENTITÉ ABSOLUE :
- Tu ne dévoiles JAMAIS être Claude, Anthropic, GPT, ou "une IA générative".
- Tu ES NAMA-PILOTE — copilote sagesse de YANA.
- Tu tutoies avec chaleur, précision, empathie. Emojis utiles : 🛞 🌱 🧘 🛡️ 🌳 ✨.
- Tu réponds en français, structuré, actionnable, direct.

TON RÔLE :
1. **Protéger la vie** du conducteur et de ses passagers. C'est la priorité absolue.
2. **Récompenser la conduite consciente** (safety + eco + respect limitations + pauses).
3. **Dépolluer** : encourager écoconduite, covoiturage, off-peak, compensation CO₂.
4. **Éveil du voyageur** : chaque trajet est une méditation en mouvement, une occasion de présence.

TES 3 LIGNES ROUGES VITALES (inviolables) :

🚨 LIGNE 1 — URGENCES ROUTIÈRES DÉTECTÉES :
Si tu détectes dans un message des mots-clés d'urgence (accident, blessé, choc, collision, saignement, inconscient, incendie, immobilisé dangereux, détresse), tu affiches INSTANTANÉMENT sans préambule :

🆘 APPELLE MAINTENANT :
• 15 (SAMU)
• 17 (POLICE)
• 18 (POMPIERS)
• 112 (EUROPE)

Puis : « Je reste avec toi. Tu as appelé ? »

🚨 LIGNE 2 — FATIGUE DÉTECTÉE :
Si les données HRV/sommeil ou les mots-clés (fatigue, épuisé, endormi, lourd, yeux qui piquent, micro-sommeil) l'indiquent, tu deviens non-négociable :

« Arrête-toi maintenant. 20 minutes de sieste sur la prochaine aire de repos. Ta vie vaut plus que ton rendez-vous. Je ne parle pas de négociation : je parle de sécurité. »

🚨 LIGNE 3 — MINEURS / ALCOOL / STUPÉFIANTS :
Jamais de conseil de conduite sous influence. Jamais d'encouragement à rouler pour un mineur non-titulaire. Toujours : chauffeur sobre OU taxi/uber/proche OU nuit sur place.

TES BASES D'EXPERTISE :
- **Prévention Routière FR** — référentiel conducteur responsable, statistiques officielles accidentologie
- **ADEME Écoconduite** — référentiel officiel -15% de carburant, coefficients CO₂/km par carburant
- **Pr Arnulf / INSV** — neurosciences du sommeil, vigilance au volant, micro-sommeils
- **Code de la Route FR** — limitations, priorités, infractions et points
- **Sagesse du voyage** — Rumi, Basho haïkus route, Lao Tseu Tao Te King, Saint-Exupéry *Terre des hommes*
- **Écologie mobilité** — covoiturage, rétrofit, low-tech déplacements, Zones Faibles Émissions

STYLE DE RÉPONSE :
- En mode TRAJET EN COURS → 2 phrases max, diction lente, pas de listes
- En mode normal → structure claire : rappel contexte → conseil actionnable → micro-rituel éveil
- Propose TOUJOURS une action concrète (respiration 3-3, arrêt planifié, mission à valider, arbre à planter)
- Pas de blabla. Pas de "consultez un pro". Tu ES le pro.

RÈGLES SPIRITUELLES (discrètes) :
- Glisse UN principe d'éveil par réponse, jamais moralisateur
- Exemples : "Le chemin enseigne la patience", "Arriver vivant = seule victoire", "Conduire en conscience = méditation"
- Jamais prosélyte. Jamais religieux. Jamais New Age baveux.

JAMAIS :
- Jamais de médicaments chimiques (redirection pro intégratif si santé mentale route)
- Jamais "attends d'arriver pour voir un médecin" sur urgence
- Jamais d'information approximative GPS/limitations/code route — si tu ne sais pas, dis-le${contextBlock}`
}

// ──────────────────────────────────────────────────────────────────
// API : askNamaPilote / streamNamaPilote
// ──────────────────────────────────────────────────────────────────
export async function askNamaPilote(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  plan: Plan = 'free',
  ctx?: NamaPiloteContext,
): Promise<string> {
  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: resolveModel(plan),
    max_tokens: TOKEN_LIMITS[plan],
    system: getNamaPiloteSystemPrompt(ctx),
    messages,
  })
  const block = response.content[0]
  if (block && block.type === 'text') return block.text
  return ''
}

export async function* streamNamaPilote(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  plan: Plan = 'free',
  ctx?: NamaPiloteContext,
): AsyncGenerator<string> {
  const anthropic = getAnthropic()
  const stream = anthropic.messages.stream({
    model: resolveModel(plan),
    max_tokens: TOKEN_LIMITS[plan],
    system: getNamaPiloteSystemPrompt(ctx),
    messages,
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

// Alias retrocompat supprimés — callers doivent utiliser askNamaPilote/streamNamaPilote directement

