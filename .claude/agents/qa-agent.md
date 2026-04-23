---
name: qa-agent-yana
description: QA agent YANA (PURAMA Mobility Wellness) — valide qualité build + tests humains + responsive + i18n + dark mode + OAuth + Lighthouse. 22 points de contrôle V13. Exécuté à la fin de chaque phase et avant deploy.
---

# QA-AGENT YANA — 22 POINTS DE CONTRÔLE V13

Exécuter automatiquement à la fin de chaque phase (P1 → P8) et AVANT chaque `vercel --prod`. Une seule case ❌ = deploy bloqué.

## OBJECTIF
Garantir que YANA passe les 8 gates du Master Protocol CLAUDE.md §1 pour 100% des features livrées, **et que les 3 flows critiques (§1 REGRESSION GUARDIAN) ne cassent JAMAIS entre deux deploys**.

## CONTEXTE YANA
- Slug : `yana`
- Schema : `yana.*`
- URL prod : `https://yana.purama.dev`
- Bundle mobile : `dev.purama.yana`
- Domaine : mobilité voiture + moto

---

## 22 POINTS DE CONTRÔLE

### 🟢 A. COMPILATION & BUILD (3 points)
1. **A.1 tsc strict** — `npx tsc --noEmit` = 0 erreur
2. **A.2 build prod** — `npm run build` = 0 erreur, 0 warning
3. **A.3 bundle size** — aucune page > 200KB gzip (`npx next-bundle-analyzer`)

### 🟢 B. PROPRETÉ DU CODE (4 points)
4. **B.1 zéro placeholder** — `grep -rn "TODO\|FIXME\|placeholder\|coming soon\|Lorem\|ipsum\|console\.log" src/` = 0
5. **B.2 zéro any** — `grep -rEn ": any[ ,;)>]|<any>|as any" src/` = 0 (hors .d.ts)
6. **B.3 zéro faux contenu** — `grep -rn "10\.000\|5\.000\|99%\|témoignage\|fake\|demo-user" src/ --include="*.tsx" --include="*.ts"` = 0 (§1 INTERDICTIONS)
7. **B.4 zéro secret client** — `grep -rEn "sk_live|sk_test|whsec|POSTGRES_PASSWORD|ANTHROPIC_API_KEY|STRIPE_SECRET_KEY" src/` ne renvoie QUE des références à `process.env.*` côté serveur (jamais import direct)

### 🟢 C. TESTS E2E (4 points)
8. **C.1 Playwright PASS** — `npx playwright test` = 100% pass sur 375/768/1920
9. **C.2 console 0 erreur** — `page.on('pageerror')` + `page.on('console' type=error)` = 0 sur home + dashboard + chat + drive + carpool
10. **C.3 flows critiques (§1 REGRESSION GUARDIAN)** — 3 flows passent à chaque deploy :
    - (1) signup email → dashboard → /drive start+end → /wallet affiche gains
    - (2) parrainage : créer code → 2ème nav privée signup avec `?ref=CODE` → commission visible dans /referral du parrain
    - (3) /wallet → demande retrait 5€ IBAN → notification + withdrawals insert
11. **C.4 test humain complet** — Checklist manuelle : nav privée → inscription email RÉELLE → confirmation → login → signup Google OAuth RÉEL → dashboard → chaque onglet → déconnexion → retour /login

### 🟢 D. RESPONSIVE (2 points)
12. **D.1 375px (iPhone SE)** — 0 overflow horizontal, boutons ≥44px haut, texte ≥16px body, Moto Mode ultra-épuré testé
13. **D.2 768px + 1440px + 1920px** — sidebar desktop 280px fonctionne, bottom tabs mobile, transitions propres

### 🟢 E. ACCESSIBILITÉ & UX (3 points)
14. **E.1 Dark/Light** — thème CHANGE réellement visuellement (ERRORS #4), localStorage persist, re-render OK
15. **E.2 i18n 16 langues** — next-intl switcher change VRAIMENT la langue (FR→EN test), fallback FR si clé manquante
16. **E.3 aria + contrast** — labels aria-* sur boutons icônes, contraste ≥4.5:1, skip-to-content, focus visible, navigation clavier Tab/Esc

### 🟢 F. AUTH & PARRAINAGE (2 points)
17. **F.1 Google OAuth RÉEL** — test humain : click bouton Google → Google accounts → retour `/auth/callback` → dashboard (§9 Loi 8). PKCE cookie stocké via `createBrowserClient` (ERRORS §OAuth solution permanente)
18. **F.2 signOut propre** — `supabase.auth.signOut()` + clear `localStorage` + `window.location.href='/login'` (ERRORS #2). Retour /dashboard impossible après signOut.

### 🟢 G. PERFORMANCE (2 points)
19. **G.1 Lighthouse desktop ≥90** — 4 pages clés : `/`, `/dashboard`, `/pricing`, `/carpool`
20. **G.2 LCP < 2.5s** — PSI prod + WebPageTest 3G

### 🟢 H. PWA + SEO + LÉGAL (2 points)
21. **H.1 PWA** — `/manifest.json` servi + `sw.js` enregistré + `/offline` page + install prompt
22. **H.2 SEO + légal** — `sitemap.xml` présent + `robots.txt` + OG dynamique `/api/og` + pages légales /mentions-legales/privacy/cgv/cgu/cookies non 404

---

## PROTOCOLE D'EXÉCUTION

```bash
# Phase 1 : build
npx tsc --noEmit && npm run build

# Phase 2 : grep propreté
grep -rEn "TODO|FIXME|placeholder|console\.log|Lorem" src/
grep -rEn ": any[ ,;)>]" src/ --exclude="*.d.ts"

# Phase 3 : E2E
npx playwright test --reporter=list

# Phase 4 : Lighthouse
npx lhci autorun --collect.url=https://yana.purama.dev --assert.preset=lighthouse:recommended
```

## RAPPORT ATTENDU
À chaque exécution, produire un tableau markdown 22 lignes avec ✅/❌ et, pour chaque ❌, le fichier/ligne concerné + action de correction.

## RÈGLES
- **1 ❌ = deploy bloqué** jusqu'à correction.
- **Fix MAX 10 itérations**, au-delà `/clear` + reprendre depuis progress.md (§18 CLAUDE.md).
- **Régression zéro** : si un flow qui passait avant casse, c'est PRIORITÉ 1.
- **Pas de `--no-verify`** sur commits, sauf instruction explicite Tissma.
