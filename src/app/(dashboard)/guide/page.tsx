import Link from 'next/link'
import {
  Award, BookOpen, Car, CreditCard, Gift, MessageSquare,
  Play, Store, Ticket, TreeDeciduous, Trophy, UserRound,
  Users, Wallet,
} from 'lucide-react'
import GuideAccordion, { type GuideSection } from '@/components/guide/GuideAccordion'
import { APP_NAME } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: `Guide — ${APP_NAME}`,
  description: `Tout savoir sur ${APP_NAME} : conduire safe, planter des arbres, covoiturer, parrainer, retirer ses gains.`,
}

const SECTIONS: GuideSection[] = [
  {
    id: 'safe-drive',
    icon: Play,
    title: 'SAFE DRIVE — score de conduite',
    summary: 'Tracking live freinage, vitesse, fatigue. Score 0-100 par trajet.',
    paragraphs: [
      'À chaque trajet, YANA analyse tes freinages, accélérations et maintien de vitesse pour calculer un score de sécurité sur 100. Ton objectif : maintenir ≥ 90 sur 7 jours d\'affilée pour décrocher l\'achievement Zen Driver.',
      'Tracking 100 % local : aucune donnée GPS ne quitte ton téléphone tant que le trajet n\'est pas terminé. Seul le score final et la distance remontent côté serveur.',
      'Chaque km sûr te rapporte des points et alimente ta progression de niveau. Les plans payants appliquent un multiplicateur (x1, x5, x10 selon Essentiel / Infini / Légende).',
    ],
  },
  {
    id: 'green-drive',
    icon: TreeDeciduous,
    title: 'GREEN DRIVE — CO₂ et plantation',
    summary: 'Calcul CO₂ ADEME + arbres plantés avec preuve blockchain Bitcoin.',
    paragraphs: [
      'Chaque trajet calcule ton économie CO₂ basée sur les facteurs d\'émission ADEME officiels, en comparant ton usage réel à un trajet solo voiture thermique moyen.',
      'Dès que tu as compensé 10 kg de CO₂ cumulés, YANA déclenche la plantation d\'un arbre (via un partenaire reforestation) et horodate la preuve sur la blockchain Bitcoin (OpenTimestamps). La preuve est consultable à vie.',
      'Ton compteur d\'arbres et de CO₂ est visible sur /green, avec une forêt SVG qui pousse au fil du temps.',
    ],
  },
  {
    id: 'carpool',
    icon: Users,
    title: 'Covoiturage Dual Reward',
    summary: 'Partage tes trajets · 80% conducteur · 15% passagers · 5% Purama.',
    paragraphs: [
      'Propose ou rejoins un covoiturage sur /carpool. Le split par défaut : 80 % des gains vont au conducteur, 15 % se répartissent entre les passagers, 5 % financent les commissions + dons Association Purama.',
      'Le module Safe Walk (accessible dans la réservation) prévient automatiquement 3 contacts de confiance en cas d\'anomalie (arrêt prolongé hors trajet).',
      'Le KYC Onfido est requis avant d\'encaisser plus de 50 € par mois (exigence réglementaire).',
    ],
  },
  {
    id: 'referral',
    icon: Gift,
    title: 'Parrainage — 50 % à vie',
    summary: '3 niveaux (N1/N2/N3) · 6 tiers Bronze → Légende · commissions wallet.',
    paragraphs: [
      'Ton code de parrainage (unique) génère un lien partageable sur /referral. Chaque filleul qui s\'abonne te verse 50 % du premier paiement puis 10 % à vie sur chaque renouvellement. Niveau 2 = 15 %, niveau 3 = 5 %.',
      'Les paliers sont débloqués sur le nombre de filleuls directs (N1) : Bronze 5 · Argent 10 · Or 25 · Platine 50 · Diamant 75 · Légende 100. Chaque palier débloque des avantages (early access, page perso, statut VIP).',
      'Les commissions remontent en temps réel dans ton wallet, retrait possible dès 5 €.',
    ],
  },
  {
    id: 'wallet',
    icon: Wallet,
    title: 'Portefeuille — retrait SEPA',
    summary: 'Solde € réels · historique transactions · retrait IBAN dès 5 €.',
    paragraphs: [
      'Ton wallet accumule les euros gagnés via parrainage, missions, covoiturage, prix de concours et tirages. Les comptes gratuits accumulent des Points (verrouillés pour les retraits € jusqu\'au passage Essentiel).',
      'Demande un retrait dès 5 € via un IBAN. YANA vérifie la validité du numéro (mod-97), hache le stockage (SHA-256) et ne conserve que les 4 premiers et 4 derniers chiffres en clair.',
      'Un seul retrait actif à la fois par utilisateur (anti-double) : la demande est bloquée tant que la précédente n\'est pas complétée ou annulée.',
    ],
  },
  {
    id: 'contest-lottery',
    icon: Trophy,
    title: 'Classement hebdo + Tirage mensuel',
    summary: '10 gagnants chaque semaine + 10 chaque mois · cagnotte 6% / 4% du CA.',
    paragraphs: [
      'Classement hebdo : chaque dimanche 23h59, les 10 meilleurs scores se partagent 6 % du CA hebdomadaire. Score = parrainages × 10 + missions × 3 (+ abonnements × 50 et jours actifs × 5 à venir).',
      'Tirage mensuel : dernier jour du mois, 10 utilisateurs actifs tirés au sort se partagent 4 % du CA. Tu gagnes des tickets à chaque action (inscription, parrainage, mission, partage, avis, abonnement).',
      'Les gains atterrissent automatiquement sur le wallet. Les gagnants sont annoncés par email + notification in-app.',
    ],
  },
  {
    id: 'achievements',
    icon: Award,
    title: 'Achievements — 15 trophées',
    summary: 'Trophées débloqués par la progression · XP · niveau.',
    paragraphs: [
      'YANA propose 15 achievements classés en 4 raretés : Common (50-300 pts), Rare (500-1500 pts), Epic (1000-2500 pts) et Legendary (3000-10 000 pts).',
      'Exemples : Premier Trajet (1er), Zen Driver (7 jours ≥ 90), Forest Builder (10 arbres plantés), Marathon 1000 (1000 km safe), Solo Mahatma (100 000 graines).',
      'Chaque unlock te crédite ses points en XP et alimente ta progression de niveau (1000 XP par niveau). Vue complète sur /achievements.',
    ],
  },
  {
    id: 'boutique',
    icon: Store,
    title: 'Boutique Points',
    summary: 'Convertis tes points en réductions, mois offerts, ou cash wallet.',
    paragraphs: [
      'Quatre articles disponibles : Réduction −10 % sur abonnement (1 000 pts) · Boost parrainage × 2 pendant 24 h (2 000 pts) · 1 mois Essentiel offert (10 000 pts) · 5 € crédités au wallet (50 000 pts).',
      'À chaque achat, un code unique 10 caractères est généré et valable 30 jours (sauf boost parrainage : 24 h). Tu peux copier-coller le code sur ta prochaine souscription.',
      'Historique complet des échanges disponible dans la même page /boutique.',
    ],
  },
  {
    id: 'daily-gift',
    icon: Gift,
    title: 'Cadeau quotidien + anniversaire',
    summary: 'Coffre 1×/jour + streak + bonus anniversaire +500 pts.',
    paragraphs: [
      'Ouvre ton coffre quotidien sur le dashboard : 40 % de chance de gagner 5-20 pts, 25 % un coupon -5 %, 15 % un ticket de tirage, 10 % des crédits chat IA, et 2 % un coupon -50 %.',
      'Ton streak augmente chaque jour consécutif. Dès 7 jours d\'affilée, tu as la garantie d\'un coupon -10 % au minimum.',
      'Si c\'est ton anniversaire ou l\'anniversaire de ton inscription YANA, un bandeau spécial apparaît sur le dashboard avec un bonus +500 pts (ou +100 pts × années d\'ancienneté).',
    ],
  },
  {
    id: 'chat',
    icon: MessageSquare,
    title: 'NAMA-PILOTE — ton copilote IA',
    summary: 'Chat empathique, prudent, français. Rate limit par plan.',
    paragraphs: [
      'NAMA-PILOTE est ton assistant conscient de la route. Pose-lui toutes tes questions : météo, état de la route, conseils éco, chemins alternatifs, code de la route, gestion de la fatigue.',
      'Rate limit par plan : Free 5 messages / jour, Essentiel 20, Infini 100, Légende illimité. Le compteur reset chaque nuit à minuit.',
      'Il ne remplace jamais un médecin ou un pro en cas d\'urgence : en cas de malaise, NAMA appelle les secours d\'un clic.',
    ],
  },
  {
    id: 'vehicles',
    icon: Car,
    title: 'Véhicules',
    summary: 'Auto, moto, trottinette, vélo · multi-véhicules selon plan.',
    paragraphs: [
      'Ajoute tes véhicules sur /vehicles. Les plans Infini et Légende permettent le multi-véhicules illimité. Free et Essentiel : 1 véhicule actif à la fois.',
      'Le Mode Moto est disponible avec équipement complet détecté par IA (sur plan Infini+). Achievement Zen Moto récompense 20 trajets moto avec équipement.',
    ],
  },
  {
    id: 'subscription',
    icon: CreditCard,
    title: 'Abonnement & facturation',
    summary: 'Plans Free · Essentiel · Infini · Légende · TVA non applicable 293 B.',
    paragraphs: [
      'YANA propose 4 plans : Free (gratuit, limité), Essentiel (9,99 €/mois), Infini (49,99 €/mois, recommandé), Légende (99,99 €/mois). Chaque plan payant offre 14 jours d\'essai gratuit.',
      'Paiement Stripe sécurisé. Factures émises par SASU PURAMA (TVA non applicable, article 293 B du CGI). Portail auto-service pour modifier moyen de paiement, plan ou résilier.',
      'Gestion complète depuis /settings/abonnement. Historique des factures PDF sur /invoices.',
    ],
  },
  {
    id: 'account',
    icon: UserRound,
    title: 'Profil & notifications',
    summary: 'Nom, date de naissance, thème, 16 langues, inbox notifications.',
    paragraphs: [
      'Édite ton profil depuis /profile : nom complet, date de naissance (pour l\'anniversaire), thème (dark, light ou OLED pur noir), langue (16 disponibles dont français, anglais, espagnol, arabe, chinois, japonais).',
      'Toutes tes notifications (achievements, parrainages, gains wallet, tirages) sont centralisées sur /notifications avec filtres non-lues + marquer tout lu.',
      'Déconnexion et support depuis /settings.',
    ],
  },
  {
    id: 'tickets',
    icon: Ticket,
    title: 'Tickets de tirage',
    summary: 'Accumule des chances · +1 par inscription, parrainage, mission, partage.',
    paragraphs: [
      'Chaque ticket participe au tirage mensuel. Sources : +1 inscription, +2 par parrainage, +1 par mission validée, +1 par partage, +5 par mois d\'abonnement actif, +1 par streak 7 jours.',
      'Tu peux aussi en acheter indirectement via la boutique Points. Consulte ton solde et ton historique sur /lottery.',
    ],
  },
]

export default function GuidePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <BookOpen className="h-8 w-8 text-[var(--cyan)] sm:h-10 sm:w-10" />
          Guide {APP_NAME}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Comment fonctionne chaque fonctionnalité, sans jargon. Clique sur une section pour en savoir plus.
        </p>
      </header>

      <GuideAccordion sections={SECTIONS} defaultOpenId="safe-drive" />

      <footer className="glass rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5 text-sm text-[var(--text-secondary)]">
        <p>
          Besoin d&apos;aide supplémentaire ?{' '}
          <Link href="/aide" className="text-[var(--cyan)] hover:underline">
            Consulte la FAQ
          </Link>{' '}
          ou{' '}
          <Link href="/contact" className="text-[var(--cyan)] hover:underline">
            contacte-nous
          </Link>
          .
        </p>
      </footer>
    </div>
  )
}
