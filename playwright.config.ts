import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'src',
  testMatch: /playwright\..*\.test\.ts/,

  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chromium',
  },

  webServer: {
    command: 'python3 -m http.server 4173 --directory dist',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
