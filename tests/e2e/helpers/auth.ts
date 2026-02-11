import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_STATE_PATH = path.join(__dirname, '../.auth/user.json');

// Generate unique test email for each test run
export function generateTestEmail(): string {
  return `e2e-test-${Date.now()}@test.com`;
}

// Test credentials - stored for session reuse
let testCredentials: { email: string; password: string } | null = null;

export function getTestCredentials() {
  if (!testCredentials) {
    testCredentials = {
      email: generateTestEmail(),
      password: 'TestPassword123!',
    };
  }
  return testCredentials;
}

export function resetTestCredentials() {
  testCredentials = null;
}

/**
 * Sign up a new user
 */
export async function signUp(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');

  // Wait for auth page or intro page
  await page.waitForLoadState('networkidle');

  // If we see the intro page, click to continue
  const getStartedButton = page.getByRole('button', { name: /get started/i });
  if (await getStartedButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await getStartedButton.click();
  }

  // Wait for auth form
  await page.waitForSelector('input[id="email"]', { timeout: 10000 });

  // Switch to sign up mode if needed
  const signUpToggle = page.getByRole('button', { name: /create.*account|sign.*up|don't have an account/i });
  if (await signUpToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signUpToggle.click();
  }

  // Fill in credentials
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation away from auth (to onboarding or home)
  await expect(page.locator('input[id="email"]')).not.toBeVisible({ timeout: 15000 });
}

/**
 * Log in an existing user
 */
export async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');

  await page.waitForLoadState('networkidle');

  // If we see the intro page, click to continue
  const getStartedButton = page.getByRole('button', { name: /get started/i });
  if (await getStartedButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await getStartedButton.click();
  }

  // Wait for auth form
  await page.waitForSelector('input[id="email"]', { timeout: 10000 });

  // Make sure we're in sign in mode
  const signInToggle = page.getByRole('button', { name: /already have an account/i });
  if (await signInToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInToggle.click();
  }

  // Fill in credentials
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation away from auth
  await expect(page.locator('input[id="email"]')).not.toBeVisible({ timeout: 15000 });
}

/**
 * Log out current user
 */
export async function logOut(page: Page): Promise<void> {
  // Click profile menu in header
  const profileButton = page.locator('[data-testid="profile-menu-button"]');
  if (await profileButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await profileButton.click();

    // Click sign out
    await page.getByRole('button', { name: /sign out/i }).click();

    // Wait for auth page
    await page.waitForSelector('input[id="email"]', { timeout: 10000 });
  }
}

/**
 * Save auth state for reuse
 */
export async function saveAuthState(page: Page): Promise<void> {
  const dir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await page.context().storageState({ path: AUTH_STATE_PATH });
}

/**
 * Check if saved auth state exists
 */
export function hasAuthState(): boolean {
  return fs.existsSync(AUTH_STATE_PATH);
}

/**
 * Get auth state path for test.use()
 */
export function getAuthStatePath(): string {
  return AUTH_STATE_PATH;
}

/**
 * Wait for app to be fully loaded after auth
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for either onboarding or main app
  await Promise.race([
    page.waitForSelector('[data-testid="onboarding-form"]', { timeout: 10000 }),
    page.waitForSelector('[data-testid="bottom-nav"]', { timeout: 10000 }),
    page.waitForSelector('[data-testid="home-page"]', { timeout: 10000 }),
  ]).catch(() => {
    // If neither appears, that's okay - we might be on a different valid page
  });
}
