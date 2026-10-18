import { defineConfig, devices } from "@playwright/test"

const PORT = 3100
const baseURL = `http://localhost:${PORT}`

/**
 * Parcours essentiels exécutés contre un build de production en mode démo.
 * `npm run build` doit avoir été lancé au préalable (voir README).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Africa/Dakar",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_APP_MODE: "demo" },
  },
})
