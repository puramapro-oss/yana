-- =============================================================================
-- 0004b_emails_seed.sql — 10 templates Resend YANA mobilité FR
-- =============================================================================
-- 7 daily (J0/1/3/7/14/21/30) + 3 event (referral / contest / palier)
-- Variables supportées dans body/subject/cta_url :
--   {{first_name}}  {{app_url}}  {{code}}  {{tier}}  {{rank}}  {{amount}}
--   {{palier_name}} {{referral_code}}  {{level}}
-- =============================================================================

INSERT INTO yana.email_templates
  (type, category, day_offset, subject, heading, body, cta_label, cta_url_template, footer_note)
VALUES

-- -------- J0 — BIENVENUE (déclenché instant après création profil) ----------
('welcome_d0', 'daily', 0,
 'Bienvenue dans YANA, {{first_name}} 🛞',
 'Ton premier trajet te révèle qui tu deviens',
 'La route est le plus ancien miroir de l''humain. Chaque virage est une décision, chaque accélération une intention. YANA te révèle ces décisions, jour après jour, et les transforme en récompenses réelles : trajets safe, conduite verte, covoiturage partagé. Rien à prouver. Juste à conduire. On s''occupe du reste.',
 'Ouvrir mon tableau de bord',
 '{{app_url}}/dashboard',
 'Tu reçois cet email parce que tu viens de créer ton compte YANA. Zéro spam. Tu peux te désabonner à tout moment.'),

-- -------- J1 — PREMIÈRE ASTUCE ----------------------------------------------
('tip_d1', 'daily', 1,
 'La règle des 5 secondes qui change tout',
 'Le geste qui sépare les pilotes des passagers',
 'Les pilotes qui ne crashent jamais ont tous la même habitude : ils regardent 5 secondes plus loin que la voiture devant eux. Pas 2. Pas 3. Cinq. Ça change tout : anticipation, fluidité, calme. YANA mesure ça à ta place — le SafeScore récompense cette conduite anticipée. Essaye cette semaine. Tu verras ton score monter.',
 'Voir mon SafeScore',
 '{{app_url}}/dashboard',
 'Astuce #1 sur 52. Une par semaine, si tu le souhaites.'),

-- -------- J3 — RELANCE ------------------------------------------------------
('relance_d3', 'daily', 3,
 'Ton volant t''attend',
 'Trois jours sans trajet, c''est normal',
 'Certains jours tu ne conduis pas. C''est la vie. Mais YANA ne te jugera jamais là-dessus. Quand tu reprends le volant, ton streak continue. Tes récompenses t''attendent. Et la route, elle, est toujours là.',
 'Activer le tracking',
 '{{app_url}}/dashboard',
 'Tu préfères ne plus recevoir ces messages ? Le lien de désinscription est en bas.'),

-- -------- J7 — TIPS ÉCO-CONDUITE --------------------------------------------
('tips_d7', 'daily', 7,
 '3 gestes qui plantent 1 arbre tous les 200 km',
 'La conduite verte n''est pas une contrainte',
 'Relâche l''accélérateur 100m avant chaque feu rouge. Garde la régulation au-dessous de 90. Évite les climatisations sous 5 minutes de trajet. Trois gestes. Cumulés chaque semaine par 1000 pilotes, ça retire 8 tonnes de CO₂ de l''atmosphère. YANA compte chaque gramme. Chaque 10 kg économisés = 1 arbre planté à ton nom.',
 'Voir mes arbres',
 '{{app_url}}/trees',
 'Semaine 1 terminée. On te laisse conduire.'),

-- -------- J14 — UPGRADE -20% 48h --------------------------------------------
('upgrade_d14', 'daily', 14,
 '-20% sur Premium pendant 48h',
 'Tu as conduit 2 semaines. Maintenant, débloque tout',
 'Gains x2 sur chaque trajet. Covoiturages illimités. Prime éco mensuelle. Accès prioritaire au programme ambassadeur. Le code EMAIL20 est valide 48h sur ta prochaine souscription annuelle. Après ? Il disparaît.',
 'Activer EMAIL20',
 '{{app_url}}/pricing?code=EMAIL20',
 'Réduction appliquée automatiquement au checkout. Résiliable à tout moment.'),

