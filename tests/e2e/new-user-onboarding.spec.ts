import { test, expect } from '@playwright/test';
import { generateTestEmail, getTestCredentials, saveAuthState, waitForAppReady } from './helpers/auth';

test.describe('New User Onboarding', () => {
  test('should sign up and complete onboarding flow', async ({ page }) => {
    const { email, password } = getTestCredentials();

    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Handle pre-onboarding intro carousel if present
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }

    // Wait for auth form to appear
    await page.waitForSelector('[data-testid="auth-email-input"]', { timeout: 10000 });

    // Switch to sign up mode if needed
    const toggleButton = page.locator('[data-testid="auth-toggle-mode"]');
    const toggleText = await toggleButton.textContent();
    if (toggleText?.includes("Don't have an account")) {
      await toggleButton.click();
    }

    // Fill in sign up form
    await page.fill('[data-testid="auth-email-input"]', email);
    await page.fill('[data-testid="auth-password-input"]', password);

    // Submit sign up
    await page.click('[data-testid="auth-submit-button"]');

    // Wait for navigation away from auth (should go to onboarding)
    await expect(page.locator('[data-testid="auth-email-input"]')).not.toBeVisible({ timeout: 15000 });

    // Wait for onboarding depth selection
    await page.waitForSelector('[data-testid="onboarding-depth-selection"]', { timeout: 10000 });

    // Select "Chill" mode for faster testing (3 steps)
    await page.click('[data-testid="depth-option-chill"]');

    // Wait for onboarding form to appear
    await page.waitForSelector('[data-testid="onboarding-form"]', { timeout: 5000 });

    // Step 1: Personal Info
    // Fill required fields
    await page.fill('input[placeholder*="What should I call you"]', 'E2E Test User');

    // Age
    const ageInput = page.locator('input[placeholder="Years"]');
    if (await ageInput.isVisible()) {
      await ageInput.fill('30');
    }

    // Weight
    const weightInput = page.locator('input[placeholder*="165"], input[placeholder*="75"]').first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('165');
    }

    // Height
    const heightInput = page.locator('input[placeholder*="69"], input[placeholder*="175"]').first();
    if (await heightInput.isVisible()) {
      await heightInput.fill('70');
    }

    // Sex (select dropdown)
    const sexSelect = page.locator('select').filter({ hasText: /male|female/i }).first();
    if (await sexSelect.isVisible()) {
      await sexSelect.selectOption('male');
    }

    // Click Next to go to Training step
    await page.click('[data-testid="onboarding-next-button"]');
    await page.waitForTimeout(500); // Wait for transition

    // Step 2: Training (minimal - just move forward)
    // The training step might have exercise checkboxes or inputs
    // For minimal testing, just advance
    await page.click('[data-testid="onboarding-next-button"]');
    await page.waitForTimeout(500);

    // Step 3: Goals (last step for Chill mode)
    // Select at least one goal if required
    const goalCheckboxes = page.locator('input[type="checkbox"]');
    const goalCount = await goalCheckboxes.count();
    if (goalCount > 0) {
      await goalCheckboxes.first().check();
    }

    // Complete setup
    await page.click('[data-testid="onboarding-submit-button"]');

    // Handle tutorial overlay if it appears
    const skipTutorialButton = page.getByRole('button', { name: /skip tutorial/i });
    if (await skipTutorialButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipTutorialButton.click();
      await page.waitForTimeout(500);
    }

    // Wait for main app to load (home page or bottom nav)
    await Promise.race([
      page.waitForSelector('[data-testid="home-page"]', { timeout: 15000 }),
      page.waitForSelector('[data-testid="bottom-nav"]', { timeout: 15000 }),
    ]);

    // Verify we're on the home page
    await expect(page.locator('[data-testid="home-page"]')).toBeVisible({ timeout: 10000 });

    // Verify the user's name appears in the greeting (check for first name only)
    await expect(page.getByText(/E2E|Test/i)).toBeVisible({ timeout: 5000 });

    // Save auth state for subsequent tests
    await saveAuthState(page);

    console.log(`Test user created: ${email}`);
  });
});
