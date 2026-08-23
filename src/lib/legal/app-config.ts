import type { LegalAppConfig } from './types';
import { buildCompanyInfo, buildMediateurInfo } from './company';

/**
 * Config légale de YANA (socle NIYAMA, cf packages/legal/README.md).
 * aPaiement=true : abonnements réels Stripe (src/lib/stripe.ts, YANA_STRIPE_PLANS).
 * aChatIA=true : assistant conversationnel NAMA-PILOTE réel (src/lib/claude.ts, /api/chat, streaming).
 */
export const YANA_LEGAL_CONFIG: LegalAppConfig = {
  slug: 'yana',
  nom: 'YANA',
  domaine: 'yana.purama.dev',
  famille: 'karma_wellness',
  company: buildCompanyInfo(),
  mediateur: buildMediateurInfo(),
  descriptionActivite:
    "YANA est une plateforme de mobilité responsable qui accompagne les trajets quotidiens : suivi de trajets, score sécurité/éco/CO₂, covoiturage à récompense partagée, assistant conversationnel NAMA-PILOTE, et reversement d'une partie des revenus aux utilisateurs actifs sous forme de gains crédités sur un portefeuille interne.",
  aPaiement: true,
  aChatIA: true,
  clausesSpecifiquesCgu: [
    {
      titre: 'Programme de gains et portefeuille',
      paragraphes: [
        "YANA reverse une partie de ses revenus aux utilisateurs actifs sous forme de gains crédités sur un portefeuille (wallet) interne, selon le multiplicateur associé au plan d'abonnement souscrit. Ces gains ne constituent ni un salaire ni la rémunération d'un contrat de travail.",
        "Le retrait des gains est soumis aux conditions, seuils et vérifications anti-fraude affichés dans l'espace « Portefeuille » du compte.",
      ],
    },
  ],
  clausesSpecifiquesCgv: [
    {
      titre: 'Abonnements et tarifs',
      paragraphes: [
        "YANA propose 3 formules d'abonnement avec 14 jours d'essai gratuit à la souscription, résiliables à tout moment :",
      ],
      liste: [
        'YANA Essentiel : 9,99 €/mois ou 79,99 €/an (-33 %) — suivi de trajets illimité, score safety/eco/CO₂, covoiturage Dual Reward, chat NAMA-PILOTE (20 messages/jour), multiplicateur de gains ×1.',
        'YANA Infini : 49,99 €/mois ou 399,99 €/an (-33 %) — tout Essentiel, chat illimité, multi-véhicules, Mode Moto premium, multiplicateur de gains ×5.',
        'YANA Legende : 99,99 €/mois ou 799,99 €/an (-33 %) — tout Infini, concierge NAMA 24/7, Safe Driver Badge certifié, 10 arbres plantés/mois, multiplicateur de gains ×10.',
      ],
    },
  ],
};
