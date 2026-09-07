import { defineConfig, devices } from '@playwright/test';
const production = process.env.TEST_PRODUCTION === '1';
const coldStart = process.env.TEST_COLD_START === '1' && !production;
const baseURL = production ? 'http://127.0.0.1:4173' : coldStart ? 'http://127.0.0.1:5174' : 'http://127.0.0.1:5173';
export default defineConfig({
  testDir: './tests', fullyParallel: true,
  use: { baseURL, channel: 'chrome', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: production ? 'npm run preview -- --host 127.0.0.1'
      : coldStart ? 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort --force'
        : 'npm run dev -- --host 127.0.0.1',
    url: baseURL, reuseExistingServer: !coldStart && !process.env.CI,
  },
});
