import { test, expect } from '@playwright/test';
import { hasAuthState, getAuthStatePath } from './helpers/auth';

test.describe('Edge Cases', () => {
  // Use saved auth state if available
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

  test('should handle empty message in chat gracefully', async ({ page }) => {
    // Navigate to Advisor/Chat
    await page.click('[data-testid="nav-advisor"]');
    await page.waitForTimeout(1000);

    // Find the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // The send button should be disabled when input is empty
    const sendButton = page.locator('[data-testid="chat-send-button"]');
    await expect(sendButton).toBeDisabled();

    // Try clicking anyway - should not crash
    await sendButton.click({ force: true });
    await page.waitForTimeout(500);

    // Page should still be functional
    await expect(chatInput).toBeVisible();
  });

  test('should handle special characters in meal description', async ({ page }) => {
    // Go to home page
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Scroll to calibration section
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    // Click on "Tap to add" for a meal slot
    const tapToAdd = page.locator('text=Tap to add').first();
    if (await tapToAdd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tapToAdd.click();
      await page.waitForTimeout(500);
    }

    // Find meal input
    let mealInput = page.locator('[data-testid="meal-input"]').first();
    if (!await mealInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      mealInput = page.locator('textarea:visible').first();
    }

    if (await mealInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Enter text with special characters
      const specialMeal = "Crème brûlée with açaí and jalapeño — très délicieux! 🍮";
      await mealInput.fill(specialMeal);
      await page.waitForTimeout(1000);

      // Verify the text was saved correctly (no encoding issues)
      const inputValue = await mealInput.inputValue();
      expect(inputValue).toContain('Crème');
      expect(inputValue).toContain('açaí');
      expect(inputValue).toContain('jalapeño');
    }
  });

  test('should handle very long meal description', async ({ page }) => {
    // Go to home page
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Scroll to calibration section
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    // Click on "Tap to add" for a meal slot
    const tapToAdd = page.locator('text=Tap to add').first();
    if (await tapToAdd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tapToAdd.click();
      await page.waitForTimeout(500);
    }

    // Find meal input
    let mealInput = page.locator('[data-testid="meal-input"]').first();
    if (!await mealInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      mealInput = page.locator('textarea:visible').first();
    }

    if (await mealInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Generate a very long description (500+ words)
      const ingredients = [
        'chicken breast', 'brown rice', 'broccoli', 'carrots', 'olive oil',
        'garlic', 'onion', 'bell pepper', 'tomatoes', 'spinach',
        'mushrooms', 'zucchini', 'quinoa', 'black beans', 'corn',
        'avocado', 'lime juice', 'cilantro', 'cumin', 'paprika'
      ];
      const longDescription = Array(25).fill(ingredients.join(', ')).join('. Also had ');

      await mealInput.fill(longDescription);
      await page.waitForTimeout(1000);

      // Page should not crash and input should have content
      const inputValue = await mealInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(500);
    }
  });

  test('should survive page refresh without crashing', async ({ page }) => {
    // Go to home page
    await page.click('[data-testid="nav-home"]');
    await page.waitForTimeout(1000);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Dismiss any modals that reappear
    const remindMeLaterButton = page.getByRole('button', { name: /remind me later/i });
    if (await remindMeLaterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await remindMeLaterButton.click();
    }

    // App should still be functional
    await expect(page.locator('[data-testid="home-page"]')).toBeVisible({ timeout: 10000 });

    // Navigation should still work
    await page.click('[data-testid="nav-advisor"]');
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle chat message submission', async ({ page }) => {
    // Navigate to Advisor/Chat
    await page.click('[data-testid="nav-advisor"]');
    await page.waitForTimeout(1000);

    // Find the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Enter a message
    await chatInput.fill('Hello, how are you?');

    // Send button should now be enabled
    const sendButton = page.locator('[data-testid="chat-send-button"]');
    await expect(sendButton).toBeEnabled();

    // Click send
    await sendButton.click();

    // Wait for response (generous timeout for Claude API)
    await page.waitForTimeout(2000);

    // The message should appear in the chat
    await expect(page.getByText('Hello, how are you?')).toBeVisible({ timeout: 5000 });

    // Wait for AI response (can be slow)
    // Look for thinking indicator or response
    const hasResponse = await Promise.race([
      page.waitForSelector('.animate-bounce', { timeout: 20000 }).then(() => 'loading'),
      page.waitForSelector('.bg-white >> text=/./i', { timeout: 20000 }).then(() => 'response'),
    ]).catch(() => 'timeout');

    // Should at least show loading state
    expect(['loading', 'response']).toContain(hasResponse);
  });
});
