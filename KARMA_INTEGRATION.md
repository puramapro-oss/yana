# KARMA_INTEGRATION.md

**À copier dans chaque app PURAMA wellness/santé** (KAÏA, AETHER, PRANA, MANA, LUMIOS, VIDA, SANGHA, VEDA, AKASHA, EXODUS). Pour la spec complète KARMA, voir `~/purama/karma/BRIEF.md` (fichier BRIEF_KARMA_V3.md renommé en BRIEF.md dans le dossier karma). Ce fichier dit juste comment intégrer le module dans cette app.

---

## 0. QU'EST-CE QUE KARMA ?

KARMA = module universel de PURAMA qui contient :

- 25 jeux-concours prosociaux
- Coach IA NAMA adaptatif
- NAMA-VIDA (IA médecin 100% naturel)
- TERRA NOVA (réseau social IRL + MLC Graines + 50 formats rencontres)
- TRUST PURAMA (KYC à l'activation de TERRA NOVA uniquement)
- 12 couches de sécurité
- Spiritualité 5 niveaux + rituels
- Marketplace presets NAMA
- Jeux-marques (commission 9%)
- KARMA-LEGAL automatisé

Graines 🌱 = monnaie locale PURAMA (non convertible en euros cash). Vrais euros pour parrainage et prix de jeux.

Répartition CA abonnements : 50% users (prix) / 10% pub / 10% Asso / 30% Tissma.

**⚠️ OVERRIDE VITAE** : §20 VITAE (dans CLAUDE.md) remplace ce split par 50/10/40. VITAE gagne.

---

## 1. CONFIGURATION DANS BRIEF.md DE CETTE APP

Ajoute en tête du BRIEF.md :

```yaml
# ─────────────────────────────────────────
# KARMA UNIVERSEL — Intégration
# ─────────────────────────────────────────
karma:
  enabled: true
  app_slug: "[slug-app]"  # Ex: "kaia", "aether", "prana"
  
  # Spécialisation NAMA pour cette app
  nama:
    domaine: "[santé/créativité/social/impact/transition/apprentissage]"
    specialite: "[spécialisation précise]"
    promesse: "[promesse 12 mois mesurable]"
    micro_habitude: "[action 30 secondes/jour]"
    bases_expertise:
      - "[Expert 1 + référence]"
      - "[Expert 2 + référence]"
  
  # Missions spécifiques à cette app
  missions_custom:
    - slug: "[mission-1]"
      title: "[titre]"
      category: "[SELF/OTHERS/EARTH/REST]"
      pilier: "[mental/corporel/financier/alimentaire/énergétique/relationnel/informationnel]"
      seeds_reward: [nombre]
      verification_type: "[photo_ai/health_sensor/manual/peer/geo_photo]"
      max_per_day: [nombre]

# ─────────────────────────────────────────
# ABONNEMENT — VITAE §20.1 (FIXE)
# ─────────────────────────────────────────
abonnement:
  # VITAE OVERRIDE : 3 plans fixes identiques partout
  essentiel:
    prix_mensuel_eur: 9.99
    multiplicateur_gains: 1
  infini:
    prix_mensuel_eur: 49.99
    multiplicateur_gains: 5
  legende:
    prix_mensuel_eur: 99.99
    multiplicateur_gains: 10
```

---

## 2. CLAUDE CODE — Premier message

Quand tu lances Claude Code avec ce fichier présent, il configure automatiquement :

- Stripe Products avec les 3 plans VITAE
- Webhooks Stripe
- Page de paiement
- Mails de bienvenue
- Liens de parrainage (règles définies dans CLAUDE.md global)

---

## 3. INTÉGRATION CODE

### Dans `app/layout.tsx`

```tsx
import { KarmaProvider } from '@purama/karma-core';
import { NamaProvider } from '@purama/nama-core';
import { TerraNovaProvider } from '@purama/karma-terra-nova';
import { TrustProvider } from '@purama/karma-trust';

export default function RootLayout({ children }) {
  return (
    <KarmaProvider appSlug="[slug-app]">
      <NamaProvider config={briefConfig.nama}>
        <TerraNovaProvider>
          <TrustProvider>
            {children}
          </TrustProvider>
        </TerraNovaProvider>
      </NamaProvider>
    </KarmaProvider>
  );
}
```

### Dans une page

```tsx
import { 
  SeedsBalance, 
  MissionCard, 
  NamaChat, 
  TerraNovaActivation 
} from '@purama/karma-ui';

<SeedsBalance />
<MissionCard mission={currentMission} onComplete={handleComplete} />
<NamaChat />
<TerraNovaActivation /> // Déclenche KYC si user clique dessus
```

C'est tout. Le reste est géré par les packages.

---

## 4. CE QUE L'APP HÉRITE AUTOMATIQUEMENT

- ✅ Coach NAMA adapté au domaine
- ✅ 25 jeux KARMA accessibles
- ✅ Graines & niveaux Sanskrit partagés cross-apps
- ✅ Parrainage (règles définies dans CLAUDE.md global)
- ✅ TERRA NOVA (KYC déclenché uniquement si user active)
- ✅ Spiritualité 5 niveaux au choix user
- ✅ Rituels cosmiques (solstices/équinoxes/lunes)
- ✅ KARMA-LEGAL (règlements auto, blockchain, RGPD)
- ✅ Anti-fraude IA
- ✅ Simplicité règle des 3
- ✅ 12 couches sécurité TERRA NOVA

---

## 5. CE QUE TU DOIS AJOUTER POUR CETTE APP

1. Missions custom (10-30 missions spécifiques au domaine)
2. Calibrer NAMA (personnalité + expertise)
3. Prix abonnement : **FIXES VITAE** (9,99 / 49,99 / 99,99€) — ne plus demander à Tissma
4. Prix possibles à gagner via jeux (exemples)
5. Page "Comment ça marche" (emojis + règle des 3)

---

## 6. RÈGLES ABSOLUES

1. Écran principal = 3 boutons max (règle des 3)
2. NAMA narration vocale activée par défaut
3. Tests enfant 6 ans + grand-mère 80 ans obligatoires
4. Disclaimer légal auto dans app
5. Pas d'évocation médicaments chimiques (si app santé) — redirection pro intégratif
6. Design .claude/docs/design.md (sections 9/9bis/9ter)
7. KYC TERRA NOVA uniquement à l'activation (jamais à l'inscription)
8. **Respect VITAE §20** pour pricing/split/Graines

---

## 7. WORKFLOW DE LANCEMENT

```bash
mkdir ~/purama/[app-slug]
cd ~/purama/[app-slug]
cp ~/purama/CLAUDE.md .
# Copie ton BRIEF.md (spécifique à l'app)
# Copie ce fichier KARMA_INTEGRATION.md
claude --dangerously-skip-permissions
```

### Premier message à Claude Code :

> « Lis le BRIEF.md, CLAUDE.md et KARMA_INTEGRATION.md. Lis aussi .claude/docs/design.md sections 9/9bis/9ter, et le BRIEF du module KARMA à ~/purama/karma/BRIEF.md. Respect §20 VITAE pour pricing/split/Graines. Respect §21 DESIGN SYSTEM pour tous composants visuels. Montre-moi ton plan d'exécution. NE CODE PAS ENCORE. »

Fin du KARMA_INTEGRATION.md.
