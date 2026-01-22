import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../utils/auth-helpers';

test.describe('Chat Conversation', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should load chat interface', async ({ page }) => {
        await page.goto('/');

        // Verify chat input is present
        await expect(page.getByPlaceholder(/Type a message/i)).toBeVisible();

        // Send a message
        const messageInput = page.getByPlaceholder(/Type a message/i);
        await expect(messageInput).toBeVisible({ timeout: 10000 });
        await expect(messageInput).toBeEnabled({ timeout: 10000 });
        await messageInput.fill('Hello from Playwright');
        await page.keyboard.press('Enter');

        // Verify message appears in the list (optimistic update)
        await expect(page.getByText('Hello from Playwright')).toBeVisible();
    });
});

