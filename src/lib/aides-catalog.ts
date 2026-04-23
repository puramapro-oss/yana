// Catalogue FR des profils / situations / régions / types d'aides mobilité
// Source : 45 aides seedées dans yana.aides

export type ProfilKey =
  | 'salarie'
  | 'demandeur_emploi'
  | 'fonctionnaire'
  | 'agriculteur'
  | 'apprenti'
  | 'stagiaire'
  | 'jeune'
  | 'senior'
  | 'handicape'
  | 'malade_chronique'
  | 'parent_isole'
  | 'precaire'
  | 'particulier'
  | 'travailleur'
  | 'professionnel'
  | 'patient'
  | 'malade'

export type SituationKey =
  | 'achat_vehicule'
  | 'conversion_vehicule'
  | 'mise_au_rebut'
  | 'achat_equipement'
  | 'carburant'
  | 'trajet_domicile_travail'
  | 'trajet_medical'
  | 'trajet_famille'
  | 'trajet_loisirs'
  | 'soins_reguliers'
  | 'passage_permis'
  | 'covoiturage'
  | 'mobilite_reduite'
  | 'zfe'
  | 'isolement'

export type RegionKey =
  | 'national'
  | 'auvergne-rhone-alpes'
  | 'bretagne'
  | 'grand-est'
  | 'ile-de-france'
  | 'normandie'
  | 'occitanie'
  | 'paca'

export type TypeAideKey =
  | 'prime'
  | 'cheque'
  | 'allocation'
  | 'credit_impot'
  | 'pret'
  | 'reduction'
  | 'prise_en_charge'
  | 'remise'

export const PROFILS: Array<{ key: ProfilKey; label: string; emoji: string; description: string }> = [
  { key: 'salarie', label: 'Salarié·e', emoji: '💼', description: 'CDI, CDD, temps partiel.' },
  { key: 'demandeur_emploi', label: 'Demandeur·se d\'emploi', emoji: '🔎', description: 'Inscrit·e France Travail.' },
  { key: 'fonctionnaire', label: 'Fonctionnaire', emoji: '🏛️', description: 'Agent·e public·que.' },
  { key: 'agriculteur', label: 'Agriculteur·rice', emoji: '🌾', description: 'Exploitant·e agricole, MSA.' },
  { key: 'apprenti', label: 'Apprenti·e', emoji: '🎓', description: 'Contrat d\'apprentissage.' },
  { key: 'stagiaire', label: 'Stagiaire', emoji: '📚', description: 'Stage conventionné.' },
  { key: 'jeune', label: 'Jeune (18-25 ans)', emoji: '🧑', description: 'Étudiant·e, alternant·e ou actif·ve.' },
  { key: 'senior', label: 'Senior (60 ans+)', emoji: '👴', description: 'Retraité·e ou en emploi.' },
  { key: 'handicape', label: 'Personne en situation de handicap', emoji: '♿', description: 'Carte mobilité inclusion, AAH, PCH…' },
  { key: 'malade_chronique', label: 'Maladie chronique', emoji: '💊', description: 'ALD, suivi médical régulier.' },
  { key: 'parent_isole', label: 'Parent isolé', emoji: '👨‍👧', description: 'Seul·e avec enfant(s) à charge.' },
  { key: 'precaire', label: 'Revenus modestes', emoji: '💶', description: 'Sous seuil revenu fiscal.' },
  { key: 'particulier', label: 'Particulier·ère', emoji: '🏠', description: 'Aucun statut particulier.' },
]

export const SITUATIONS: Array<{ key: SituationKey; label: string; emoji: string }> = [
  { key: 'trajet_domicile_travail', label: 'Trajets domicile ⇄ travail', emoji: '🚗' },
  { key: 'achat_vehicule', label: 'Achat d\'un véhicule (propre)', emoji: '🔋' },
  { key: 'conversion_vehicule', label: 'Conversion de mon véhicule', emoji: '🔄' },
  { key: 'mise_au_rebut', label: 'Mise au rebut d\'un vieux véhicule', emoji: '🗑️' },
  { key: 'achat_equipement', label: 'Équipement (vélo, trottinette…)', emoji: '🚲' },
  { key: 'carburant', label: 'Aide carburant', emoji: '⛽' },
  { key: 'covoiturage', label: 'Covoiturage régulier', emoji: '👥' },
  { key: 'passage_permis', label: 'Passer mon permis', emoji: '🪪' },
  { key: 'trajet_medical', label: 'Trajets médicaux', emoji: '🏥' },
  { key: 'soins_reguliers', label: 'Soins réguliers (ALD)', emoji: '💉' },
  { key: 'trajet_famille', label: 'Trajets familiaux', emoji: '👨‍👩‍👧' },
  { key: 'trajet_loisirs', label: 'Trajets loisirs / week-end', emoji: '🏞️' },
  { key: 'mobilite_reduite', label: 'Mobilité réduite', emoji: '🦽' },
  { key: 'zfe', label: 'Je vis en ZFE (Zone à Faibles Émissions)', emoji: '🌆' },
  { key: 'isolement', label: 'Zone rurale / isolée', emoji: '🏡' },
]

export const REGIONS: Array<{ key: RegionKey; label: string }> = [
  { key: 'national', label: 'France entière (sans distinction de région)' },
  { key: 'ile-de-france', label: 'Île-de-France' },
  { key: 'auvergne-rhone-alpes', label: 'Auvergne-Rhône-Alpes' },
  { key: 'bretagne', label: 'Bretagne' },
  { key: 'grand-est', label: 'Grand Est' },
  { key: 'normandie', label: 'Normandie' },
  { key: 'occitanie', label: 'Occitanie' },
  { key: 'paca', label: 'Provence-Alpes-Côte d\'Azur' },
]

export const TYPE_AIDE_LABELS: Record<TypeAideKey, string> = {
  prime: 'Prime',
  cheque: 'Chèque',
  allocation: 'Allocation',
  credit_impot: 'Crédit d\'impôt',
  pret: 'Prêt',
  reduction: 'Réduction',
  prise_en_charge: 'Prise en charge',
  remise: 'Remise',
}

export const TOTAL_STEPS = 4

export function isProfilKey(v: string | null | undefined): v is ProfilKey {
  if (!v) return false
  return PROFILS.some((p) => p.key === v)
}

export function isSituationKey(v: string): v is SituationKey {
  return SITUATIONS.some((s) => s.key === v)
}

export function isRegionKey(v: string | null | undefined): v is RegionKey {
  if (!v) return false
  return REGIONS.some((r) => r.key === v)
}

export function parseSituationsCSV(raw: string | null | undefined): SituationKey[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(isSituationKey)
}
