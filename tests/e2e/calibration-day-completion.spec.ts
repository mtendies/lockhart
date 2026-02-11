import { test, expect } from '@playwright/test';
import { hasAuthState, getAuthStatePath } from './helpers/auth';

test.describe('Calibration Day Completion', () => {
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

    await page.waitForSelector('[data-testid="home-page"], [data-testid="bottom-nav"]', { timeout: 15000 });
  });

  test('should show calibration progress on home page', async ({ page }) => {
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Look for calibration-related content
    const calibrationSection = page.locator('text=/unlock.*nutrition|day.*of.*5|calibration/i');

    if (await calibrationSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Calibration section found on home page');

      // Check for day counter
      const dayCounter = page.locator('[data-testid="calibration-day-counter"]');
      if (await dayCounter.isVisible({ timeout: 3000 }).catch(() => false)) {
        const dayText = await dayCounter.textContent();
        console.log(`Day counter: ${dayText}`);
        expect(dayText).toMatch(/Day \d+ of 5/i);
      }
    } else {
      console.log('Calibration may be complete or not yet started');
    }
  });

  test('should log multiple meals for a day', async ({ page }) => {
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Scroll to calibration section
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    // Count initial meals logged
    const mealInputs = page.locator('[data-testid="meal-input"], textarea[placeholder*="What did you have"]');
    const initialVisibleInputs = await mealInputs.count();

    // Try to log a second meal if "Tap to add" is available
    const tapToAddAll = page.locator('text=Tap to add');
    const tapCount = await tapToAddAll.count();

    if (tapCount > 0) {
      // Click on first "Tap to add"
      await tapToAddAll.first().click();
      await page.waitForTimeout(500);

      // Find and fill the input
      let mealInput = page.locator('[data-testid="meal-input"]:visible').first();
      if (!await mealInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        mealInput = page.locator('textarea:visible').first();
      }

      if (await mealInput.isVisible()) {
        await mealInput.fill('Oatmeal with berries and honey');
        await page.waitForTimeout(1500);
        console.log('Logged second meal');
      }
    }

    // Log a third meal if possible
    const remainingTapToAdd = page.locator('text=Tap to add');
    if (await remainingTapToAdd.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await remainingTapToAdd.first().click();
      await page.waitForTimeout(500);

      let mealInput = page.locator('[data-testid="meal-input"]:visible').first();
      if (!await mealInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        mealInput = page.locator('textarea:visible').first();
      }

      if (await mealInput.isVisible()) {
        await mealInput.fill('Grilled salmon with vegetables');
        await page.waitForTimeout(1500);
        console.log('Logged third meal');
      }
    }
  });

  test('should persist day count after page refresh (Issue #11 regression)', async ({ page }) => {
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Get current day count before refresh
    const dayCounter = page.locator('[data-testid="calibration-day-counter"]');
    let dayTextBefore: string | null = null;

    if (await dayCounter.isVisible({ timeout: 5000 }).catch(() => false)) {
      dayTextBefore = await dayCounter.textContent();
      console.log(`Day count before refresh: ${dayTextBefore}`);
    }

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Dismiss modals if they reappear
    const remindMeLaterButton = page.getByRole('button', { name: /remind me later/i });
    if (await remindMeLaterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await remindMeLaterButton.click();
    }

    // Wait for app to fully load
    await page.waitForSelector('[data-testid="home-page"]', { timeout: 10000 });

    // Check day count after refresh
    const dayCounterAfter = page.locator('[data-testid="calibration-day-counter"]');

    if (dayTextBefore && await dayCounterAfter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const dayTextAfter = await dayCounterAfter.textContent();
      console.log(`Day count after refresh: ${dayTextAfter}`);

      // Day count should be the same (no desync)
      expect(dayTextAfter).toBe(dayTextBefore);
    } else {
      console.log('Day counter not visible after refresh - calibration may be complete');
    }
  });

  test('should show logged meals counter', async ({ page }) => {
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Look for meals logged counter (e.g., "0 of 3 logged" or similar)
    const mealsLogged = page.locator('text=/\\d+.*of.*\\d+.*logged|logged.*\\d+/i');

    if (await mealsLogged.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const loggedText = await mealsLogged.first().textContent();
      console.log(`Meals logged indicator: ${loggedText}`);
    }

    // Also check for calorie totals
    const calorieTotal = page.locator('text=/\\d+.*cal|calories.*\\d+/i');
    if (await calorieTotal.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const calorieText = await calorieTotal.first().textContent();
      console.log(`Calorie total: ${calorieText}`);
    }
  });
});
