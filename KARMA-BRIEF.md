# BRIEF_KARMA_V3.md — PURAMA SANCTUM V∞

Le système d'émancipation humaine le plus puissant jamais créé. 25 jeux prosociaux + NAMA (coach IA universel) + NAMA-VIDA (100% naturel pur) + TERRA NOVA (réseau social IRL révolutionnaire) + spiritualité 5 niveaux + moteur économique auto-équilibré 50/10/10/30 + jeux-marques 9% + KARMA-LEGAL automatisé + TRUST PURAMA (vérification identité).

Module à intégrer **UNIQUEMENT** dans apps wellness/santé : KAÏA, AETHER, PRANA, MANA, LUMIOS, VIDA, SANGHA, VEDA, AKASHA, EXODUS. PAS dans : MIDAS, MOKSHA, JURISPURAMA, PURAMA-AI, PURAMA-ORIGIN. 100% légal, 100% révolutionnaire. Zéro huissier, zéro avocat continu, zéro employé.

**⚠️ OVERRIDE VITAE** : Le §20 VITAE (dans CLAUDE.md) override ce brief sur pricing/split/Graines. En cas de conflit : split = 50/10/40, pricing = 9,99/49,99/99,99€ fixes, 1 Graine = 0,01€.

---

## 0. RÈGLES ABSOLUES

1. LIS D'ABORD `~/purama/CLAUDE.md` ET `~/purama/.claude/docs/design.md` (sections 9, 9bis, 9ter). Montre ton plan avant de coder.
2. JAMAIS le mot "loterie". Uniquement « jeux-concours », « défis », « karma ».
3. JAMAIS d'achat de tickets en euros. Graines gagnées par missions/événements/rituels uniquement.
4. JAMAIS de cash prize direct via jeux classiques. Exception Jackpot Terre : 50% cash + 50% ONG (reçu fiscal 66%).
5. PARRAINAGE : voir `~/purama/CLAUDE.md` (déjà configuré). Ne JAMAIS redéfinir ici.
6. COMMISSION UNIVERSELLE PURAMA = 9% sur TOUT. Pas d'exception.
7. RÉPARTITION CA : voir §20 VITAE pour règles à jour (50/10/40).
8. NAMA = coach bien-être, PAS médecin (art. L.4161-1 CSP). 3 lignes rouges vitales gravées.
9. PURAMA SANTÉ = 100% NATUREL PUR. NAMA n'évoque JAMAIS les médicaments chimiques.
10. PURAMA-AI gère tout en autonomie. Pas de salariés, pas de prestataires, pas de gouvernance participative.
11. VRAI ARGENT (euros) par défaut pour : prix jeux, parrainage, marketplace presets, cadeaux exceptionnels.
12. GRAINES uniquement pour : missions self-care, missions TERRA NOVA, entraide communautaire non-marchande.
13. KYC TERRA NOVA : obligatoire UNIQUEMENT quand user clique "Activer TERRA NOVA". JAMAIS à l'inscription.
14. SIMPLICITÉ ULTIME : Règle des 3 (3 boutons, 3 mots, 3 secondes, 3 gestes). Tests enfant 6 ans + grand-mère 80 ans obligatoires.
15. PENSER AVANT D'AGIR. Plan d'abord. Code feature par feature.
16. FINIR 100%. Zéro placeholder, zéro TODO. Tests 5 niveaux + CLIENT-SIM 21 + checklist 22 points.
17. DESIGN : suivre strictement .claude/docs/design.md sections 9/9bis/9ter.

---

## 1. VISION

PURAMA SANCTUM libère progressivement ses users sur 7 dimensions (mental, corps, argent, alimentation, énergie, relations, information) jusqu'à ce qu'ils n'aient plus besoin de rien ni personne.

**3 composants** :
- Module `@purama/karma-*` intégré dans apps wellness
- App dashboard `karma.purama.dev` (hub central)
- Coach IA NAMA spécialisé par domaine

Modèle : Tissma (fondateur unique) + PURAMA-AI (agents IA autonomes). Users = bénéficiaires, parrains, gagnants de jeux. Pas co-gérants.

---

## 2. ARCHITECTURE TECHNIQUE

### Stack

- Next.js 15, React 19, Tailwind, shadcn/ui (.claude/docs/design.md)
- Supabase self-hosted `auth.purama.dev`, Edge Functions
- Google OAuth unifié
- IA NAMA : Claude API + OpenAI Vision
- Tirages : random.org signed API
- Blockchain : Solana
- Dons ONG : HelloAsso API (reçu fiscal 66% auto)
- Paiements : Stripe
- KYC : Onfido ou Jumio ou IDnow
- Notifications : Resend + Expo Push
- Hébergement : Vercel team `team_dGuJ4PqnSU1uaAHa26kkmKKk`

### Structure monorepo

