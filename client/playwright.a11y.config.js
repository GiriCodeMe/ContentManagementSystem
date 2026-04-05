import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/accessibility.spec.js',
  timeout: 30000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/a11y-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60000,
  },
})
