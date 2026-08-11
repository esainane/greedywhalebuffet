import { defineConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process'

function findChromium(): string | undefined {
  try {
    return execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

const chromium = findChromium()

export default defineConfig({
  testDir: 'src',
  testMatch: /playwright\..*\.test\.ts/,

  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...(chromium
      ? {
          launchOptions: {
            executablePath: chromium,
          },
        }
      : {
          channel: 'chrome',
        }),
  },

  webServer: {
    command: 'python3 -m http.server 4173 --directory dist',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