```
~/purama/karma/
├── CLAUDE.md
├── BRIEF.md
├── apps/dashboard/
├── packages/
│   ├── karma-core/
│   ├── karma-ui/
│   ├── karma-economy/      # Moteur 50/10/40 VITAE
│   ├── nama-core/
│   ├── nama-vida/
│   ├── karma-legal/
│   ├── karma-terra-nova/   # TERRA NOVA complet
│   ├── karma-trust/        # KYC + sécurité
│   ├── karma-rituals/
│   ├── karma-brands/
│   └── karma-antifraud/
└── supabase/
    ├── migrations/
    └── functions/
```

---

## 3. LES 25 JEUX

### Transversaux (5)
1. 🌱 Roue du Dharma (quotidien)
2. 🧘 Défi Collectif (hebdo)
3. 🏆 Tournoi Karma (mensuel, score 7 piliers)
4. 💎 Quête Rare (21 jours parfaits)
5. ⚡ Lightning Deals (flash 10 min)

### Par pilier (7)
6. 🧠 Concours Mental
7. 💪 Défi Corporel
8. 💰 Challenge Financier
9. 🌱 Bloom (jardin potager)
10. ⚡ Autonomie Quest
11. 🪞 Jeu Miroir (binôme)
12. 📚 Liseur

### Communautaires (3)
13. 🌍 Jackpot Terre (mensuel, 50% cash gagnant + 50% ONG reçu fiscal 66%, cap 25K€/mois)
14. 🌸 Cycle Lunaire (4 saisons)
15. 🔥 Tournoi Mahatmas (trimestriel)

### Spéciaux (3)
16. 🎁 Don Invisible (anonyme ×3 karma)
17. ⚫ Passage de l'Ombre (crises accompagnées)
18. ♾️ Résonance 369 (multiplicateurs 3h/6h/9h)

### Nouveaux V3 (7)
19. 🎡 Grande Roue Mondiale (12h GMT)
20. 🗺️ Chasse au Trésor Réel (QR codes géolocalisés)
21. 🎨 Jeu Créatif (vote communautaire)
22. 👶 Héritage Vivant (transmission générationnelle)
23. 🎭 Jeu des Masques (anonyme)
24. ⏳ Capsule Temporelle (1/5/10 ans)
25. 🌊 La Vague (viral en cascade)

---

## 4. MOTEUR KARMA-ECONOMY

### Formule universelle (version KARMA V3 — remplacée par VITAE §20.6)

```typescript
export function calculateAppEconomics(params: {
  appSlug: string;
  monthlyPrice: number;
  activeSubscribers: number;
}) {
  const annualCA = params.monthlyPrice * params.activeSubscribers * 12;
  
  return {
    ca: annualCA,
    prizesToUsers: annualCA * 0.50,        // 50% prix jeux
    marketingBudget: annualCA * 0.10,      // 10% pub (VITAE le supprime)
    associationPurama: annualCA * 0.10,    // 10% Asso
    tissma: annualCA * 0.30,               // 30% Tissma (VITAE : 40%)
    
    prizeBreakdown: {
      dailyRoulette: annualCA * 0.50 * 0.20,
      weeklyChallenge: annualCA * 0.50 * 0.10,
      monthlyTournament: annualCA * 0.50 * 0.15,
      rareQuest: annualCA * 0.50 * 0.10,
      lightningDeals: annualCA * 0.50 * 0.05,
      jackpotEarth: Math.min(annualCA * 0.50 * 0.25, 25000 * 12),
      pillarGames: annualCA * 0.50 * 0.10,
      specialGames: annualCA * 0.50 * 0.05,
    },
  };
}
```

**→ Utilise le moteur VITAE §20.6 (gains dynamiques adaptatifs) qui remplace celui-ci.**

### Règles auto-appliquées

1. 100% actifs gagnent ≥ 1× par mois
2. Ratio valeur perçue / coût réel ≥ 5×
3. Cap Jackpot Terre 25 000€/mois
4. Planchers par tier respectés
5. Proportionnalité prix abo
6. Jeux-marques 9% s'ajoutent (ne cannibalisent pas)
7. Protection rentabilité auto (si CA baisse, cagnottes ajustées)

---

## 5. COMMISSION UNIVERSELLE 9%

Toute commission PURAMA = 9%. Sans exception.

Marketplace partenaires, jeux-marques, sponsoring, affiliation, partenariats, presets NAMA (9% PURAMA / 91% créateur).

Argument marketing : « PURAMA prend 9%, Amazon prend 30%. »

---

## 6. ABONNEMENTS — VITAE OVERRIDE

**⚠️ Ce paragraphe était "abonnements configurables par app" dans KARMA V3. VITAE §20.1 remplace par 3 plans fixes : 9,99 / 49,99 / 99,99€. Tu ne demandes plus le prix à Tissma. Les prix sont verrouillés.**

