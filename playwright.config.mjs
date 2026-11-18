// O executor da AIUBY filtra pelo projeto com o nome do navegador (--project) e define BASE_URL com a
// origem do alvo que tem posse verificada.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  expect: { timeout: 3_000 },
  use: { baseURL: process.env.BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
