# Audit Status (2026-07-25)

## État actuel
- **tsc**: 0 erreurs (clean)
- **eslint**: 37 erreurs + 14 warnings
- **npm install**: fonctionnel

## Erreurs eslint détail
Majoritairement setState dans useEffect (react-hooks/set-state-in-effect) à refactor async pattern comme vida-langue.

## Fichiers prioritaires
- `src/app/(dashboard)/breathe/BreatheClient.tsx`
- `src/components/onboarding/CinematicIntro.tsx`
- `src/components/shared/SubliminalLoader.tsx`
- `mobile/app/(tabs)/*`

## Pattern fix
```tsx
useEffect(() => { loadData() }, [loadData])
→ useEffect(() => { void (async () => { await loadData() })() }, [loadData])
```

## Next steps
1. Appliquer pattern async wrapper dans chaque useEffect
2. Cleanup unused eslint-disable directives
3. Test build
4. Commit final
