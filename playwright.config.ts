import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Starwake E2E tests
 * 
 * Run tests:
 *   npx playwright test
 * 
 * Run with UI:
 *   npx playwright test --ui
 * 
 * Run specific file:
 *   npx playwright test tests/e2e/auth.spec.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Timeout for individual tests
  timeout: 30000,
  
  // Timeout for expectations
  expect: {
    timeout: 5000
  },
  
  // Fail the whole test file if one test fails
  failOnFlakyTests: false,
  
  // Number of concurrent tests
  workers: '50%',
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:8080',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Capture video on failure
    video: 'retain-on-failure',
    
    // Capture trace for debugging
    trace: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1920, height: 1080 },
    
    // Launch options
    launchOptions: {
      slowMo: 0,
    },
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Emulate reduced motion preference
        colorScheme: 'dark',
      },
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        colorScheme: 'dark',
      },
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        colorScheme: 'dark',
      },
    },
    
    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        colorScheme: 'dark',
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        colorScheme: 'dark',
      },
    },
  ],
  
  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    timeout: 120000,
    reuseExistingServer: true,
    // Ignore HTTPS errors for local dev
    env: {
      NODE_ENV: 'test',
    },
  },
});
