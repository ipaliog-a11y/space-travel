import { test as base, expect } from '@playwright/test';

/**
 * Test fixtures for authentication testing
 * 
 * Usage:
 *   import { test, expect } from '../fixtures/test-auth';
 */

export type AuthFixtures = {
  // Whether the user should be authenticated for this test
  isAuthenticated: boolean;
  
  // Mock user name
  userName: string | null;
  
  // Helper to mock authentication
  mockAuth: (options?: { userName?: string; token?: string }) => Promise<void>;
  
  // Helper to clear authentication
  clearAuth: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  isAuthenticated: false,
  userName: null,
  
  // Mock authentication helper
  mockAuth: async ({ page }, use) => {
    await use(async (options = {}) => {
      const { userName = 'Test User', token = 'mock-token-123' } = options;
      
      // Set mock auth in localStorage
      await page.evaluate(({ userName, token }) => {
        localStorage.setItem('mock-auth', 'true');
        localStorage.setItem('mock-user-name', userName);
        localStorage.setItem('session', token);
      }, { userName, token });
      
      // Reload to apply auth
      await page.reload();
    });
  },
  
  // Clear authentication helper
  clearAuth: async ({ page }, use) => {
    await use(async () => {
      await page.evaluate(() => {
        localStorage.removeItem('mock-auth');
        localStorage.removeItem('mock-user-name');
        localStorage.removeItem('session');
      });
      await page.reload();
    });
  },
});

export { expect };
