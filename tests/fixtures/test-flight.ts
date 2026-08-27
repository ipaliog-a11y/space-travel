import { test as base, expect } from '@playwright/test';

/**
 * Test fixtures for flight controls testing
 * 
 * Usage:
 *   import { test, expect } from '../fixtures/test-flight';
 */

export type FlightFixtures = {
  // Current ship for testing
  currentShip: string;
  
  // Current system for testing
  currentSystem: string;
  
  // Flight mode
  flightMode: string;
  
  // Helper to launch with specific ship
  launchShip: (shipId: string) => Promise<void>;
  
  // Helper to mock flight state
  mockFlightState: (state: Partial<FlightState>) => Promise<void>;
};

export type FlightState = {
  shipId: string;
  systemId: string;
  mode: string;
  throttle: number;
  speed: number;
  fuel: number;
};

export const test = base.extend<FlightFixtures>({
  currentShip: 'courier',
  currentSystem: 'kepler',
  flightMode: 'local',
  
  // Launch ship helper
  launchShip: async ({ page }, use) => {
    await use(async (shipId: string) => {
      // Navigate to hangar
      await page.goto('/hangar');
      
      // Select ship
      const shipButton = page.getByRole('button', { name: new RegExp(shipId, 'i') });
      if (await shipButton.isVisible()) {
        await shipButton.click();
      }
      
      // Launch
      const launchButton = page.getByRole('button', { name: /launch/i });
      if (await launchButton.isVisible()) {
        await launchButton.click();
        
        // Wait for flight to start
        await page.waitForSelector('[data-testid="flight-canvas"]', { timeout: 5000 });
      }
    });
  },
  
  // Mock flight state helper
  mockFlightState: async ({ page }, use) => {
    await use(async (state: Partial<FlightState>) => {
      await page.evaluate((flightState) => {
        (window as any).__mockFlightState = {
          shipId: 'courier',
          systemId: 'kepler',
          mode: 'local',
          throttle: 0,
          speed: 0,
          fuel: 100,
          ...flightState,
        };
      }, state);
    });
  },
});

export { expect };
