import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"
import path from "node:path"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  // Package workspace `@purama/smarana` livré en source TS (pas de build step) —
  // Next.js n'applique SWC qu'aux packages listés ici, sinon node_modules est ignoré par défaut.
  transpilePackages: ['@purama/smarana'],
  // `@purama/smarana` vit hors de `yana/` (lié par symlink npm `file:../packages/smarana`) —
  // sans ce flag, Next refuse de bundler un module resolu en dehors du dossier racine du projet.
  experimental: { externalDir: true },
  outputFileTracingRoot: path.join(__dirname, '..'),
  turbopack: {
    root: path.join(__dirname, '..'),
    resolveAlias: {
      '@purama/smarana': '../packages/smarana/src/index.ts',
    },
  },
  async headers() {
    return [
      {
        // iOS lit apple-app-site-association sans extension — forcer MIME JSON
        // et un cache raisonnable. Apple recommande `no-cache` pendant la phase
        // de test mais 24h prod OK.
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
