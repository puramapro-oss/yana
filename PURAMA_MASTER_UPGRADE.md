# PURAMA_MASTER_UPGRADE.md

## 🚀 FICHIER UNIQUE · AUTONOME · PUISSANT · ULTIME

**FICHIER POUR CLAUDE CODE — AUTOEXÉCUTABLE.**

Ce fichier contient :
1. Les INSTRUCTIONS pour Claude Code (ce qu'il doit faire)
2. Le DESIGN SYSTEM COMPLET (22 sections niveau 100% Apple native)
3. Le MAPPING DES APPS (palette seeds pour toutes les apps Purama)
4. La CHECKLIST QUALITÉ (critères de déploiement)

### UTILISATION PAR TISSMA

1. Télécharge ce fichier dans `~/purama/`
2. Ouvre terminal Mac : `cd ~/purama && claude --dangerously-skip-permissions`
3. Premier message à Claude Code :
   ```
   Lis PURAMA_MASTER_UPGRADE.md intégralement et exécute les 3 phases (A, B, C) en totale autonomie.
   ```
4. Tape "ok" quand Claude Code affiche son plan. Le reste est automatique.

**CLAUDE CODE : LIS CE FICHIER DU DÉBUT À LA FIN AVANT DE COMMENCER.**

---

# PART 1 — INSTRUCTIONS POUR CLAUDE CODE

## Ta mission en 3 phases

- **PHASE A** — Intégration du Design System dans CLAUDE.md existant
- **PHASE B** — Injection `palette_seed` dans chaque BRIEF.md d'app
- **PHASE C** — Application complète à chaque app (code réel, deploy)

Tu fais TOUT en autonomie, dans l'ordre. Zéro placeholder. Zéro TODO. Zéro approximation.

---

## PHASE A — INTÉGRATION DESIGN SYSTEM DANS CLAUDE.md

### A.1 — Montrer le plan à Tissma avant d'agir

Affiche :
- Où tu vas trouver CLAUDE.md (dossier courant ou `~/purama/CLAUDE.md`)
- Taille actuelle de CLAUDE.md (lignes + caractères)
- Emplacement du backup que tu vas créer
- Confirmation que tu vas ajouter le contenu de PART 2 — DESIGN SYSTEM (sections 1 à 22) à la fin du fichier existant

Attends "ok" de Tissma avant d'exécuter.

### A.2 — Exécution Phase A

1. Localiser CLAUDE.md dans `~/purama/` (ou dossier courant)
2. Backup : `cp CLAUDE.md CLAUDE.md.backup.$(date +%Y%m%d_%H%M%S)`
3. Intégrer : ajoute le contenu complet de PART 2 — DESIGN SYSTEM à la fin de CLAUDE.md (tout ce qui est entre `=== DÉBUT PURAMA DESIGN SYSTEM V1 ===` et `=== FIN PURAMA DESIGN SYSTEM V1 ===`)
4. Valider : `grep -c "PURAMA DESIGN SYSTEM V1" CLAUDE.md` doit retourner ≥ 1
5. Confirmer à Tissma avec : ancienne taille, nouvelle taille, emplacement backup

---

## PHASE B — INJECTION PALETTE_SEED DANS LES BRIEFS

### B.1 — Montrer le plan à Tissma

Affiche la liste de toutes les apps détectées dans `~/purama/` avec pour chacune :
- Slug de l'app
- Présence ou non d'un BRIEF.md
- Si `palette_seed` est déjà présent (skip) ou absent (injection)
- Seed qui sera injecté (cf. mapping PART 3)

Attends "ok".

### B.2 — Exécution Phase B

Pour chaque app listée dans le mapping de PART 3, si le dossier `~/purama/<slug>/` existe :

1. Si BRIEF.md existe :
   - Vérifie présence de `^palette_seed:` → si oui, skip
   - Sinon, injecte la ligne en tête : `palette_seed: '<seed>'` puis ligne vide puis contenu original

2. Si BRIEF.md n'existe pas : crée-le avec le contenu minimal :
   ```yaml
   palette_seed: '<seed>'
   
   # BRIEF <SLUG>
   
   ## Positionnement
   (à compléter par Tissma)
   
   ## Features principales
   (à compléter par Tissma)
   ```

3. Log app par app : "App `<slug>` : seed injecté / déjà présent / BRIEF créé"

### B.3 — Gestion apps inconnues (hors mapping PART 3)

Si Tissma a d'autres apps dans `~/purama/` non listées dans PART 3 :
- Lis leur BRIEF.md (si existant) pour identifier leur positionnement
- Choisis le mood le plus approprié parmi les 12 canoniques (cf. PART 2 section 1)
- Génère un seed : `<mood>[-<modifier>]-<slug>`
- Demande confirmation à Tissma avant injection

---

## PHASE C — APPLICATION COMPLÈTE À CHAQUE APP

### C.1 — Montrer le plan à Tissma

Affiche :
- Ordre de traitement (priorité business : purama-ai → midas → karma → … cf. PART 4)
- Temps estimé total (100 min × nombre d'apps)
- Possibilité de faire "tout en batch" ou "une par une avec validation"

Attends choix de Tissma.

### C.2 — Pour chaque app, exécute ces 6 sous-phases

#### C.2.1 — Setup (15 min)

```bash
cd ~/purama/<slug>
cp ~/purama/CLAUDE.md ./CLAUDE.md  # fait avant claude --dangerously-skip-permissions
# Lire BRIEF.md, extraire palette_seed
# Si absent → STOP, demander à Tissma
```

Ensuite, install toutes les deps en une commande unique :

```bash
npm install @paper-design/shaders-react browser-image-compression geist framer-motion next-themes next-intl next-pwa dexie dexie-react-hooks @sentry/nextjs @vercel/analytics @vercel/speed-insights posthog-js react-turnstile three @react-three/fiber @react-three/drei lottie-react @rive-app/react-canvas recharts vaul sonner class-variance-authority clsx tailwind-merge @radix-ui/react-slot tone plaiceholder
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input label separator toast tooltip
```

#### C.2.2 — Création des fichiers (40 min)

Crée tous les fichiers listés dans PART 2 section "FICHIERS À CRÉER" :

- `/lib/brand/` : purama-adn.ts, palette-generator.ts, app-config.ts, typography.ts, motion.ts
- `/components/brand/` : 34 composants
- `/components/ui/` : 3 composants custom (Button, Card, Input)
- `/hooks/` : 7 hooks
- `/i18n/` : routing.ts, request.ts
- `/messages/` : fr.json, en.json, es.json, ar.json
- `/public/` : manifest.webmanifest, icônes PWA

Le code source exact de chaque fichier est dans PART 2. Copie-le intégralement.

#### C.2.3 — Configurations (15 min)

- `tailwind.config.ts` : étendre avec typo fluide, spacing 4pt, colors dual mode, shadows, z-index, keyframes shimmer
- `/app/globals.css` : CSS variables dual mode, base layers, mobile resets
- `/app/layout.tsx` : GeistSans/GeistMono, PuramaThemeProvider, PuramaToaster, Analytics, SpeedInsights, PuramaPostHog, PuramaCookieConsent, PuramaOfflineBanner, viewport fit cover
- `next.config.ts` : PPR, reactCompiler, images AVIF/WebP, Sentry, next-pwa, optimizePackageImports
- `.env.local` : `NEXT_PUBLIC_PALETTE_SEED` (= seed du BRIEF), `NEXT_PUBLIC_APP_SLUG`, `SENTRY_DSN`, `POSTHOG_KEY`, `TURNSTILE_SITE_KEY`
- `middleware.ts` : i18n middleware
- `i18n/routing.ts` + `i18n/request.ts`

#### C.2.4 — Supabase + PWA (10 min)

Migration SQL (via CLI Supabase ou psql direct) :

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_consent_ip text,
  ADD COLUMN IF NOT EXISTS avatar_deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON public.users (avatar_url) WHERE avatar_url IS NOT NULL;

CREATE OR REPLACE FUNCTION delete_user_avatar() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.avatar_url IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'purama-users-avatars' AND name = OLD.id::text || '/avatar.webp';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_user_avatar ON public.users;
CREATE TRIGGER trigger_delete_user_avatar BEFORE DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION delete_user_avatar();
```

Buckets Supabase Storage (créer via dashboard ou SDK si pas déjà faits) :
- `purama-users-avatars` (public read)
- `purama-testimonials` (public read)
- `purama-ambassadors` (public read)

RLS policies sur les buckets (owner-only write, public read).

Manifest PWA : `/public/manifest.webmanifest` avec name/short_name/icons/theme_color (couleur de la palette de l'app).

Icônes PWA : 192×192, 512×512, maskable 512×512, apple-touch-icon 180×180, favicon.ico. Génère-les automatiquement depuis le MeshGradient initial de la palette de l'app (capture canvas à t=0).

#### C.2.5 — Refactor du code existant (20-30 min)

Remplacer partout dans le code source :

- Backgrounds statiques → `<PuramaBackground seed={APP_SEED} variant="..." />`
- Avatars/images profil → `<PuramaAvatar user={} seed={APP_SEED} />`
- Faux témoignages → `<PuramaTestimonial testimonial={} seed={APP_SEED} />` (supprimer faux)
- Boutons HTML → `<PuramaButton variant size>`
- Cards → `<PuramaCard>`
- Inputs → `<PuramaInput label error>`
- Icônes → `<PuramaIcon icon={LucideIcon} size strokeWidth={1.5} />`
- Modals mobile → `<PuramaSheet>`

Ajouts :
- `<PuramaErrorBoundary>` racine
- haptic+son sur interactions clés
- skeletons sur loading
- empty states sur data vides
- Headlines → classes `text-display-*` avec tracking négatif
- Spacings → multiples de 4 seulement
- Safe-area-insets sur layouts full-screen
- Navigation principale mobile → `<PuramaTabBar>`

#### C.2.6 — QA + Deploy (10 min)

```bash
# Tests
npm run test          # 113 tests V7 SUPREME doivent passer
npm run build         # Build doit réussir
npm run lighthouse    # Perf ≥ 95, A11y ≥ 95, SEO ≥ 95, Best Practices ≥ 95

# Deploy si tout vert
npm run deploy        # ou : vercel --prod --scope=puramapro-oss
```

Si 1 test échoue → **STOP deploy.** Corrige, relance.

Screenshot de la landing page iOS Safari après deploy. Envoie à Tissma.

### C.3 — Confirmation app par app

Après chaque app déployée, log :

- ✅ App `<slug>` déployée sur `<url>`
- Seed appliqué : `<seed>`
- Lighthouse scores : Perf X / A11y Y / SEO Z / Best Practices W
- Lien deploy Vercel
- Screenshot attaché

---

## RÈGLES ABSOLUES (non négociables)

1. **Montre TOUJOURS le plan avant d'exécuter** (Phase A, Phase B, Phase C app par app)
2. **Attends "ok" de Tissma** entre chaque phase majeure
3. **JAMAIS de placeholder**, TODO, "à compléter plus tard"
4. **JAMAIS déployer** si 1 test échoue
5. **TOUJOURS backuper** avant modification majeure
6. **TOUJOURS valider** par grep/count après intégration
7. **Si `palette_seed` absent** → refuse d'avancer, demande à Tissma
8. **Si dossier d'app introuvable** → skip, log, continue
9. **Si `npm install` échoue** → retry 1 fois, si échec persistant log et skip
10. **Tissma doit pouvoir dormir** pendant que tu travailles. Si blocage → log clair + attends son retour

---

# PART 2 — DESIGN SYSTEM COMPLET (22 SECTIONS)

=== DÉBUT PURAMA DESIGN SYSTEM V1 ===

# PURAMA DESIGN SYSTEM V1 — 22 SECTIONS (LOI ABSOLUE)

Système design universel pour les 100+ apps Purama. Niveau Linear / Arc / Apple native. Scalable à l'infini via générateur déterministe.

## PRINCIPE FONDAMENTAL

Chaque app Purama a UNE ligne dans son BRIEF.md :

```yaml
palette_seed: '<mood>[-<modifier>]-<slug>'
```

Le générateur produit automatiquement la palette complète de manière déterministe (même seed = même palette à vie, reproductible).

**12 moods canoniques** : `trading-gold` · `wellness-calm` · `tech-cyber` · `spiritual-divine` · `finance-premium` · `nature-earth` · `energy-fire` · `water-ocean` · `cosmic-aether` · `warmth-community` · `light-clarity` · `shadow-depth`.

---

## SECTION 1 — BACKGROUNDS ANIMÉS (Paper Shaders)

**Stack** : `@paper-design/shaders-react` (exclusif)

**Composant** : `<PuramaBackground seed={APP_SEED} variant="hero|ambient|celebrate|focus" overlayOpacity={0-1} />`

### Fichiers à créer

#### `/lib/brand/purama-adn.ts`

```typescript
export type PuramaMood =
  | 'trading-gold' | 'wellness-calm' | 'tech-cyber' | 'spiritual-divine'
  | 'finance-premium' | 'nature-earth' | 'energy-fire' | 'water-ocean'
  | 'cosmic-aether' | 'warmth-community' | 'light-clarity' | 'shadow-depth';

export type ShaderType = 'mesh' | 'rays' | 'liquid' | 'water' | 'voronoi' | 'orbit';
export type ShaderVariant = 'hero' | 'ambient' | 'celebrate' | 'focus';

export interface MoodDefinition {
  name: string;
  description: string;
  hueRanges: Array<[number, number]>;
  saturation: [number, number];
  lightness: [number, number];
  colorBackHSL: [number, number, number];
  shader: ShaderType;
  distortion: [number, number];
  swirl: [number, number];
  speed: [number, number];
  modifiers: Record<string, Partial<MoodDefinition>>;
}

export const PURAMA_MOODS: Record<PuramaMood, MoodDefinition> = {
  'trading-gold': {
    name: 'Trading Gold', description: 'Finance, trading, richesse',
    hueRanges: [[40,55],[0,15],[140,170],[200,220]],
    saturation: [60,95], lightness: [8,70], colorBackHSL: [0,0,4],
    shader: 'mesh', distortion: [0.9,1.2], swirl: [0.6,0.8], speed: [0.15,0.22],
    modifiers: {
      premium: { saturation: [70,90], speed: [0.12,0.18] },
      intense: { distortion: [1.2,1.5], speed: [0.22,0.3] },
    },
  },
  'wellness-calm': {
    name: 'Wellness Calm', description: 'Santé naturelle, méditation',
    hueRanges: [[140,170],[40,60],[25,40],[60,90]],
    saturation: [35,70], lightness: [50,88], colorBackHSL: [150,40,20],
    shader: 'mesh', distortion: [0.4,0.7], swirl: [0.3,0.5], speed: [0.05,0.10],
    modifiers: {
      soft: { saturation: [25,50], speed: [0.03,0.07] },
      natural: { hueRanges: [[80,120],[40,60],[20,40],[340,360]] },
    },
  },
  'tech-cyber': {
    name: 'Tech Cyber', description: 'IA, code, futurisme',
    hueRanges: [[220,260],[180,200],[280,320],[0,10]],
    saturation: [70,100], lightness: [5,65], colorBackHSL: [230,60,5],
    shader: 'mesh', distortion: [0.9,1.3], swirl: [0.7,1.0], speed: [0.18,0.28],
    modifiers: {
      neon: { saturation: [85,100], lightness: [40,70] },
      dark: { lightness: [5,35], colorBackHSL: [230,80,3] },
    },
  },
  'spiritual-divine': {
    name: 'Spiritual Divine', description: 'Sagesse, sacré, conscience',
    hueRanges: [[260,285],[40,55],[0,10],[220,240]],
    saturation: [50,90], lightness: [20,90], colorBackHSL: [250,50,12],
    shader: 'mesh', distortion: [0.8,1.1], swirl: [0.6,0.8], speed: [0.10,0.18],
    modifiers: {
      divine: { saturation: [60,90], lightness: [40,85] },
      mystic: { shader: 'voronoi', distortion: [1.0,1.4] },
    },
  },
  'finance-premium': {
    name: 'Finance Premium', description: 'Institutionnel, autorité',
    hueRanges: [[210,230],[40,55],[0,10],[215,230]],
    saturation: [30,75], lightness: [15,85], colorBackHSL: [220,40,10],
    shader: 'mesh', distortion: [0.5,0.8], swirl: [0.4,0.6], speed: [0.08,0.14],
    modifiers: {
      premium: { saturation: [40,70], speed: [0.06,0.12] },
      luxury: { hueRanges: [[210,225],[35,50],[0,10],[30,45]] },
    },
  },
  'nature-earth': {
    name: 'Nature Earth', description: 'Écologie, terre, organique',
    hueRanges: [[90,140],[20,40],[40,60],[15,35]],
    saturation: [40,75], lightness: [20,75], colorBackHSL: [30,20,12],
    shader: 'mesh', distortion: [0.6,0.9], swirl: [0.4,0.6], speed: [0.07,0.12],
    modifiers: {
      forest: { hueRanges: [[100,140],[80,100],[30,50],[0,20]] },
      desert: { hueRanges: [[25,45],[10,25],[40,55],[350,15]] },
    },
  },
  'energy-fire': {
    name: 'Energy Fire', description: 'Action, sport, RPG',
    hueRanges: [[0,15],[30,50],[0,10],[15,35]],
    saturation: [70,100], lightness: [10,65], colorBackHSL: [15,30,8],
    shader: 'liquid', distortion: [1.2,1.6], swirl: [0.9,1.3], speed: [0.20,0.32],
    modifiers: {
      epic: { distortion: [1.4,1.8], speed: [0.25,0.35] },
      sport: { hueRanges: [[0,15],[30,45],[200,220],[0,10]] },
    },
  },
  'water-ocean': {
    name: 'Water Ocean', description: 'Fluidité, respiration',
    hueRanges: [[190,220],[170,185],[0,10],[200,230]],
    saturation: [40,85], lightness: [30,88], colorBackHSL: [205,80,12],
    shader: 'water', distortion: [0.4,0.7], swirl: [0.3,0.5], speed: [0.04,0.09],
    modifiers: {
      deep: { lightness: [15,55], colorBackHSL: [215,85,8] },
      tropical: { hueRanges: [[170,195],[155,175],[40,60],[195,215]] },
    },
  },
  'cosmic-aether': {
    name: 'Cosmic Aether', description: 'Mystique, espace, éther',
    hueRanges: [[260,295],[0,10],[275,310],[220,250]],
    saturation: [40,85], lightness: [15,85], colorBackHSL: [255,60,8],
    shader: 'voronoi', distortion: [1.0,1.4], swirl: [0.8,1.1], speed: [0.15,0.22],
    modifiers: {
      stardust: { shader: 'orbit' },
      nebula: { saturation: [60,95], distortion: [1.2,1.6] },
    },
  },
  'warmth-community': {
    name: 'Warmth Community', description: 'Social, association, humain',
    hueRanges: [[20,40],[40,55],[330,355],[30,50]],
    saturation: [50,85], lightness: [55,92], colorBackHSL: [20,55,18],
    shader: 'mesh', distortion: [0.7,1.0], swirl: [0.5,0.7], speed: [0.10,0.16],
    modifiers: { festive: { saturation: [65,95], speed: [0.15,0.22] } },
  },
  'light-clarity': {
    name: 'Light Clarity', description: 'Clarté, lumière, transparence',
    hueRanges: [[45,60],[0,10],[40,55],[0,5]],
    saturation: [15,75], lightness: [65,98], colorBackHSL: [50,50,92],
    shader: 'rays', distortion: [0.5,0.8], swirl: [0.3,0.5], speed: [0.08,0.13],
    modifiers: { solar: { shader: 'rays', saturation: [70,95] } },
  },
  'shadow-depth': {
    name: 'Shadow Depth', description: 'Nocturne, premium sombre',
    hueRanges: [[0,5],[220,240],[0,10],[260,280]],
    saturation: [20,70], lightness: [3,60], colorBackHSL: [230,30,4],
    shader: 'mesh', distortion: [0.7,1.0], swirl: [0.5,0.7], speed: [0.08,0.14],
    modifiers: { midnight: { lightness: [2,35], saturation: [30,80] } },
  },
};

export const SHADER_VARIANTS: Record<ShaderVariant, { distortionMult: number; swirlMult: number; speedMult: number }> = {
  hero: { distortionMult: 1.1, swirlMult: 1.1, speedMult: 1.2 },
  ambient: { distortionMult: 0.5, swirlMult: 0.5, speedMult: 0.3 },
  celebrate: { distortionMult: 1.3, swirlMult: 1.4, speedMult: 1.6 },
  focus: { distortionMult: 0.3, swirlMult: 0.3, speedMult: 0.2 },
};
```

#### `/lib/brand/palette-generator.ts`

```typescript
import { PURAMA_MOODS, SHADER_VARIANTS, type PuramaMood, type MoodDefinition, type ShaderType, type ShaderVariant } from './purama-adn';

export interface GeneratedPalette {
  seed: string; mood: PuramaMood; modifier: string | null; keyword: string;
  colors: [string, string, string, string];
  colorBack: string; shader: ShaderType;
  distortion: number; swirl: number; speed: number;
}

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function pickInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pickHue(rng: () => number, range: [number, number]): number {
  const [min, max] = range;
  if (min > max) {
    const total = (360 - min) + max;
    return (min + rng() * total) % 360;
  }
  return pickInRange(rng, min, max);
}

function parseSeed(seed: string): { mood: PuramaMood; modifier: string | null; keyword: string } {
  const parts = seed.toLowerCase().trim().split('-');
  if (parts.length < 3) return { mood: 'tech-cyber', modifier: null, keyword: seed };
  const moodKeys = Object.keys(PURAMA_MOODS) as PuramaMood[];
  const twoTokens = `${parts[0]}-${parts[1]}`;
  let foundMood: PuramaMood = 'tech-cyber';
  let remaining = parts;
  if (moodKeys.includes(twoTokens as PuramaMood)) {
    foundMood = twoTokens as PuramaMood;
    remaining = parts.slice(2);
  } else if (moodKeys.includes(parts[0] as PuramaMood)) {
    foundMood = parts[0] as PuramaMood;
    remaining = parts.slice(1);
  }
  const moodDef = PURAMA_MOODS[foundMood];
  const mods = Object.keys(moodDef.modifiers);
  let modifier: string | null = null;
  if (remaining.length > 1 && mods.includes(remaining[0])) {
    modifier = remaining[0];
    remaining = remaining.slice(1);
  }
  return { mood: foundMood, modifier, keyword: remaining.join('-') || 'default' };
}

function mergeDefs(base: MoodDefinition, over?: Partial<MoodDefinition>): MoodDefinition {
  if (!over) return base;
  return { ...base, ...over, modifiers: base.modifiers };
}

export function generatePalette(seed: string, variant: ShaderVariant = 'hero'): GeneratedPalette {
  const parsed = parseSeed(seed);
  const baseMood = PURAMA_MOODS[parsed.mood];
  const modOver = parsed.modifier ? baseMood.modifiers[parsed.modifier] : undefined;
  const def = mergeDefs(baseMood, modOver);
  const rng = xmur3(seed);
  const colors = def.hueRanges.map(r => {
    const h = pickHue(rng, r);
    const s = pickInRange(rng, def.saturation[0], def.saturation[1]);
    const l = pickInRange(rng, def.lightness[0], def.lightness[1]);
    return hslToHex(h, s, l);
  }) as [string, string, string, string];
  const [bh, bs, bl] = def.colorBackHSL;
  const colorBack = hslToHex(bh, bs, bl);
  const vm = SHADER_VARIANTS[variant];
  return {
    seed, mood: parsed.mood, modifier: parsed.modifier, keyword: parsed.keyword,
    colors, colorBack, shader: def.shader,
    distortion: Math.max(0, Math.min(2, pickInRange(rng, def.distortion[0], def.distortion[1]) * vm.distortionMult)),
    swirl: Math.max(0, Math.min(2, pickInRange(rng, def.swirl[0], def.swirl[1]) * vm.swirlMult)),
    speed: Math.max(0, Math.min(1, pickInRange(rng, def.speed[0], def.speed[1]) * vm.speedMult)),
  };
}

const cache = new Map<string, GeneratedPalette>();
export function getPalette(seed: string, variant: ShaderVariant = 'hero'): GeneratedPalette {
  const k = `${seed}::${variant}`;
  if (!cache.has(k)) cache.set(k, generatePalette(seed, variant));
  return cache.get(k)!;
}
```

#### `/lib/brand/app-config.ts`

```typescript
export const APP_SEED = process.env.NEXT_PUBLIC_PALETTE_SEED || 'tech-cyber-default';
export const APP_SLUG = process.env.NEXT_PUBLIC_APP_SLUG || 'default';
```

#### `/components/brand/PuramaBackground.tsx`

```tsx
'use client';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getPalette } from '@/lib/brand/palette-generator';
import type { ShaderVariant } from '@/lib/brand/purama-adn';

const MeshGradient = dynamic(() => import('@paper-design/shaders-react').then(m => m.MeshGradient), { ssr: false });

interface Props {
  seed: string;
  variant?: ShaderVariant;
  className?: string;
  overlayOpacity?: number;
  fallbackImage?: string;
  children?: React.ReactNode;
}

export function PuramaBackground({ seed, variant = 'hero', className = '', overlayOpacity = 0, fallbackImage, children }: Props) {
  const [webgl, setWebgl] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const palette = useMemo(() => getPalette(seed, variant), [seed, variant]);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      setWebgl(!!(c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch { setWebgl(false); }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    const h = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  if (!webgl) {
    return (
      <div className={`relative w-full h-full ${className}`} style={{
        background: fallbackImage ? `url(${fallbackImage}) center/cover, ${palette.colorBack}` : palette.colorBack,
      }}>
        {overlayOpacity > 0 && <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: overlayOpacity }} />}
        <div className="relative z-10 w-full h-full">{children}</div>
      </div>
    );
  }

  const speed = (reduced || !visible) ? 0 : palette.speed;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: palette.colorBack }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <MeshGradient colors={palette.colors} distortion={palette.distortion} swirl={palette.swirl} speed={speed} style={{ width: '100%', height: '100%' }} />
      </div>
      {overlayOpacity > 0 && <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: overlayOpacity }} />}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
