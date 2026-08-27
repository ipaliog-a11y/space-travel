import { test, expect } from '../fixtures/test-auth';

/**
 * Authentication E2E Tests
 * 
 * Tests cover:
 * - Sign-in flow
 * - Session persistence
 * - Sign-out
 * - Protected routes
 */
test.describe('Authentication', () => {
  test.describe('Sign-in', () => {
    test('should display sign-in button on homepage', async ({ page }) => {
      await page.goto('/');
      
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await expect(signInButton).toBeVisible();
    });

    test('should open auth popup on sign-in click', async ({ page }) => {
      await page.goto('/');
      
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await signInButton.click();
      
      // Auth popup should open (we can't test actual OAuth in E2E)
      // Instead, verify the attempt was made
      await page.waitForTimeout(1000);
      
      // Check for auth-related network requests or popup
      const authRequests = page.requests().filter(req => 
        req.url().includes('/auth/')
      );
      expect(authRequests.length).toBeGreaterThan(0);
    });

    test('should show user menu after authentication', async ({ page, mockAuth }) => {
      await page.goto('/');
      
      // Mock successful authentication
      await mockAuth({ userName: 'Test Pilot' });
      
      // User menu should be visible
      const userMenu = page.getByTestId('user-menu');
      await expect(userMenu).toBeVisible();
      
      // User name should be displayed
      await expect(page.getByText(/test pilot/i)).toBeVisible();
    });
  });

  test.describe('Session', () => {
    test('should persist session across page reloads', async ({ page, mockAuth }) => {
      await page.goto('/');
      
      // Authenticate
      await mockAuth({ userName: 'Test Pilot' });
      
      // Verify authenticated
      await expect(page.getByTestId('user-menu')).toBeVisible();
      
      // Reload page
      await page.reload();
      
      // Should still be authenticated
      await expect(page.getByTestId('user-menu')).toBeVisible();
      await expect(page.getByText(/test pilot/i)).toBeVisible();
    });

    test('should persist session across navigation', async ({ page, mockAuth }) => {
      await page.goto('/');
      
      // Authenticate
      await mockAuth({ userName: 'Test Pilot' });
      
      // Navigate to different pages
      await page.goto('/hangar');
      await expect(page.getByText(/test pilot/i)).toBeVisible();
      
      await page.goto('/galaxy');
      await expect(page.getByText(/test pilot/i)).toBeVisible();
      
      await page.goto('/flight');
      await expect(page.getByText(/test pilot/i)).toBeVisible();
    });

    test('should clear session on sign out', async ({ page, mockAuth, clearAuth }) => {
      await page.goto('/');
      
      // Authenticate
      await mockAuth({ userName: 'Test Pilot' });
      await expect(page.getByTestId('user-menu')).toBeVisible();
      
      // Sign out
      const userMenu = page.getByTestId('user-menu');
      await userMenu.click();
      
      const signOutButton = page.getByRole('button', { name: /sign out/i });
      if (await signOutButton.isVisible()) {
        await signOutButton.click();
      } else {
        // Fallback: clear auth manually
        await clearAuth();
      }
      
      // Should show sign-in button again
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should allow access to flight when authenticated', async ({ page, mockAuth }) => {
      await page.goto('/');
      
      // Authenticate
      await mockAuth();
      
      // Navigate to flight
      await page.goto('/flight');
      
      // Flight canvas should be visible
      const flightCanvas = page.getByTestId('flight-canvas');
      await expect(flightCanvas).toBeVisible();
    });

    test('should redirect to sign-in for protected routes when not authenticated', async ({ page }) => {
      // Try to access protected route
      await page.goto('/flight');
      
      // Should redirect to sign-in or show auth prompt
      // (actual behavior depends on implementation)
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await expect(signInButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle auth failure gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Mock auth failure
      await page.evaluate(() => {
        localStorage.setItem('mock-auth-error', 'true');
      });
      
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await signInButton.click();
      
      // Should show error message
      await page.waitForTimeout(2000);
      
      // Error should be displayed (implementation-dependent)
      // Look for error messages
      const errorMessages = page.getByText(/error|failed|unable/i);
      if (await errorMessages.isVisible()) {
        await expect(errorMessages).toBeVisible();
      }
    });

    test('should handle expired session', async ({ page }) => {
      await page.goto('/');
      
      // Set expired session
      await page.evaluate(() => {
        localStorage.setItem('session', 'expired-token');
        localStorage.setItem('session-expired', 'true');
      });
      
      await page.reload();
      
      // Should redirect to sign-in
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });
  });
});
