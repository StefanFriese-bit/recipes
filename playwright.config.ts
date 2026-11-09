import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4179/recipes/' },
  webServer: { command: 'npx vite preview --port 4179 --strictPort', url: 'http://localhost:4179/recipes/', reuseExistingServer: false },
  projects: [
    { name: 'iphone-safari-engine', use: { ...devices['iPhone 15'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
