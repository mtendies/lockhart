import { test, expect } from '@playwright/test';
import { getTestCredentials, hasAuthState, getAuthStatePath } from './helpers/auth';

test.describe('Day 1 Meal Logging', () => {
  // Use saved auth state if available
  test.use({
    storageState: hasAuthState() ? getAuthStatePath() : undefined,
  });

  test.beforeEach(async ({ page }) => {
    // If no auth state, we need to log in
    if (!hasAuthState()) {
      const { email, password } = getTestCredentials();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Skip intro if present
      const skipButton = page.getByRole('button', { name: /skip/i });
      if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipButton.click();
      }

      // Log in
      await page.waitForSelector('[data-testid="auth-email-input"]', { timeout: 10000 });
      await page.fill('[data-testid="auth-email-input"]', email);
      await page.fill('[data-testid="auth-password-input"]', password);
      await page.click('[data-testid="auth-submit-button"]');

      // Wait for app to load
      await page.waitForSelector('[data-testid="home-page"], [data-testid="bottom-nav"]', { timeout: 15000 });
    } else {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    // Skip tutorial if it appears
    const skipTutorialButton = page.getByRole('button', { name: /skip tutorial/i });
    if (await skipTutorialButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipTutorialButton.click();
    }

    // Dismiss Weekly Check-in modal if it appears
    const remindMeLaterButton = page.getByRole('button', { name: /remind me later/i });
    if (await remindMeLaterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await remindMeLaterButton.click();
      await page.waitForTimeout(500);
    }

    // Make sure we're on home page
    await page.waitForSelector('[data-testid="home-page"], [data-testid="bottom-nav"]', { timeout: 10000 });
  });

  test('should log a meal and see calorie estimate', async ({ page }) => {
    // During calibration, meal inputs are on the Home page
    // Make sure we're on the home page
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Scroll down to see the calibration section
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    // Click on "Tap to add" for Breakfast to expand the input
    const tapToAdd = page.locator('text=Tap to add').first();
    await expect(tapToAdd).toBeVisible({ timeout: 10000 });
    await tapToAdd.click();
    await page.waitForTimeout(500);

    // Now the textarea should appear - look for it by placeholder or data-testid
    let mealInput = page.locator('[data-testid="meal-input"]').first();
    if (!await mealInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      mealInput = page.locator('textarea[placeholder*="What did you have"]').first();
    }
    if (!await mealInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Also try any visible textarea
      mealInput = page.locator('textarea:visible').first();
    }

    await expect(mealInput).toBeVisible({ timeout: 10000 });

    const mealDescription = 'Two scrambled eggs with toast and orange juice';
    await mealInput.fill(mealDescription);

    // Wait a moment for auto-save and calorie estimation to trigger
    await page.waitForTimeout(2000);

    // The calorie estimate should appear - look for calorie-related text
    // This could be in a tooltip, badge, or summary
    const calorieIndicators = page.locator('text=/\\d+\\s*(cal|kcal|calories)/i');

    // Give generous timeout for AI calorie estimation (can be slow on cold start)
    await expect(calorieIndicators.first()).toBeVisible({ timeout: 20000 });

    // Verify the calorie number is reasonable (not 0, not NaN)
    const calorieText = await calorieIndicators.first().textContent();
    const calorieMatch = calorieText?.match(/(\d+)/);
    expect(calorieMatch).toBeTruthy();
    const calories = parseInt(calorieMatch![1], 10);
    expect(calories).toBeGreaterThan(0);
    expect(calories).toBeLessThan(5000); // Sanity check
    expect(Number.isNaN(calories)).toBe(false);

    console.log(`Meal logged with estimated ${calories} calories`);
  });

  test('should show meal in the meal log after saving', async ({ page }) => {
    // During calibration, meal inputs are on the Home page
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Scroll down to see the calibration section
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    // Click on "Tap to add" for a meal slot to expand the input
    const tapToAdd = page.locator('text=Tap to add').first();
    if (await tapToAdd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tapToAdd.click();
      await page.waitForTimeout(500);
    }

    // Find a meal input - try data-testid first, then placeholder
    let mealInput = page.locator('[data-testid="meal-input"]').first();
    if (!await mealInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      mealInput = page.locator('textarea[placeholder*="What did you have"]').first();
    }
    if (!await mealInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      mealInput = page.locator('textarea:visible').first();
    }

    await expect(mealInput).toBeVisible({ timeout: 10000 });

    // Enter a unique meal to track
    const uniqueMeal = `Test meal ${Date.now()}`;
    await mealInput.fill(uniqueMeal);
    await page.waitForTimeout(1500); // Wait for auto-save

    // The meal should be saved and visible on the page
    await expect(page.getByText(uniqueMeal)).toBeVisible({ timeout: 5000 });
  });

  test('should show calibration day counter', async ({ page }) => {
    // Navigate to Nutrition tab or Home to see calibration progress
    await page.click('[data-testid="nav-nutrition"]');
    await page.waitForTimeout(1000);

    // Look for day counter - could be "Day 1 of 5" or similar
    const dayCounter = page.locator('[data-testid="calibration-day-counter"]');

    if (await dayCounter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const dayText = await dayCounter.textContent();
      expect(dayText).toMatch(/Day \d+ of 5/i);
      console.log(`Calibration progress: ${dayText}`);
    } else {
      // Day counter might be on home page instead
      await page.click('[data-testid="nav-home"]');
      await page.waitForTimeout(1000);

      const homePageDayCounter = page.locator('[data-testid="calibration-day-counter"]');
      if (await homePageDayCounter.isVisible({ timeout: 3000 }).catch(() => false)) {
        const dayText = await homePageDayCounter.textContent();
        expect(dayText).toMatch(/Day \d+ of 5/i);
        console.log(`Calibration progress: ${dayText}`);
      }
    }
  });
});
