# ERRORS.md — YANA

Format : `|DATE|BUG|CAUSE|FIX|`

|DATE|BUG|CAUSE|FIX|
|---|---|---|---|
|2026-08-23|CGU/CGV/politique-confidentialite décrivaient une app d'aides sociales/scanner financier ("aides CAF/CPAM/MDPH", "Ciclade", plans Gratuit/Premium 9,99€/83,90€) au lieu de YANA (mobilité)|Contenu copié-collé d'une autre app (VIDA Aide/LAKSHMI) jamais adapté au domaine réel de YANA — piège documenté PIEGES.md §16 (cas mukti 2026-08-23)|Régénéré via buildCGU/buildCGV/buildPolitiqueConfidentialite(YANA_LEGAL_CONFIG) du socle `packages/legal/`, avec descriptionActivite + tarifs réels (Essentiel 9,99€/49,99€ Infini/99,99€ Legende, cf src/lib/stripe.ts)|
|2026-08-23|Mentions légales : adresse Vercel obsolète ("340 S Lemon Ave, Walnut, CA 91789")|Adresse jamais revérifiée après déménagement Vercel — piège documenté PIEGES.md §16 (adresse hébergeur à revérifier en direct, jamais recopiée de mémoire)|Régénéré via buildMentionsLegales() — adresse à jour "440 N Barranca Avenue #4133, Covina, CA 91723" (vérifiée dans `packages/legal/src/processors.ts`)|
|2026-08-23|CGU checkbox "J'accepte les CGU" sur signup, incohérent avec résolution CLAUDE.md §9.5 (waiver implicite par clic, zéro case à cocher)|Ancien pattern pré-socle NIYAMA|Remplacé par `LegalAcceptanceNotice` (clic sur "Créer mon compte" vaut acceptation) + `POST /api/legal/accept` (cgu/cgv/confidentialite) appelé best-effort après signup réussi|
