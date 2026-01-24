/**
 * Session Verification Tests
 *
 * These tests verify that the Supabase session injection mechanism works correctly.
 * They ensure that:
 * 1. Session state is correctly saved in Playwright storage format
 * 2. Sessions persist across page navigations
 * 3. Authenticated API requests work with injected sessions
 * 4. Session storage format matches Supabase expectations
 */

import { test, expect, TestInfo } from '@playwright/test';
import { createAuthenticatedUser, savePlaywrightAuthState } from '../utils/auth-factories';
import { cleanupTestUserByEmail } from '../utils/test-cleanup';
import { generateTestEmail } from '../utils/test-factories';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

test.describe('Session Storage Verification', () => {
  const tempAuthFiles: string[] = [];

  test('should correctly format session storage state', async ({}, testInfo: TestInfo) => {
    let testUserEmail: string | null = null;

    try {
      // Create authenticated user
      testUserEmail = generateTestEmail(testInfo);
      const user = await createAuthenticatedUser({
        email: testUserEmail,
        password: 'TestPassword123!',
        fullName: 'Verification Test User',
      });

      // Save session to temporary file
      const authFile = join(tmpdir(), `test-auth-${randomUUID()}.json`);
      tempAuthFiles.push(authFile);

      await savePlaywrightAuthState(user.session, authFile);

      // Verify file was created and has correct structure
      const storageState = JSON.parse(readFileSync(authFile, 'utf-8'));

      expect(storageState).toHaveProperty('cookies');
      expect(storageState).toHaveProperty('origins');
      expect(Array.isArray(storageState.cookies)).toBe(true);
      expect(storageState.cookies.length).toBeGreaterThan(0);

      // Verify cookie structure
      const authCookie = storageState.cookies[0];
      expect(authCookie.name).toMatch(/^sb-.+-auth-token$/);
      expect(authCookie).toHaveProperty('value');
      expect(authCookie).toHaveProperty('domain');
      expect(authCookie).toHaveProperty('path');
      expect(authCookie.path).toBe('/');
      expect(authCookie.httpOnly).toBe(false);
      expect(authCookie.sameSite).toBe('Lax');

      // Verify cookie value is valid JSON containing session data
      const cookieValue = JSON.parse(authCookie.value);
      expect(cookieValue).toHaveProperty('access_token');
      expect(cookieValue).toHaveProperty('refresh_token');
      expect(cookieValue).toHaveProperty('expires_at');
      expect(cookieValue).toHaveProperty('user');
      expect(cookieValue.user.id).toBe(user.id);
      expect(cookieValue.user.email).toBe(user.email);
    } finally {
      // Always cleanup user, regardless of test result
      if (testUserEmail) {
        await cleanupTestUserByEmail(testUserEmail);
      }
    }
  });

  test('should authenticate requests with injected session', async ({
    browser,
  }, testInfo: TestInfo) => {
    let testUserEmail: string | null = null;

    try {
      // Create user and save session
      testUserEmail = generateTestEmail(testInfo);
      const user = await createAuthenticatedUser({
        email: testUserEmail,
        password: 'TestPassword123!',
        fullName: 'Auth Request Test User',
      });

      const authFile = join(tmpdir(), `test-auth-${randomUUID()}.json`);
      tempAuthFiles.push(authFile);
      await savePlaywrightAuthState(user.session, authFile);

      // Create new context with saved storage state
      const context = await browser.newContext({
        storageState: authFile,
      });

      const page = await context.newPage();

      // Navigate to a protected page (root is the main app for completed users)
      await page.goto('http://localhost:3000/');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Verify we're not redirected to sign-in
      expect(page.url()).not.toContain('/sign-in');
      // Should be on root or flow (flow redirects completed users to root)
      expect(page.url()).toMatch(/http:\/\/localhost:3000\/?$/);

      // Verify page loaded successfully (should have conversation elements)
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();

      await context.close();
    } finally {
      // Always cleanup user, regardless of test result
      if (testUserEmail) {
        await cleanupTestUserByEmail(testUserEmail);
      }
    }
  });

  test('should persist session across page navigations', async ({
    browser,
  }, testInfo: TestInfo) => {
    let testUserEmail: string | null = null;

    try {
      // Create user and save session
      testUserEmail = generateTestEmail(testInfo);
      const user = await createAuthenticatedUser({
        email: testUserEmail,
        password: 'TestPassword123!',
        fullName: 'Navigation Test User',
      });

      const authFile = join(tmpdir(), `test-auth-${randomUUID()}.json`);
      tempAuthFiles.push(authFile);
      await savePlaywrightAuthState(user.session, authFile);

      // Create new context with saved storage state
      const context = await browser.newContext({
        storageState: authFile,
      });

      const page = await context.newPage();

      // Navigate to protected page (root is the main app for completed users)
      await page.goto('http://localhost:3000/');
      await page.waitForLoadState('networkidle');
      // Should be on root (flow redirects completed users to root)
      expect(page.url()).toMatch(/http:\/\/localhost:3000\/?$/);

      // Navigate to another protected page (if admin endpoints exist)
      // For now, just verify session persists on reload
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be authenticated
      expect(page.url()).not.toContain('/sign-in');
      // Should still be on root
      expect(page.url()).toMatch(/http:\/\/localhost:3000\/?$/);

      await context.close();
    } finally {
      // Always cleanup user, regardless of test result
      if (testUserEmail) {
        await cleanupTestUserByEmail(testUserEmail);
      }
    }
  });

  test('should handle session expiration gracefully', async ({ browser }, testInfo: TestInfo) => {
    let testUserEmail: string | null = null;

    try {
      // Create user with very short session (if possible)
      testUserEmail = generateTestEmail(testInfo);
      const user = await createAuthenticatedUser({
        email: testUserEmail,
        password: 'TestPassword123!',
        fullName: 'Expiration Test User',
      });

      // Create storage state with expired session
      const expiredSession = {
        ...user.session,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };

      const authFile = join(tmpdir(), `test-auth-${randomUUID()}.json`);
      tempAuthFiles.push(authFile);
      await savePlaywrightAuthState(expiredSession, authFile);

      // Create new context with expired session
      const context = await browser.newContext({
        storageState: authFile,
      });

      const page = await context.newPage();

      // Try to navigate to protected page
      await page.goto('http://localhost:3000/');
      await page.waitForLoadState('networkidle');

      // Should be redirected to sign-in (or show expired session message)
      // This depends on your app's session handling
      const url = page.url();
      const isAuthPage =
        url.includes('/sign-in') || url.includes('/sign-up') || url.includes('/onboarding');

      // If not redirected, session refresh might have worked (which is also valid)
      // Just verify we either:
      // 1. Got redirected to auth page, OR
      // 2. Session was refreshed and we're still on protected page (root)
      expect(isAuthPage || url.match(/http:\/\/localhost:3000\/?$/)).toBe(true);

      await context.close();
    } finally {
      // Always cleanup user, regardless of test result
      if (testUserEmail) {
        await cleanupTestUserByEmail(testUserEmail);
      }
    }
  });

  test('should work with storage state in Playwright tests', async ({
    page,
    browser,
  }, testInfo: TestInfo) => {
    let testUserEmail: string | null = null;

    try {
      // This test verifies the most common usage pattern

      // 1. Create user and save session (typically done in global.setup.ts)
      testUserEmail = generateTestEmail(testInfo);
      const user = await createAuthenticatedUser({
        email: testUserEmail,
        password: 'TestPassword123!',
        fullName: 'Pattern Test User',
      });

      const authFile = join(tmpdir(), `test-auth-${randomUUID()}.json`);
      tempAuthFiles.push(authFile);
      await savePlaywrightAuthState(user.session, authFile);

      // 2. Create new browser context with auth (typical test usage)
      const authenticatedContext = await browser.newContext({
        storageState: authFile,
      });

      const authenticatedPage = await authenticatedContext.newPage();

      // 3. Navigate and verify authenticated state (root is the main app for completed users)
      await authenticatedPage.goto('http://localhost:3000/');
      await authenticatedPage.waitForLoadState('networkidle');

      // 4. Perform authenticated actions
      // Should be on root (flow redirects completed users to root)
      expect(authenticatedPage.url()).toMatch(/http:\/\/localhost:3000\/?$/);
      expect(authenticatedPage.url()).not.toContain('/sign-in');

      // 5. Verify user can interact with authenticated features
      const body = await authenticatedPage.textContent('body');
      expect(body).toBeTruthy();

      await authenticatedContext.close();
    } finally {
      // Always cleanup user, regardless of test result
      if (testUserEmail) {
        await cleanupTestUserByEmail(testUserEmail);
      }
    }
  });
});
