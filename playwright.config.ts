import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 * Load .env.test last with override: true so it can override other env files
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
const testEnv = dotenv.config({
  path: path.resolve(__dirname, '.env.test'),
  override: true, // Ensure .env.test values override other env files
});

// Log if .env.test was loaded (for debugging)
if (testEnv.error) {
  if ((testEnv.error as Error).message.includes('ENOENT')) {
    console.warn('Warning: .env.test file not found. Test credentials may not be available.');
  } else {
    console.warn('Warning: Error loading .env.test:', testEnv.error.message);
  }
} else if (testEnv.parsed) {
  console.log('✓ Loaded .env.test with', Object.keys(testEnv.parsed).length, 'variables');
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /**
   * Worker configuration for parallel execution
   *
   * With new worker-scoped isolation system, we support aggressive parallelization:
   * - Local: 10 workers (adjust based on your machine)
   * - CI: 5 workers (conservative for cloud environments)
   *
   * Override with environment variable:
   *   WORKERS=20 npm run test:e2e
   *
   * Note: Worker-scoped factories ensure zero data collisions at any worker count
   */
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS, 4) : process.env.CI ? 4 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Record video for failed tests */
    video: 'retain-on-failure',
  },

  /* Global test timeout */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes
    stdout: 'pipe',
    stderr: 'pipe',
    // Pass environment variables to the dev server
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    // Chromium tests with lazy provisioning via fixtures
    // No global setup needed - authenticatedUserWithOrg fixture handles it
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts$/, // Explicitly match .spec.ts files
      testIgnore: ['**/global.setup.ts', '**/global.teardown.ts'], // Exclude setup/teardown from test discovery
      use: {
        ...devices['Desktop Chrome'],
        // No storageState needed - fixtures inject auth on-demand
      },
    },

    // Optional: Keep teardown for final cleanup if needed
    {
      name: 'teardown',
      testMatch: '**/global.teardown.ts',
      dependencies: ['chromium'],
    },
  ],
});