Accès IDENTIQUE aux 3 plans, seul le multiplicateur de gains diffère (×1, ×5, ×10).

KARMA universel cross-apps : Graines, jeux, niveaux Sanskrit, cagnotte, rituels traversent TOUTES les apps wellness.

---

## 7. NAMA — COACH UNIVERSEL

### Principe

Coach IA présent dans chaque app wellness, mémoire partagée cross-apps chiffrée chez user.

### Config BRIEF.md app

```yaml
nama_config:
  domaine: "[santé/créativité/social/impact/transition/apprentissage]"
  specialite: "[spécialisation]"
  promesse: "[promesse 12 mois]"
  micro_habitude: "[action 30s/jour]"
  bases_expertise: ["[Expert 1]", "[Expert 2]"]
```

### 10 personnalités (selon domaine)

NAMA-Médecin (KAÏA, PRANA, AETHER, MANA, LUMIOS) / NAMA-Muse (créa) / NAMA-Guide (SANGHA) / NAMA-Sentinel (VIDA) / NAMA-Mentor (EXODUS) / NAMA-Polyglotte (VEDA) / NAMA-Professeur / NAMA-Coach.

### 30 super-pouvoirs

Voix personnalisée, vision IA, check 5s, 6 dimensions Avicenne, micro-habitudes, mémoire chiffrée, rituels matin/soir, 7 Grandes Questions, accompagnement crises, sources scientifiques, rythmes naturels (circadiens/lunaires/cycle), célébrations sincères, reprogrammation subconscient, IA prédictive santé, adaptation domaine, connexion IRL, détection croyances limitantes, visualisation guidée, bande-son 432/528Hz, Journal Sacré, calendrier lunaire personnel, signature vibratoire, bibliothèque audiobooks, méditations visuelles IA, constellation familiale, dialogue nature, planification quantique, coach de parole, oracle personnel, mode Intégration.

### Personnalisation

100+ paramètres : voix, ton, prénom, langue, 5 niveaux spirituels, 5 profils santé (100% naturel défaut), sujets bloqués, rythmes, fréquence notifications, style célébration, mode famille (6 profils), intensité rituels.

### Marketplace presets NAMA

Top presets mondiaux, essai 7j, créateurs 91% / PURAMA 9%, certification "Preset Mahatma" à 1000+ adoptions.

---

## 8. NAMA-VIDA — IA MÉDECIN 100% NATUREL PUR

### Positionnement absolu

PURAMA = sanctuaire 100% naturel. NAMA-VIDA enseigne UNIQUEMENT le naturel. N'évoque JAMAIS les médicaments chimiques.

### 20 disciplines maîtrisées

Phytothérapie (ELPM/IMDERPLAM), Aromathérapie (Baudoux), Gemmothérapie, Ayurveda (OMS), MTC, Hydrothérapie (Kneipp), Nutrition vivante (Weston Price/Hyman), Jeûne (Fung/Longo), Pranayama, Méditation (MBSR/Dispenza), Wim Hof, Énergétique, Fleurs de Bach, Homéopathie, Nutrithérapie, Chronobiologie, Réflexologie, Shiatsu/acupression, Aromathérapie vibratoire, Géobiologie.

### Bibliothèque 500+ plantes

Fiches détaillées (usages, contre-indications, posologie), photos identification IA, saisons, préparations. Sources : ELPM, IMDERPLAM, Dr Brun, Dr Morel.

### 3 lignes rouges vitales gravées dans le code

1. **N'évoque jamais les médicaments chimiques**. Si user en parle : « Je ne parle que de naturel. Pour tout médicament, consulte un pro intégratif. »
2. **Urgences vitales** : détection mots-clés → affichage INSTANTANÉ 15/18/112
3. **Mineurs** : pas de jeûne prolongé, pas de protocoles extrêmes, rappel parents/médecin

### Disclaimer d'activation obligatoire

User signe à l'inscription : « PURAMA = médecine naturelle. NAMA pas médecin. Mes choix santé m'appartiennent. Urgences = 15/112. »

---

## 9. TERRA NOVA — Le mode IRL révolutionnaire

### 🌟 Vision

TERRA NOVA = premier réseau social physique mondial où users gagnent de la vraie monnaie (GRAINES, MLC légale ESS 2014) en se rencontrant IRL pour missions positives.

### 📜 Base légale MLC

Loi ESS du 31 juillet 2014, article 16. Association PURAMA = ESS. Graines non-convertibles en euros (ACPR). 78+ MLC en France en 2026.

### 🏥 Reconnaissance santé publique

Grande Cause Nationale Santé Mentale 2026. Éligible appels à projets Assurance Maladie (prévention isolement, compétences psychosociales, prévention mal-être/épuisement, maintien lien social).

