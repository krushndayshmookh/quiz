import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'))

export default defineNuxtConfig({
  compatibilityDate: '2026-03-04',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
    shim: false,
  },
  nitro: {
    experimental: {
      asyncContext: true,
    },
  },
  runtimeConfig: {
    adminPassword: process.env.ADMIN_PASSWORD || 'admin',
    public: {
      version: pkg.version as string,
      repository: (pkg.repository as string) || '',
    },
  },
  app: {
    head: {
      title: 'NST Quiz',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Real-time classroom quiz platform' },
      ],
    },
  },
})