```

**INTERDIT** : fonds statiques · gradients CSS · images background · vidéos background · hex codes en dur
**OBLIGATOIRE** : `<PuramaBackground />` partout · fallback WebP · respect prefers-reduced-motion · pause si onglet caché

---

## SECTION 2 — PHOTOS USERS RÉELLES (RGPD)

**Stack** : Supabase Storage self-hosted + `browser-image-compression` + `next/image`

**Règle éthique** : JAMAIS de photos stock/AI/Unsplash/Lummi pour représenter humains. Uniquement photos réelles uploadées par users consentants.

**Buckets Supabase** : `purama-users-avatars` · `purama-testimonials` · `purama-ambassadors`

**Fichiers** : `/components/brand/PuramaAvatar.tsx` · `PuramaAvatarUpload.tsx` · `PuramaTestimonial.tsx`

**Compression obligatoire** : WebP, max 500KB, 512px max, consentement RGPD explicite, droit à l'oubli cascade.

**Avatar fallback** : gradient déterministe (palette de l'app + initiales du user) si pas de photo uploadée.

---

## SECTION 3 — TYPOGRAPHY (Geist + fluid clamp)

**Stack** : `geist` package (Geist Sans + Geist Mono exclusifs)

### Config `/app/layout.tsx`

```typescript
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
```

### Échelle fluide Tailwind

```typescript
fontSize: {
  'body-xs': ['clamp(0.75rem, 0.5vw + 0.6rem, 0.8125rem)', { lineHeight: '1.5' }],
  'body-sm': ['clamp(0.875rem, 0.5vw + 0.7rem, 0.9375rem)', { lineHeight: '1.55' }],
  'body': ['clamp(1rem, 0.5vw + 0.85rem, 1.0625rem)', { lineHeight: '1.6' }],
  'body-lg': ['clamp(1.125rem, 0.75vw + 0.9rem, 1.25rem)', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
  'display-sm': ['clamp(1.5rem, 2vw + 1rem, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
  'display-md': ['clamp(2rem, 3vw + 1.2rem, 2.75rem)', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
  'display-lg': ['clamp(2.5rem, 4vw + 1.5rem, 3.75rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
  'display-xl': ['clamp(3rem, 5vw + 2rem, 5rem)', { lineHeight: '1.05', letterSpacing: '-0.035em' }],
  'display-2xl': ['clamp(3.75rem, 7vw + 2.5rem, 6.5rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
  'display-3xl': ['clamp(4.5rem, 9vw + 3rem, 9rem)', { lineHeight: '0.95', letterSpacing: '-0.045em' }],
}
```

### CSS globals

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "ss01", "ss02", "cv01", "cv11";
}
h1, h2, h3 { text-wrap: balance; }
p, li { text-wrap: pretty; max-inline-size: 65ch; }
```

**INTERDIT** : Arial, Helvetica, Times, system-ui nu, plus de 2 familles, tailles fixes px pour headlines responsive.

---

## SECTION 4 — SPACING 4PT GRID

**Valeurs autorisées** : 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192 (multiples de 4 uniquement)

### Tailwind extend

```typescript
spacing: {
  'safe-top': 'env(safe-area-inset-top)',
  'safe-bottom': 'env(safe-area-inset-bottom)',
  'safe-left': 'env(safe-area-inset-left)',
  'safe-right': 'env(safe-area-inset-right)',
},
maxWidth: { 'container': '1280px', 'prose': '65ch', 'narrow': '40ch' },
```

### Viewport (`layout.tsx`)

```typescript
export const viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1,
  userScalable: false, viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};
```

Composant `<PuramaContainer size="narrow|default|wide|full">` avec `mx-auto + px-4/6/8` responsive.

---

## SECTION 5 — GLASSMORPHISM & DEPTH

### CSS vars (`globals.css`)

```css
:root {
  --elevation-1: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --elevation-2: 0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --elevation-3: 0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.05);
  --elevation-4: 0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  --elevation-5: 0 20px 25px -5px rgb(0 0 0 / 0.15), 0 10px 10px -5px rgb(0 0 0 / 0.06);
  --z-base: 0; --z-raised: 10; --z-dropdown: 50; --z-sticky: 100;
  --z-overlay: 200; --z-modal: 300; --z-popover: 400; --z-toast: 500; --z-tooltip: 600;
}
```

Composant `<PuramaGlass level={1|2|3}>` : backdrop-blur 8/16/24px + border white/8-14% + bg white/4-8%.

---

## SECTION 6 — MICRO-ANIMATIONS (Framer Motion)

**Stack** : `framer-motion`

### `/lib/brand/motion.ts`

```typescript
import type { Transition, Variants } from 'framer-motion';

export const puramaSpring: Record<string, Transition> = {
  gentle: { type: 'spring', stiffness: 170, damping: 26, mass: 1 },
  bouncy: { type: 'spring', stiffness: 400, damping: 20, mass: 1 },
  snappy: { type: 'spring', stiffness: 500, damping: 40, mass: 1 },
  smooth: { type: 'spring', stiffness: 200, damping: 30, mass: 1 },
  wobbly: { type: 'spring', stiffness: 300, damping: 14, mass: 1 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: puramaSpring.gentle },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: puramaSpring.smooth },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};

export const staggerContainer: Variants = {
  hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const hoverLift = { scale: 1.02, y: -2, transition: puramaSpring.snappy };
export const hoverPress = { scale: 0.98, transition: puramaSpring.snappy };
```

Composant `<PuramaPageTransition>` avec `AnimatePresence mode="wait"` + `usePathname` key.

Hook `usePuramaMotion()` qui respecte `useReducedMotion` de Framer Motion.

---

## SECTION 7 — DARK & LIGHT MODE

**Stack** : `next-themes`

### CSS variables dual (`globals.css`)

```css
:root {
  --bg-base: 255 255 255; --bg-raised: 249 250 251; --bg-overlay: 255 255 255;
  --fg-primary: 10 10 10; --fg-secondary: 64 64 64; --fg-tertiary: 115 115 115; --fg-quaternary: 163 163 163;
  --border-subtle: 229 229 229; --border-strong: 212 212 216; --ring-focus: 59 130 246;
  color-scheme: light;
}

.dark {
  --bg-base: 10 10 10; --bg-raised: 20 20 20; --bg-overlay: 28 28 30;
  --fg-primary: 245 245 245; --fg-secondary: 185 185 185; --fg-tertiary: 130 130 130; --fg-quaternary: 100 100 100;
  --border-subtle: 40 40 40; --border-strong: 64 64 64; --ring-focus: 99 179 237;
  color-scheme: dark;
}
```

**Composants** : `<PuramaThemeProvider>` wrapper `<ThemeProvider>` de next-themes · `<PuramaThemeToggle>` avec 3 options (sun/system/moon) et layoutId animation.

---

## SECTION 8 — PREMIUM COMPONENTS

### Install

```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input label separator toast tooltip
npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot sonner
```

### `/components/ui/PuramaButton.tsx`

```tsx
'use client';
import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { puramaSpring, hoverLift, hoverPress } from '@/lib/brand/motion';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-white text-black hover:bg-white/90',
        secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/15',
        ghost: 'text-white hover:bg-white/5',
        outline: 'border border-white/20 text-white hover:bg-white/5',
      },
      size: { sm: 'h-9 px-4 text-body-sm', md: 'h-11 px-6 text-body', lg: 'h-14 px-8 text-body-lg' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean; shimmer?: boolean;
}

export const PuramaButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant, size, loading, shimmer, children, disabled, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={!disabled && !loading ? hoverLift : undefined}
      whileTap={!disabled && !loading ? hoverPress : undefined}
      transition={puramaSpring.snappy}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...(props as any)}
    >
      {shimmer && (
        <span className="absolute inset-0 pointer-events-none" aria-hidden>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </span>
      )}
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  )
);
PuramaButton.displayName = 'PuramaButton';
```

### Tailwind keyframes

```typescript
keyframes: {
  shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
},
animation: { shimmer: 'shimmer 2s infinite' },
```

Composants similaires : `<PuramaCard interactive>` (hover lift), `<PuramaInput label error>` (focus ring animé), `<PuramaToaster>` (sonner avec theme).

---

## SECTION 9 — ICONOGRAPHY

**Stack** : `lucide-react` (exclusif)

### `/components/brand/PuramaIcon.tsx`

```tsx
import type { LucideIcon, LucideProps } from 'lucide-react';

interface Props extends Omit<LucideProps, 'size'> {
  icon: LucideIcon; size?: 12 | 16 | 20 | 24 | 32; label?: string;
}

export function PuramaIcon({ icon: Icon, size = 20, label, className, ...props }: Props) {
  return (
    <Icon size={size} strokeWidth={1.5} className={className}
      aria-hidden={!label} aria-label={label} role={label ? 'img' : undefined} {...props} />
  );
}
```

**Tailles** : 12/16/20/24/32. Stroke 1.5. `aria-label` obligatoire sur icon-only.

---

## SECTION 10 — SONIFICATION (Tone.js)

**Stack** : `tone`

### `/hooks/usePuramaSound.ts`

```typescript
'use client';
import { useCallback, useEffect, useRef } from 'react';
import * as Tone from 'tone';

type SoundType = 'hover' | 'click' | 'success' | 'error' | 'notification';

const DEFS: Record<SoundType, { freq: any; duration: string; vol: number }> = {
  hover: { freq: 880, duration: '32n', vol: -25 },
  click: { freq: 660, duration: '16n', vol: -20 },
  success: { freq: ['C5','E5','G5'], duration: '8n', vol: -18 },
  error: { freq: 220, duration: '8n', vol: -22 },
  notification: { freq: ['E5','G5'], duration: '16n', vol: -20 },
};

export function usePuramaSound() {
  const synthRef = useRef<Tone.Synth | null>(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    enabledRef.current = typeof window !== 'undefined' && localStorage.getItem('purama-sound') === 'on';
  }, []);

  const play = useCallback(async (type: SoundType) => {
    if (!enabledRef.current) return;
    try {
      if (!synthRef.current) {
        await Tone.start();
        synthRef.current = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 },
        }).toDestination();
      }
      const def = DEFS[type];
      synthRef.current.volume.value = def.vol;
      if (Array.isArray(def.freq)) {
        def.freq.forEach((f: any, i: number) => {
          synthRef.current!.triggerAttackRelease(f, def.duration, Tone.now() + i * 0.08);
        });
      } else {
        synthRef.current.triggerAttackRelease(def.freq, def.duration);
      }
    } catch {}
  }, []);

  const toggle = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    localStorage.setItem('purama-sound', enabled ? 'on' : 'off');
  }, []);

  return { play, toggle, enabled: enabledRef.current };
}
```

Toggle user dans settings. Lazy load au premier hover. Volume -25 à -18 dB.

---

## SECTION 11 — HAPTIC FEEDBACK

### `/hooks/usePuramaHaptic.ts`

```typescript
'use client';
import { useCallback, useEffect, useRef } from 'react';

type HapticType = 'tap' | 'click' | 'success' | 'error' | 'warning';

const PATTERNS: Record<HapticType, number | number[]> = {
  tap: 10, click: 15, success: [10,50,10], error: [30,50,30], warning: [20,40,20],
};

export function usePuramaHaptic() {
  const enabledRef = useRef(false);
  const supportedRef = useRef(false);

  useEffect(() => {
    supportedRef.current = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    enabledRef.current = typeof window !== 'undefined' && localStorage.getItem('purama-haptic') !== 'off';
  }, []);

  const trigger = useCallback((type: HapticType) => {
    if (!enabledRef.current || !supportedRef.current) return;
    try { navigator.vibrate(PATTERNS[type]); } catch {}
  }, []);

  return { trigger, supported: supportedRef.current };
}
```

Patterns courts (5-30ms). Toggle user. Try/catch silent.

---

## SECTION 12 — LOADING / EMPTY / ERROR STATES

### Composants

- `<PuramaSkeleton className="h-4 w-full" />` : avec shimmer animation
- `<PuramaEmpty icon={} title={} description={} action={{label, onClick}} />` : layout centré avec icône circulaire
- `<PuramaErrorBoundary>` : class component avec fallback esthétique (AlertCircle + bouton rafraîchir)

**INTERDIT** : "Loading…" nu · spinner Chrome par défaut · "Aucun résultat" sans CTA · stack traces visibles.

---

## SECTION 13 — MOTION AVANCÉE

Hook `usePuramaScroll()` : `useScroll` + `useTransform` + `useSpring` pour scroll-linked animations.

Composant `<PuramaParallax layers={[{depth, children}]}>` : 3 couches de parallax.

Composant `<PuramaSwipeCard>` : drag physics + rotation + opacity + haptic success/error sur swipe.

Shared element transitions : `layoutId` Framer Motion entre pages (style visionOS).

---

## SECTION 14 — 3D & ILLUSTRATIONS

**Stack** : `three` + `@react-three/fiber` + `@react-three/drei` + `lottie-react` + `@rive-app/react-canvas`

Composant `<PuramaScene3D>` : Canvas dynamique, Suspense, dpr=[1,2], alpha, high-performance.

Composant `<PuramaCelebration seed={}>` : sphère emissive + stars + Float, couleurs palette app. À utiliser sur récompenses (level-up KARMA/EXODUS).

Wrappers : `<PuramaLottie animationData>` · `<PuramaRive src artboard stateMachines>`.

Tous en dynamic import + SSR false.

---

## SECTION 15 — DATA-VIZ (Recharts)

**Stack** : `recharts`

### Composants custom

- `<PuramaChartTooltip>` : glass + backdrop-blur + palette-aware
- `<PuramaLineChart seed data xKey lines height>` : couleurs `palette.colors`, stroke 2.5, dots hover r=6, animation 800ms ease-out
- Mêmes patterns pour BarChart, AreaChart, PieChart

Empty state + skeleton loader dédiés.

---

## SECTION 16 — MOBILE NATIVE FEEL

**Stack** : `vaul` pour sheets

### Composants

- `<PuramaSheet open onOpenChange title>` : bottom sheet drag-to-dismiss, handle visuel, safe-area, haptic close
- `<PuramaPullToRefresh onRefresh>` : drag vertical avec rotation loader, haptic success à trigger
- `<PuramaTabBar tabs>` : bottom nav flottante, safe-area-inset-bottom, haptic tap par onglet, layoutId pour active state animé

### CSS global mobile

```css
* { -webkit-tap-highlight-color: transparent; }
html { overscroll-behavior-y: contain; }
body { touch-action: manipulation; }
input, textarea, select, button { font-size: 16px; }
```

---

## SECTION 17 — PWA / OFFLINE

**Stack** : `next-pwa` + `dexie` + `dexie-react-hooks`

### Config `next.config.ts`

```typescript
import withPWA from 'next-pwa';

export default withPWA({
  dest: 'public', disable: process.env.NODE_ENV === 'development',
  register: true, skipWaiting: true,
  runtimeCaching: [
    { urlPattern: /\.(png|jpg|webp|avif|svg)$/, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 } } },
    { urlPattern: /\.(woff2|woff|ttf)$/, handler: 'CacheFirst', options: { cacheName: 'fonts' } },
    { urlPattern: /^\/api\//, handler: 'NetworkFirst', options: { cacheName: 'api', networkTimeoutSeconds: 3 } },
    { urlPattern: /.*/, handler: 'StaleWhileRevalidate', options: { cacheName: 'default' } },
  ],
})(nextConfig);
```

Manifest `/public/manifest.webmanifest` par app avec `name`, `short_name`, `icons` (192/512/maskable), `theme_color` (= `palette.colorBack` de l'app).

Composants : `<PuramaOfflineBanner>` (détecte online/offline via `navigator.onLine`), `usePuramaInstallPrompt()` hook.

---

## SECTION 18 — PERFORMANCE EXTRÊME

### Config `next.config.ts`

```typescript
experimental: {
  ppr: true, reactCompiler: true,
  optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', '@radix-ui/react-slot'],
},
images: { formats: ['image/avif', 'image/webp'], deviceSizes: [640, 750, 828, 1080, 1200, 1920] },
compiler: { removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false },
```

Composant `<PuramaImage>` : wrapper `next/image` + `plaiceholder` pour blur automatique.

**Budget strict** : Lighthouse Perf ≥ 95 · LCP ≤ 1.5s · INP ≤ 100ms · CLS ≤ 0.05 · bundle initial ≤ 180KB gzip.

**RSC first** : `"use client"` uniquement si nécessaire.

---

## SECTION 19 — OBSERVABILITÉ

**Stack** : `@sentry/nextjs` + `@vercel/analytics` + `@vercel/speed-insights` + `posthog-js`

**Sentry config** : replay `maskAllText` + `maskAllInputs`, PII stripped, `tracesSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`.

**PostHog** : EU only, opt-in via `<PuramaCookieConsent>`, `person_profiles: 'identified_only'`, session_recording `maskAllInputs`.

**Layout** : `<Analytics>` + `<SpeedInsights>` dans `<body>`.

Hook `usePuramaTrack()` : `track(event, props)` + `identify(userId, traits)`.

---

## SECTION 20 — I18N + RTL

**Stack** : `next-intl`

### Structure

- `/messages/fr.json, en.json, es.json, ar.json`
- `/i18n/routing.ts, request.ts`
- `/middleware.ts`
- `/app/[locale]/layout.tsx`

CSS logical properties : `ms-*` / `me-*` / `ps-*` / `pe-*` au lieu de `ml-*` / `mr-*` / `pl-*` / `pr-*`.

Auto-détection RTL pour `ar`, `he`, `fa`, `ur`.

Hook `usePuramaFormat()` : currency, number, percent, date, relative (`Intl.*`).

---

## SECTION 21 — SÉCURITÉ UX

**Stack** : `react-turnstile` (Cloudflare Turnstile invisible)

### Composants

- `<PuramaOTPInput length={6} onComplete>` : 6 boxes animées, auto-advance, paste support, scale up quand rempli
- `<PuramaRateLimitBanner retryAt={Date} onExpire>` : countdown mm:ss visuel
- `<PuramaCookieConsent>` : bannière RGPD bas d'écran, Accepter/Refuser, localStorage `purama-analytics-consent`

**INTERDIT** : reCAPTCHA v2 · passwords en URL · 2FA laid sans design.

---

## SECTION 22 — ONBOARDING MAGIQUE

### Composants

- `<PuramaOnboarding seed steps onComplete onSkip>` : flow 3 étapes max, progress dots animés (layoutId), illustration par étape, haptic+son sur next, skip explicite top-right
- `<PuramaChecklist items title>` : progress bar gradient émeraude→cyan, items cochables avec bouncy spring, hover x:4, hide après 100%

**Règles** : max 3 étapes, skip toujours possible, empty dashboard interdit (toujours "Quick start" button).

---

## FICHIERS À CRÉER (STRUCTURE COMPLÈTE)

```
/lib/brand/
  purama-adn.ts · palette-generator.ts · app-config.ts · typography.ts · motion.ts
/lib/utils.ts

/components/brand/
  PuramaBackground.tsx · PuramaAvatar.tsx · PuramaAvatarUpload.tsx · PuramaTestimonial.tsx
  PuramaContainer.tsx · PuramaGlass.tsx · PuramaPageTransition.tsx
  PuramaThemeProvider.tsx · PuramaThemeToggle.tsx · PuramaToaster.tsx · PuramaIcon.tsx
  PuramaSkeleton.tsx · PuramaEmpty.tsx · PuramaErrorBoundary.tsx
  PuramaParallax.tsx · PuramaSwipeCard.tsx
  PuramaScene3D.tsx · PuramaCelebration.tsx · PuramaLottie.tsx · PuramaRive.tsx
  PuramaChartTooltip.tsx · PuramaLineChart.tsx
  PuramaSheet.tsx · PuramaPullToRefresh.tsx · PuramaTabBar.tsx · PuramaOfflineBanner.tsx
  PuramaImage.tsx · PuramaPostHog.tsx · PuramaCookieConsent.tsx
  PuramaOTPInput.tsx · PuramaRateLimit.tsx · PuramaOnboarding.tsx · PuramaChecklist.tsx

/components/ui/
  PuramaButton.tsx · PuramaCard.tsx · PuramaInput.tsx
  + shadcn/ui base (button, card, dialog, dropdown-menu, input, label, separator, toast, tooltip)

/hooks/
  usePuramaMotion.ts · usePuramaSound.ts · usePuramaHaptic.ts · usePuramaScroll.ts
  usePuramaInstallPrompt.ts · usePuramaTrack.ts · usePuramaFormat.ts

/i18n/
  routing.ts · request.ts

/messages/
  fr.json · en.json · es.json · ar.json

/public/
  manifest.webmanifest
  brand/icon-192.png, icon-512.png, icon-maskable.png, apple-touch-icon.png, favicon.ico
```

### DEPS (commande unique)

```bash
npm install @paper-design/shaders-react browser-image-compression geist framer-motion next-themes next-intl next-pwa dexie dexie-react-hooks @sentry/nextjs @vercel/analytics @vercel/speed-insights posthog-js react-turnstile three @react-three/fiber @react-three/drei lottie-react @rive-app/react-canvas recharts vaul sonner class-variance-authority clsx tailwind-merge @radix-ui/react-slot tone plaiceholder
```

### CHECKLIST QA DÉPLOIEMENT (obligatoire)

- [ ] `palette_seed` présent en tête de BRIEF.md
- [ ] 34+ composants brand créés et utilisés
- [ ] 7 hooks créés
- [ ] i18n 4 langues configuré
- [ ] PWA manifest + icônes
- [ ] Supabase migration + RLS + buckets
- [ ] Dark/Light mode fonctionne
- [ ] Lighthouse mobile Perf ≥ 95, A11y ≥ 95, SEO ≥ 95, Best Practices ≥ 95
- [ ] LCP ≤ 1.5s · CLS ≤ 0.05 · bundle ≤ 180KB gzip
- [ ] 113 tests V7 SUPREME passent
- [ ] Test iPhone Safari · Android Chrome · reduced-motion · WebGL off · offline · RTL arabe

**1 test échoué = deploy bloqué.** Niveau 100% Apple native ou l'app ne sort pas.

=== FIN PURAMA DESIGN SYSTEM V1 ===

---

# PART 3 — MAPPING PALETTE_SEED PAR APP

| Slug app | palette_seed |
|---|---|
| midas | `trading-gold-premium-midas` |
| sutra | `tech-cyber-neon-sutra` |
| moksha | `finance-premium-luxury-moksha` |
| vida | `wellness-calm-soft-vida` |
| akasha | `tech-cyber-neon-akasha` |
| purama-ai | `tech-cyber-purama-ai` |
| purama-origin | `spiritual-divine-divine-origin` |
| jurispurama | `finance-premium-luxury-jurispurama` |
| veda | `spiritual-divine-mystic-veda` |
| sangha | `warmth-community-festive-sangha` |
| prana | `water-ocean-deep-prana` |
| aether | `cosmic-aether-nebula-aether` |
| exodus | `energy-fire-epic-exodus` |
| mana | `finance-premium-luxury-mana` |
| lumios | `light-clarity-solar-lumios` |
| kaia | `nature-earth-forest-kaia` |
| adya | `energy-fire-sport-adya` |
| satya | `tech-cyber-neon-satya` |
| karma | `spiritual-divine-divine-karma` |

Pour toute app non listée ici (app future) : choisir un mood dans les 12 canoniques + modifier optionnel + slug de l'app. Demander confirmation à Tissma avant injection.

---

# PART 4 — ORDRE DE TRAITEMENT (PRIORITÉ BUSINESS)

1. **purama-ai** — Vitrine écosystème (premier screenshot jury Afnic)
2. **midas** — Plus gros CA potentiel (trading)
3. **karma** — Module transverse (bénéficie aux autres apps)
4. Les 7 autres apps live (sutra, moksha, vida, akasha, purama-origin, jurispurama, veda, sangha) en ordre alphabétique
5. Les 6 apps à créer (prana, aether, exodus, mana, lumios, kaia) au fur et à mesure
6. adya, satya, et futures apps ensuite

---

# PART 5 — RÈGLES ABSOLUES FINALES

1. Montre le plan avant chaque phase majeure. Attends "ok" de Tissma.
2. Backup systématique avant toute modif de CLAUDE.md ou BRIEF.md.
3. Zéro placeholder, zéro TODO, zéro "plus tard". Tout est production-ready ou rien.
4. Si test échoue → STOP deploy. Corrige, relance.
5. Si `palette_seed` absent → STOP. Demande à Tissma.
6. Si blocage technique → log clair + attends Tissma. Ne jamais improviser.
7. Confirmation app par app : URL deploy + screenshots + Lighthouse scores.
8. Tissma doit pouvoir dormir pendant que tu travailles.

**FIN DU FICHIER — CLAUDE CODE, COMMENCE LA PHASE A MAINTENANT.**
