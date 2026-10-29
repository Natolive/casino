import { APP_NAME } from '@casino/shared'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Jeu entièrement côté navigateur (WebGL) : pas de rendu serveur.
  ssr: false,
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      titleTemplate: `%s · ${APP_NAME}`,
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#09090b' },
      ],
    },
  },
  modules: ['@nuxt/ui'],
  // Salle de jeu : toujours de nuit.
  colorMode: { preference: 'dark', fallback: 'dark', storageKey: 'casino-color-mode' },
  css: ['~/assets/css/main.css'],
  // Space Grotesk pour les titres et les numéros, Manrope pour le texte.
  fonts: {
    families: [
      { name: 'Space Grotesk', provider: 'google', weights: [500, 600, 700] },
      { name: 'Manrope', provider: 'google', weights: [400, 500, 600, 700, 800] },
    ],
  },
  // Les règles partagées sont du code du dépôt, pas une dépendance : jamais pré-empaquetées par Vite, donc jamais en
  // cache périmé quand on y ajoute ou déplace un export.
  vite: { optimizeDeps: { exclude: ['@casino/shared'] } },
  // L'API passe par le front sous /api : une seule origine, ni CORS ni cookie tiers.
  // @ts-expect-error -- ponytail: `proxy` marche (Nitro) mais manque au type de Nuxt 4.5 ; à retirer quand le typecheck s'en plaint.
  routeRules: { '/api/**': { proxy: `${process.env.API_URL ?? 'http://backend:3000'}/**` } },
})
