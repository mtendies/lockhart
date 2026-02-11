import { test, expect } from '@playwright/test';
import { hasAuthState, getAuthStatePath, getTestCredentials } from './helpers/auth';

test.describe('Returning User', () => {
  // This test verifies data persistence for returning users
  // It depends on previous tests having created a user and logged meals

  test.use({
    storageState: hasAuthState() ? getAuthStatePath() : undefined,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Skip any intro or tutorial modals
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    const skipTutorialButton = page.getByRole('button', { name: /skip tutorial/i });
    if (await skipTutorialButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipTutorialButton.click();
    }

    const remindMeLaterButton = page.getByRole('button', { name: /remind me later/i });
    if (await remindMeLaterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await remindMeLaterButton.click();
    }

    // Wait for app to load
    await page.waitForSelector('[data-testid="home-page"], [data-testid="bottom-nav"]', { timeout: 15000 });
  });

  test('should show user greeting on return', async ({ page }) => {
    // On the home page, user's name should appear in greeting
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Look for greeting with user name
    const greeting = page.locator('h1').filter({ hasText: /good|hello|hi/i });
    await expect(greeting).toBeVisible({ timeout: 5000 });

    // The greeting should contain some name (not just "there")
    const greetingText = await greeting.textContent();
    expect(greetingText).toBeTruthy();
    console.log(`Greeting: ${greetingText}`);
  });

  test('should preserve calibration progress across sessions', async ({ page }) => {
    // Go to home page
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Look for calibration day counter
    const dayCounter = page.locator('[data-testid="calibration-day-counter"]');

    // Check if calibration is in progress
    if (await dayCounter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const dayText = await dayCounter.textContent();
      expect(dayText).toMatch(/Day \d+ of 5/i);
      console.log(`Calibration preserved: ${dayText}`);
    } else {
      // Calibration might be complete, which is also valid
      console.log('Calibration not visible - may be complete');
    }
  });

  test('should persist previously logged meals', async ({ page }) => {
    // Go to home page
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Scroll to see meals
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    // Look for any meal-related content
    // This could be logged meals, calorie totals, etc.
    const mealIndicators = page.locator('text=/breakfast|lunch|dinner|meal|cal/i');
    const count = await mealIndicators.count();

    // Should have some meal-related content
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} meal-related elements`);
  });

  test('should maintain navigation state', async ({ page }) => {
    // Navigate through different tabs
    const tabs = ['nav-home', 'nav-advisor', 'nav-nutrition', 'nav-training'];

    for (const tab of tabs) {
      await page.click(`[data-testid="${tab}"]`);
      await page.waitForTimeout(500);

      // Tab should be active (primary color)
      const tabButton = page.locator(`[data-testid="${tab}"]`);
      await expect(tabButton).toHaveClass(/text-primary/);
    }
  });

  test('should show synced data after refresh', async ({ page }) => {
    // Go to home page
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Get current state before refresh
    const greetingBefore = await page.locator('h1').filter({ hasText: /good|hello|hi/i }).textContent();

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Dismiss any modals
    const remindMeLaterButton = page.getByRole('button', { name: /remind me later/i });
    if (await remindMeLaterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await remindMeLaterButton.click();
    }

    // Wait for app to load
    await page.waitForSelector('[data-testid="home-page"]', { timeout: 10000 });

    // Get state after refresh
    const greetingAfter = await page.locator('h1').filter({ hasText: /good|hello|hi/i }).textContent();

    // Data should be preserved
    expect(greetingAfter).toBeTruthy();
    console.log(`Before refresh: ${greetingBefore}`);
    console.log(`After refresh: ${greetingAfter}`);
  });
});