-- -------- J21 — TÉMOIGNAGE NARRATIF (pas de faux chiffre) -------------------
('testimonial_d21', 'daily', 21,
 'La route est devenue ma méditation',
 'Comment un trajet quotidien peut changer une vie',
 'Beaucoup de pilotes nous écrivent la même chose après 3 semaines : "Je ne conduis plus comme avant. Je regarde plus loin. Je respire. Mes trajets sont plus courts sans que je sois plus rapide." YANA ne promet pas la zen-attitude. Elle la révèle. Ton SafeScore et ton GreenScore te montrent ce que tu ne voyais pas.',
 'Voir mes stats',
 '{{app_url}}/dashboard',
 'Partage ta propre histoire quand tu veux — on lit tout.'),

-- -------- J30 — WIN-BACK ----------------------------------------------------
('winback_d30', 'daily', 30,
 'Un mois plus tard — que la route te porte',
 'La route t''attend, et tes récompenses aussi',
 '30 jours depuis ta première connexion. Que tu aies conduit beaucoup, peu, ou pas du tout — tes points sont préservés, tes arbres plantés restent tiens, ton compte reste ouvert. Reviens quand tu veux. On ne part pas.',
 'Reprendre le volant',
 '{{app_url}}/dashboard',
 'Si tu veux vraiment arrêter, utilise le lien de désinscription ci-dessous. Aucun souci.'),

-- -------- EVENT — PARRAINAGE PALIER ATTEINT ---------------------------------
('event_referral_milestone', 'event', NULL,
 '🎖️ Tu viens de passer {{palier_name}}',
 'Un nouveau palier pour toi',
 'Tu viens d''atteindre le palier {{palier_name}} du programme ambassadeur YANA. Tes commissions évoluent, tes avantages se débloquent, et ton impact grandit. Tes filleuls aussi conduisent mieux — tu as lancé une vague.',
 'Voir mon programme',
 '{{app_url}}/ambassadeur',
 'Les paliers supérieurs donnent plus. Ton prochain objectif est déjà visible.'),

-- -------- EVENT — CONCOURS GAGNÉ --------------------------------------------
('event_contest_won', 'event', NULL,
 '🏆 Tu es #{{rank}} — {{amount}}€ créditent ton wallet',
 'Tu figures au classement hebdomadaire',
 'Le classement YANA de la semaine vient de clôturer. Tu es classé #{{rank}}. Ta part : {{amount}}€. Ils sont déjà crédités dans ton wallet, prêts à être retirés dès que tu atteins 5€.',
 'Ouvrir mon wallet',
 '{{app_url}}/wallet',
 'Le classement repart à zéro chaque lundi. La route continue.'),

-- -------- EVENT — PALIER LEVEL ATTEINT --------------------------------------
('event_tier_reached', 'event', NULL,
 'Niveau {{level}} débloqué — {{first_name}}, ça monte',
 'Tu viens de passer niveau {{level}}',
 'Ton XP cumulé t''a fait franchir un palier. Chaque niveau débloque un petit bonus : multiplicateur de points, animation exclusive, ou accès anticipé à une feature. Ton prochain niveau se prépare déjà.',
 'Voir mes achievements',
 '{{app_url}}/achievements',
 'Les niveaux sont infinis. Le plaisir aussi.')

ON CONFLICT (type) DO UPDATE SET
  category = EXCLUDED.category,
  day_offset = EXCLUDED.day_offset,
  subject = EXCLUDED.subject,
  heading = EXCLUDED.heading,
  body = EXCLUDED.body,
  cta_label = EXCLUDED.cta_label,
  cta_url_template = EXCLUDED.cta_url_template,
  footer_note = EXCLUDED.footer_note,
  active = true,
  updated_at = now();
