#!/usr/bin/env node
/**
 * gen-icons.mjs — Génère les icônes YANA mobile via Pollinations + sharp.
 *
 * Exécution :
 *   node scripts/gen-icons.mjs
 *
 * Sorties dans mobile/assets/ :
 *   - icon.png               1024 × 1024 (App Store iOS + Expo)
 *   - adaptive-icon.png      1024 × 1024 foreground (Android 8+ adaptive)
 *   - splash-icon.png        1284 × 2778 (iPhone 14 Pro Max, scaled down pour autres)
 *   - favicon.png            48  × 48 (PWA / Expo web preview)
 *   - feature-graphic.png    1024 × 500 (Play Store listing)
 *
 * Stratégie : on télécharge 1 seule source haute-résolution (1024x1024) depuis
 * Pollinations (Flux), puis sharp resize + pad + compose selon chaque format.
 * - splash centré sur bg #03040a avec padding latéral
 * - adaptive-icon : padding 100 px pour survivre au masque rond/squircle Android
 * - feature-graphic : compose sur canvas 1024×500 avec gradient horizontal
 *
 * Pas de clé API requise pour Pollinations (service gratuit, rate-limit doux).
 * Si hors-ligne ou rate-limited → fallback gradient pur procédural (zéro pixel
 * piqué à un service externe, l'app bootera tout de même).
 */
import sharp from 'sharp'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = join(__dirname, '..', 'mobile', 'assets')

const BG_DEEP = '#03040a'
const ACCENT_PRIMARY = '#F97316'
const ACCENT_SECONDARY = '#0EA5E9'

const PROMPT = [
  'YANA mobility logo',
  'letter Y stylized as a road curving upward',
  `gradient ${ACCENT_PRIMARY} to ${ACCENT_SECONDARY}`,
  `deep navy ${BG_DEEP} background`,
  'minimal flat design',
  'sacred geometry hint',
  'centered composition',
  'no text no letters anywhere except the Y',
  '1024x1024',
].join(', ')

const POLLINATIONS_URL =
  `https://image.pollinations.ai/prompt/${encodeURIComponent(PROMPT)}` +
  `?width=1024&height=1024&model=flux&enhance=true&nologo=true&seed=42`

async function fetchSourceBuffer() {
  try {
    const res = await fetch(POLLINATIONS_URL, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const arrayBuf = await res.arrayBuffer()
    const buf = Buffer.from(arrayBuf)
    if (buf.length < 5_000) throw new Error('buffer too small — likely rate-limited')
    console.log(`[gen-icons] Pollinations OK — ${(buf.length / 1024).toFixed(0)} KiB`)
    return buf
  } catch (err) {
    console.warn('[gen-icons] Pollinations indispo → fallback procédural :', String(err))
    return renderFallback()
  }
}

/**
 * Fallback 100% procédural sans dépendance réseau. Carré 1024, fond deep + Y
 * stylisé via un SVG simple rendu par sharp.
 */
async function renderFallback() {
  const svg = `
  <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${ACCENT_PRIMARY}"/>
        <stop offset="100%" stop-color="${ACCENT_SECONDARY}"/>
      </linearGradient>
      <radialGradient id="bg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#0a0d1a"/>
        <stop offset="100%" stop-color="${BG_DEEP}"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)"/>
    <g transform="translate(512,512)">
      <circle r="360" fill="none" stroke="${ACCENT_PRIMARY}" stroke-opacity="0.12" stroke-width="2"/>
      <circle r="280" fill="none" stroke="${ACCENT_SECONDARY}" stroke-opacity="0.18" stroke-width="2"/>
      <path
        d="M -180 -240 L 0 60 L 180 -240 M 0 60 L 0 260"
        stroke="url(#g)"
        stroke-width="56"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </g>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function writeIcon(buf, filename) {
  const outPath = join(ASSETS_DIR, filename)
  await writeFile(outPath, buf)
  console.log(`[gen-icons] ✔ ${filename}`)
}

async function main() {
  await mkdir(ASSETS_DIR, { recursive: true })

  const source = await fetchSourceBuffer()

  // icon.png — 1024² tel quel (ou resize sécurisé si Pollinations rend différent).
  const iconBuf = await sharp(source).resize(1024, 1024, { fit: 'cover' }).png().toBuffer()
  await writeIcon(iconBuf, 'icon.png')

  // adaptive-icon.png — foreground avec padding 100 px + fond transparent (la
  // couleur de fond est définie par adaptiveIcon.backgroundColor dans app.json).
  const adaptiveBuf = await sharp(source)
    .resize(824, 824, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 100,
      bottom: 100,
      left: 100,
      right: 100,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  await writeIcon(adaptiveBuf, 'adaptive-icon.png')

  // splash-icon.png — 1284 × 2778 centré sur bg deep. On place l'icône au
  // centre à 600 px de large (24 % du plus grand côté).
  const splashIconSize = 600
  const splashIconResized = await sharp(source)
    .resize(splashIconSize, splashIconSize, { fit: 'contain' })
    .toBuffer()
  const splashBuf = await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: BG_DEEP,
    },
  })
    .composite([
      {
        input: splashIconResized,
        top: Math.round((2778 - splashIconSize) / 2),
        left: Math.round((1284 - splashIconSize) / 2),
      },
    ])
    .png()
    .toBuffer()
  await writeIcon(splashBuf, 'splash-icon.png')

  // favicon.png — 48²
  const faviconBuf = await sharp(source).resize(48, 48, { fit: 'cover' }).png().toBuffer()
  await writeIcon(faviconBuf, 'favicon.png')

  // feature-graphic.png — 1024 × 500 avec icône à gauche + zone texte (vide,
  // Tissma peut composer un wordmark par-dessus via Figma pour le Play Store).
  const fgIconSize = 400
  const fgIconResized = await sharp(source)
    .resize(fgIconSize, fgIconSize, { fit: 'contain' })
    .toBuffer()
  const gradientSvg = `
    <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${BG_DEEP}"/>
          <stop offset="100%" stop-color="#050615"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="500" fill="url(#g)"/>
    </svg>`
  const featureBuf = await sharp(Buffer.from(gradientSvg))
    .composite([
      {
        input: fgIconResized,
        top: Math.round((500 - fgIconSize) / 2),
        left: 70,
      },
    ])
    .png()
    .toBuffer()
  await writeIcon(featureBuf, 'feature-graphic.png')

  console.log('[gen-icons] Terminé. Source :', POLLINATIONS_URL.slice(0, 100) + '…')
}

main().catch((err) => {
  console.error('[gen-icons] FAIL :', err)
  process.exit(1)
})