### 🎯 Les 10 piliers

1. Tribus fixes 12 mois (8-15 users compatibles via IA Résonance)
2. 50 formats de rencontres
3. Graines = MLC légale française
4. 7 rites initiatiques (naissance → passage)
5. Ordonnance Verte (prescription médicale PURAMA)
6. Reconnaissance santé publique
7. Mentor Sacré (jumelage intergénérationnel)
8. Tribus Miroirs (jumelage international)
9. Étude scientifique Inserm/CNRS longitudinale
10. Économie circulaire fermée (Graines ne sortent pas de l'écosystème)

### 🌈 Les 50 formats de rencontres

**10 formats réguliers** : Binôme Karma, Cercle Local Fixe, Rassemblement Régional, Grand Rassemblement Annuel, Retraites Weekend, Pèlerinages Karma, Camps Autonomie, Repas Village, Voyages Initiatiques, Festivals Terre (V2).

**15 formats révolutionnaires** : Rendez-vous Mystères, Cercles Vulnérabilité, Moaïs PURAMA, Cercles Réciprocité, Sorties Cueillette Sauvage, Rituels Shadow Work, Créations Collectives, Cercles Feu Sacré, Exploration Lieux Pouvoir, Semailles Intergénérationnelles, Missions Solidarité Radicale, Défis Autonomie 24h, Ateliers Mémoire Orale, Nuits Présages, Bains Nature Silencieux.

**25 nouveaux formats V∞** : Veillées Solstice, Retraites Silencieuses Vipassana, Ascensions Sacrées, Nage Libre Cold, Soirées Storytelling, Cercles Mères (F), Cercles Pères (M), Cercles LGBTQ+ Safe, Cercles Intergénérationnels Protégés, Cercles Deuil, Cercles Périnataux, Cercles Producteurs, Clubs Lecture Profonde, Soirées Cinéma Éveil, Chorales Sacrées, Ateliers Art-Thérapie, Groupes Course Zen, Retraites Jeûne Collectif, Wwoofing PURAMA, Groupes Parents Solo, Cercles Jeux Société Profonds, Ateliers Photo Thérapeutique, Cuisines Collectives, Missions Réparation, Jardins Communautaires Karma.

### 💰 Tarif missions en Graines (exemples)

Cercle local (2h) = 30 / Ramassage déchets (3h) = 50 / Visite EHPAD (2h) = 100 / Méditation collective (1h) = 20 / Plantation arbres (½ journée) = 80 / Pèlerinage 3j = 500 / Retraite weekend = 300 / Mission Solidarité Radicale = 150 / Mémoire Orale = 120.

**⚠️ VITAE OVERRIDE** : 1 Graine = 0,01€ (pas 1€ comme KARMA V3). Recalibrer tous les montants ×100 pour volumes.

### 🎯 Utilisations des Graines

- Payer abonnement PURAMA (100 Graines = 1 mois — VITAE recalibre)
- Acheter chez partenaires Marketplace PURAMA (9% commission)
- Donner à ONG (reçu fiscal 66%)
- Transmettre à autre user
- Accéder événements VIP

### 🔄 Monnaie fondante

Graines non utilisées en 6 mois → perdent 2%/mois → redistribuées au Fonds de Libération. Force la circulation.

**VITAE §20.4** ajoute fonte Gesell -0,5%/mois sur soldes inactifs 30j+. Soldes actifs PAS de fonte.

### 🧬 Algorithme de Résonance

IA analyse personnalité user (MBTI + enneagramme + ayurveda + valeurs + passions + objectifs) → propose 7 users avec plus haute résonance vibratoire. Compatibilité profonde, pas swiping.

### 📜 Pacte de Tribu

Chaque cercle local fixe signe pacte 12 mois : engagement, confidentialité, soutien mutuel. Rituel initiation + cérémonie clôture. Archivé blockchain.

### 7 Rites Initiatiques

1. 🌱 Naissance (bienvenue user + famille)
2. 🌿 Adulte (18-25 ans, autonomie)
3. 💚 Union (mariage/partenariat)
4. 👶 Parentalité (naissance enfant)
5. 🔄 Transformation (divorce, reconversion, migration)
6. 🟢 Âge Sage (50+, transmission)
7. 🕊️ Passage (fin de vie, accompagnement)

Chaque initiation = cérémonie IRL 2-5 jours avec tribu. Rituels + partage + capsule temporelle. Documents blockchain signés témoins.

### 🌿 Ordonnance Verte

Médecin traitant prescrit TERRA NOVA comme un traitement. 10 ordonnances-type : Isolement senior / Dépression légère / Burnout / Post-partum / Deuil / Anxiété chronique / Dépendance numérique / Écoanxiété / Solitude post-rupture / Transition de vie.

Mutuelles remboursent abonnement PURAMA sur ordonnance. Partenariats Harmonie Mutuelle, MGEN, MAIF, Apicil, API Santé.

### 👴 Mentor Sacré

Chaque Mahatma jumelé à un "Ancien PURAMA" (65+ ans). Appel vidéo mensuel + rencontre IRL 2×/an. Transmission intergénérationnelle.

### 🌍 Tribus Miroirs

Ta tribu française (15) jumelée avec tribu équivalente à Japon/Maroc/Brésil/Sénégal/Vietnam. Rencontres virtuelles trimestrielles. Voyage échange bi-annuel.

### 🧬 Étude scientifique longitudinale

10 000 users sur 5 ans. Partenariat Inserm, CNRS, Lyon 1, Bordeaux, Strasbourg. Marqueurs : GAD-7, PHQ-9, UCLA Loneliness, HRV (Oura opt-in), cortisol salivaire opt-in, microbiote opt-in, télomères opt-in. Publication Lancet/Nature après 3 ans.

### 💰 10 sources revenus TERRA NOVA

1. Mutuelles (Ordonnance Verte)
2. Assurance Maladie (appels à projets santé mentale)
3. Collectivités (FSE, CAF, conseils régionaux)
4. Entreprises (prévention RPS, QVT)
5. ONG partenaires
6. Marques éthiques (sponsoring)
7. Fondations (Bettencourt, La France s'engage)
8. Grants scientifiques (ANR, ERC, Horizon Europe)
9. Marketplace PURAMA (9%)
10. Partenariats internationaux (UNESCO, OMS)

Projection An 3 : ~1,9M€/an. An 5 : ~13,3M€/an.

---

## 10. TRUST PURAMA — Vérification identité TERRA NOVA

### 🎯 Principe UX critique

**KYC déclenché UNIQUEMENT à l'activation de TERRA NOVA, JAMAIS à l'inscription.**

### Flux d'inscription (zéro friction)

1. Email + téléphone OTP
2. Prénom + âge + ville
3. Paiement abonnement (Stripe)
4. ✅ Accès immédiat à : NAMA, jeux KARMA, missions self-care, toutes features app

### Flux d'activation TERRA NOVA

User clique sur onglet TERRA NOVA pour la première fois → écran s'affiche :

```
🌱 Bienvenue dans TERRA NOVA

La communauté qui se retrouve dans la vraie vie.

Pour protéger tout le monde, nous vérifions
l'identité de chaque membre.

✓ CNI ou passeport
✓ Reconnaissance faciale
✓ 2 minutes chrono
✓ 100% chiffré

[ Vérifier mon identité ]
( Plus tard )
```

### Vérification (2 min, prestataire Onfido)

**Étape 1 — Pièce identité** : photo CNI/passeport → IA vérifie authenticité → âge 18+ obligatoire
**Étape 2 — Liveness** : selfie vidéo avec mouvements → matching biométrique CNI → anti-deepfake
✅ Vérifié en < 2 min

### Après vérification

- Accès complet TERRA NOVA (50 formats)
- Carte géolocalisée opt-in
- Badge "Vérifié ✓" sur profil
- Matching algorithme Résonance activé

### Coût

Onfido ~1,50€/vérification. Financement via 10% pub/marketing CA. Économie car seulement users TERRA NOVA vérifiés (~30% des abonnés) → 45K€/an au lieu de 150K€/an.

---

## 11. SÉCURITÉ ABSOLUE — Les 12 couches TERRA NOVA

### 🆘 Couche 1 — Bouton SOS avancé
Appui discret 3s écran verrouillé → SOS silencieux → géoloc précise au contact urgence + enregistrement audio 5 min chiffré. Fausse app "Calculatrice" avec SOS caché. Appel fictif NAMA.

### 📍 Couche 2 — Safe Walk (partage position)
User active partage géoloc live avec 3 contacts confiance pendant rencontre. Confirmation retour à heure fixe sinon alerte automatique.

### 🔒 Couche 3 — Ange Gardien (1ères rencontres)
PURAMA-AI assigne Mahatma certifié Gardien à proximité géographique lors de la toute première rencontre. Peut intervenir si besoin. Rémunéré en Graines.

### 💊 Couche 4 — Protection GHB/drogues
NAMA détecte signes via messages. Check-in automatique pendant rencontres ("Touche le 3 puis le 5"). Partenariats cafés "Ask for Angela".

### 🧠 Couche 5 — IA prédictive risques
Analyse patterns conversation pré-rencontre. Détection red flags (demande insistante domicile, refus lieu public, love bombing). Alerte préventive user.

### 🚫 Couche 6 — Zones interdites
PURAMA-AI refuse rencontres : zones isolées nuit, domiciles privés pour 10 premières rencontres, lieux incidents signalés. 1ères rencontres OBLIGATOIREMENT lieu public affluent.

### 🔐 Couche 7 — Coffre-fort preuves
User peut scanner CNI autre user (coffre chiffré perso). Enregistrement audio/vidéo optionnel (consentement mutuel). Preuves accessibles uniquement ordre judiciaire.

### 🏢 Couche 8 — Safe Spaces certifiés PURAMA
Partenariats 3000+ cafés/librairies/centres wellness/coworkings. Formation personnel. Codes urgence. Caméras sécu. Badge visible. Users peuvent filtrer "uniquement Safe Spaces".

### 👮 Couche 9 — Partenariat gendarmerie/police
Protocole officiel Gendarmerie Nationale + Police Nationale. Accès rapide preuves sur mandat. Numéro dédié signalement prioritaire. Coopération 100% autorités.

### 🏥 Couche 10 — Partenariat 3919/3018/119/3114
Accès direct depuis app. Détection contextes violence conjugale/cyberharcèlement/enfance danger/prévention suicide → ressources confidentielles auto.

### 💔 Couche 11 — Protection manipulation émotionnelle
NAMA alerte si user passe trop temps avec une seule personne (dépendance). Détection patterns emprise (isolement, contrôle, culpabilisation). Ressources MIVILUDES si sectaire.

### 📜 Couche 12 — Assurance RC Pro + fonds garantie
Via Association PURAMA : RC Pro Événements ~2K€/an. Fonds garantie 50K€ pour indemniser victimes.

---

## 12. 5 GARANTIES ZÉRO RISQUE

### 🥇 Promesse à vie
User qui suit règles (lieux publics certifiés, KYC fait, signalement au doute) = protégé par écosystème.

### 🥈 Compensation automatique
Expérience négative malgré protections :
- 6 mois abonnement gratuit
- 500 Graines compensation
- 12 séances psy Mon Soutien Psy remboursées

### 🥉 Blacklist cross-apps
Banni pour comportement inapproprié → banni sur les 100 apps PURAMA à vie. Impossible revenir (CNI + reconnaissance faciale).

### 🏅 Transparence radicale
Rapport public sécurité annuel : signalements, bannissements, incidents (anonymisés), évolution Trust Scores, plan amélioration.

### 🏆 Comité éthique externe
5 personnes indépendantes (juriste + psychologue + représentant asso victimes + chercheur santé publique + philosophe). Revue trimestrielle. Audit externe annuel. Pouvoir recommandation (Tissma garde contrôle final).

---

## 13. KARMA UNIVERSEL CROSS-APPS

Graines, jeux, niveaux Sanskrit traversent TOUTES les apps wellness.

### Niveaux Sanskrit

```
Novice (0-100) → Sadhaka (101-1K) → Yogin (1K-10K) 
→ Siddha (10K-100K) → Mahatma (100K+) → Libéré (7 piliers max + Ashrama)
```

### 7 piliers de liberté

1. 🧠 Mentale (GAD-7)
2. 💪 Corporelle (mobilité, capacité)
3. 💰 Financière (épargne, passif)
4. 🌱 Alimentaire (auto-production)
5. ⚡ Énergétique (autonomie)
6. 🤝 Relationnelle (UCLA Loneliness)
7. 🌍 Informationnelle (temps lecture/scroll)

---

## 14. KARMA-LEGAL — Automatisation totale

### Capacités

1. Règlements auto-générés par jeu (Code conso + CNIL + RGPD)
2. Preuve antériorité blockchain Solana (hash SHA-256, ~0,001€/tx)
3. Tirages random.org signed certifiés
4. Conformité RGPD automatique
5. Audit légal continu IA (50 points avant release + scan Légifrance hebdo)
6. Anti-fraude IA (patterns, multi-comptes, vision)
7. Archivage 10 ans (Supabase chiffré + IPFS + S3 cold)
8. Contrats marques auto-générés
9. Templates défense (user contestataire, DGCCRF)
10. Conformité DSA européen

### Coût

~80-100€/mois pour 100 apps (Random.org 5$ + Solana <10€ + Claude API ~50€).

### Budget juridique humain total

~500€/an (Création SASU one-shot + assurance RC Pro).

---

## 15. JEUX-MARQUES (commission 9%)

### Principe

Marques éthiques créent leurs jeux-concours sur PURAMA. Apportent cagnotte. **Commission 9% PURAMA.**

### Marques éligibles (validation IA)

✅ Bio, éthique, B Corp, artisans, producteurs locaux, wellness
❌ Big Pharma, alcool, tabac, malbouffe, fast-fashion, cryptos spéculatives

### 6 types de jeux

Roue Marque / Méga Jackpot / Défi Collaboratif / Bundle Surprise / Concours Créatif / Challenge Impact.

### Workflow 100% auto

Marque crée jeu → PURAMA-AI valide éthique → KARMA-LEGAL génère contrat + règlement → Signature électronique → 9% prélevé auto → Publié → Random.org tire → Gagnants notifiés → Prix livrés → Blockchain trace. **Zéro intervention humaine PURAMA.**

### Projection

An 2 : 32K€/an. An 3 : 648K€/an. An 5 : 6,8M€/an.

---

## 16. SPIRITUALITÉ + REPROGRAMMATION

### 5 niveaux au choix user

1. ☁️ Pure science
2. 🌱 Douce ouverture
3. 🌿 Équilibrée (défaut)
4. 🌳 Profonde
5. 🕉️ Pleinement spirituelle

### 17 techniques validées

Affirmations (Murphy/Dispenza), Visualisation, PNL ancrage (Bandler), PSYCH-K (Lipton), EMDR light (Shapiro), Cohérence cardiaque (HeartMath), Méditation Dispenza 21j, TRE, Journaling Shadow (Jung), Gratitude, Ho'oponopono, Constellation familiale (Hellinger), Chamanisme (Villoldo), Breathwork holotropique (Grof), Solfeggio 396-963Hz, Yoga Nidra, EFT Tapping.

### Rituels cosmiques annuels

Équinoxe printemps (Réveil) / Solstice été (Feu) / Équinoxe automne (Récolte) / Solstice hiver (Silence). 12 pleines lunes + 12 nouvelles lunes. Bonus Graines ces jours.

---

## 17. 20 INNOVATIONS

1. Mode Ashrama (réduit usage à Mahatma, anti-Facebook)
2. Fonds de Libération (abonnements gratuits précaires)
3. Héritage Karma
4. Rituels cosmiques (alignés astronomiquement)
5. Blockchain transparente (Solana)
6. Don Invisible (×3 karma)
7. Résonance 369 (Tesla)
8. Monomythe 12 étapes (Campbell)
9. Manifeste PURAMA
10. Légende Personnelle (Coelho)
11. Pacte d'Ombre
12. Oracle PURAMA
13. Miroir Temporel
14. Cérémonie de Passage
15. Cercle de Guérison
16. Archives Vivantes
17. Missions Impossibles Collectives
18. Fonds Ancestral
19. Académie des Âmes
20. Grand Départ

---

## 18. SIMPLICITÉ — Règle des 3

3 boutons max / 3 mots max / 3 secondes / 3 gestes.

### 5 tests release obligatoires

1. Enfant 6 ans (5 min sans aide)
2. Grand-mère 80 ans (1 action sans explication)
3. Personne illettrée (narration vocale NAMA complète)
4. Non-francophone (emojis + icônes universelles)
5. Accessibilité (malvoyants, malentendants, dyslexiques)

Si test échoue → simplifier.

### Règles design

Emojis avant mots, boutons 80px+, narration NAMA, célébrations (anim + son + haptique <100ms), erreurs douces, swipes intuitifs.

---

## 19. BASE DE DONNÉES SUPABASE

Tables principales :

- `karma_users`, `karma_missions`, `karma_mission_completions`
- `karma_games`, `karma_tickets`, `karma_draws`, `karma_winners`, `karma_prizes`, `karma_ongs`
- `karma_prosocial_links`, `karma_collective_challenges`
- `terra_nova_events`, `terra_nova_participations`, `terra_nova_pactes`, `terra_nova_rites`
- `terra_nova_safe_spaces`, `terra_nova_safe_walk_sessions`
- `karma_brand_games`, `karma_brands`
- `karma_fraud_signals`, `karma_rate_limits`
- `nama_user_config`, `nama_memory`, `nama_presets`
- `app_subscriptions_config`, `user_subscriptions`
- `liberation_fund_grants`
- `kyc_verifications` (Onfido webhooks)
- `trust_scores`, `user_reports`, `blacklist`

RLS partout. Edge Functions pour validations.

---

## 20. VARIABLES D'ENVIRONNEMENT

```bash
KARMA_RANDOM_ORG_API_KEY=
KARMA_HELLOASSO_CLIENT_ID=
KARMA_HELLOASSO_CLIENT_SECRET=
KARMA_SOLANA_PRIVATE_KEY=
KARMA_SOLANA_RPC_URL=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
KARMA_SUPABASE_URL=https://ylkkmvihffblfhsvabqa.supabase.co
KARMA_SUPABASE_SERVICE_ROLE=
RESEND_API_KEY=
EXPO_TOKEN=c3BAFY2ldoSZh0B4Dp5SeOr0FFBqp4yZZYCkZDoh
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ONFIDO_API_KEY=              # KYC TERRA NOVA
ONFIDO_WEBHOOK_TOKEN=
```

---

## 21. PLAN D'EXÉCUTION PHASE PAR PHASE

### Phase A — Fondations
Migration Supabase complète, Auth unifié, packages karma-core + nama-core + karma-economy, Edge Functions de base, catalogue 50 missions initiales, UI SeedsBalance + MissionCard, tests 5 niveaux.

### Phase B — Les 25 jeux
Roue Dharma, Défi Collectif, Tournoi Karma, Quête Rare, Jeu Miroir, Jackpot Terre (+ HelloAsso), 7 jeux piliers, 3 communautaires, 3 spéciaux, 7 V3.

### Phase C — NAMA complet
30 super-pouvoirs, 10 personnalités, vision IA, voix, mémoire chiffrée, marketplace presets.

### Phase D — NAMA-VIDA
Base 500 plantes, 20 disciplines, 3 lignes rouges gravées, règles "zéro médicament chimique".

### Phase E — TERRA NOVA V∞
Carte géolocalisée opt-in, 50 formats rencontres, missions IRL, algorithme Résonance, 7 rites initiatiques, Mentor Sacré, Tribus Miroirs, Pacte de Tribu, Ordonnance Verte, MLC (Graines ESS), monnaie fondante, étude scientifique Inserm.

### Phase F — TRUST PURAMA & SÉCURITÉ
Intégration Onfido (CNI + liveness), flux UX (KYC à l'activation seulement), 12 couches sécurité, 5 garanties zéro risque, partenariats gendarmerie/3919/3018/3114, Comité éthique externe, rapport transparence annuel.

### Phase G — Spiritualité
5 niveaux, 17 techniques, adaptation par app, rituels cosmiques (solstices/équinoxes/lunes).

### Phase H — Abonnements par app
**VITAE §20.1** : 3 plans fixes (9,99/49,99/99,99€). Stripe auto. Plus de demande de prix.

### Phase I — Jeux marques
Interface admin, validation éthique IA, contrats auto, commission 9%, dashboard marques.

### Phase J — KARMA-LEGAL
Générateur règlements, Solana preuves, random.org certifié, audit légal continu IA, RGPD, archivage 10 ans.

### Phase K — 20 innovations
Mode Ashrama, Fonds Libération, Héritage Karma, 17 autres innovations.

### Phase L — Simplicité
Règle des 3 partout, 5 tests release, narration vocale NAMA.

### Phase M — Déploiement
Module KARMA déployé sur `karma.purama.dev`. Intégration dans apps existantes au fur et à mesure. Tests CLIENT-SIM 21 par jeu. Checklist humaine 22 points. Monitoring 72h post-launch.

---

## 22. RÉCAP DÉCISIONS VERROUILLÉES

### ✅ Dedans

- 25 jeux prosociaux
- Abonnements **3 plans VITAE** (9,99/49,99/99,99€ fixes)
- KARMA universel cross-apps
- NAMA coach universel (30 super-pouvoirs)
- NAMA-VIDA 100% naturel pur (20 disciplines, 3 lignes rouges)
- TERRA NOVA V∞ (50 formats, 10 piliers, MLC légale)
- TRUST PURAMA (KYC à l'activation TERRA NOVA seulement)
- 12 couches sécurité + 5 garanties zéro risque
- Spiritualité 5 niveaux + reprogrammation
- 7 piliers liberté
- 10 apps wellness avec déterminations
- 20 innovations révolutionnaires
- Jeux-marques commission 9%
- KARMA-LEGAL automatisé (zéro huissier, zéro avocat continu)
- Simplicité règle des 3
- PURAMA-AI gère tout en autonomie
- Vrai argent partout sauf self-care/TERRA NOVA/entraide (Graines)
- Commission universelle 9%
- **Répartition CA 50/10/40** (VITAE override KARMA V3 50/10/10/30)
- **1 Graine = 0,01€** (VITAE override KARMA V3 1€)
- Parrainage → renvoi CLAUDE.md global

### ❌ Retirés

- Dômes (privé)
- Festival (V2)
- Produits PURAMA propres (V2)
- Formations certifiantes
- Université
- Gouvernance participative / BSA / Conseil Anciens
- Missions économiques rémunérées (salariat)

---

## 23. POUR CLAUDE CODE

1. Lis `~/purama/CLAUDE.md` (avec §20 VITAE + §21 DESIGN SYSTEM intégrés)
2. Lis `~/purama/.claude/docs/design.md` sections 9/9bis/9ter
3. Lis ce BRIEF.md intégralement
4. Présente ton plan d'exécution phase par phase, SANS coder
5. Attends le "ok" de Tissma
6. Exécute feature par feature, jamais de placeholder
7. Tests 5 niveaux + CLIENT-SIM 21 + checklist 22 points à chaque étape
8. `/clear` + "Continue, lis task_plan.md" si session longue
9. Finir 100%. Ne jamais dire "fini" si pas vraiment fini

**Fin du BRIEF_KARMA_V3.md. À toi de jouer.**
