# Starwake E2E Tests

End-to-end tests for the Starwake flight simulator using Playwright.

## Quick Start

### Install Playwright Browsers

```bash
npx playwright install
```

This will install Chromium, Firefox, and WebKit browsers for testing.

### Run Tests

```bash
# Run all tests
npx playwright test

# Run with UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run specific test by name
npx playwright test -g "should display sign-in button"

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run mobile tests
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"

# Run with code coverage
npx playwright test --coverage
```

## Test Structure

```
tests/
├── e2e/                      # E2E test files
│   ├── auth.spec.ts          # Authentication tests
│   ├── flight-controls.spec.ts
│   ├── navigation.spec.ts
│   └── docking.spec.ts
├── fixtures/                 # Test fixtures
│   ├── test-auth.ts          # Auth fixtures
│   └── test-flight.ts        # Flight fixtures
└── utils/                    # Test utilities (future)
```

## Writing Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Click me' })).toBeVisible();
    await page.getByRole('button', { name: 'Click me' }).click();
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Using Fixtures

```typescript
import { test, expect } from '../fixtures/test-auth';

test.describe('Authenticated Tests', () => {
  test('should work when logged in', async ({ page, mockAuth }) => {
    await page.goto('/');
    await mockAuth({ userName: 'Test User' });
    
    // Test authenticated features
    await expect(page.getByText('Test User')).toBeVisible();
  });
});
```

### Using Flight Fixtures

```typescript
import { test, expect } from '../fixtures/test-flight';

test.describe('Flight Tests', () => {
  test('should fly the ship', async ({ page, launchShip }) => {
    await launchShip('courier');
    
    // Test flight controls
    await page.keyboard.press('a');
    await expect(page.getByTestId('throttle')).not.toHaveValue('0');
  });
});
```

## Test Fixtures

### Auth Fixtures (`test-auth.ts`)

- `isAuthenticated`: Whether user should be authenticated
- `userName`: Mock user name
- `mockAuth(options)`: Helper to mock authentication
- `clearAuth()`: Helper to clear authentication

### Flight Fixtures (`test-flight.ts`)

- `currentShip`: Current ship for testing
- `currentSystem`: Current system for testing
- `flightMode`: Flight mode
- `launchShip(shipId)`: Helper to launch with specific ship
- `mockFlightState(state)`: Helper to mock flight state

## Debugging Tests

### Playwright Inspector

```bash
PWDEBUG=1 npx playwright test
```

### Trace Viewer

```bash
# Run tests with trace
npx playwright test --trace on

# View trace after test failure
npx playwright show-trace playwright-report/data/trace.zip
```

### HTML Report

```bash
# Generate HTML report
npx playwright test --reporter=html

# Open report
npx playwright show-report
```

## Configuration

See `playwright.config.ts` for:

- Browser configurations
- Timeout settings
- Reporter options
- Web server configuration
- Mobile device emulation

## Mocking

Since we can't test real OAuth in E2E, we use mocking:

```typescript
// Mock authentication
await page.evaluate(() => {
  localStorage.setItem('mock-auth', 'true');
  localStorage.setItem('session', 'test-token');
});
await page.reload();
```

## Best Practices

1. **Use fixtures** for common setup/teardown
2. **Mock external dependencies** (OAuth, APIs)
3. **Use data-testid attributes** for stable selectors
4. **Wait for network idle** when needed
5. **Take screenshots on failure** (already configured)
6. **Record videos of failures** (already configured)
7. **Use trace for debugging** complex issues

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run dev &
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Timeout

Increase timeout in `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 60000, // 60 seconds
});
```

### Flaky Tests

Use retries:

```typescript
export default defineConfig({
  retries: 2,
});
```

### Selector Not Found

1. Use `page.waitForSelector()` before interacting
2. Use more specific selectors (data-testid)
3. Check if element is in iframe
4. Increase timeout

### Browser Not Launching

```bash
# Reinstall browsers
npx playwright install --force

# Install system dependencies (Linux)
npx playwright install-deps
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Test Examples](https://playwright.dev/docs/test-examples)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Contributing

When adding new tests:

1. Follow existing test structure
2. Use fixtures for common setup
3. Add data-testid attributes to components
4. Update this README with new test scenarios
5. Ensure tests pass locally before pushing

## License

Same as main project.
