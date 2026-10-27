import tailwindcss from '@tailwindcss/vite'
export default defineNuxtConfig({
  compatibilityDate: '2026-10-27',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  typescript: { strict: true },
  app: { head: {
    title: 'Aurum — Gold Trading Workspace',
    htmlAttrs: { lang: 'en' },
    meta: [
      { name: 'theme-color', content: '#0d1015' },
      { name: 'description', content: 'Analyse charts, review conditional setups and manage MT5 positions.' },
    ],
  } },
  runtimeConfig: { public: { apiBase: '' } },
})
