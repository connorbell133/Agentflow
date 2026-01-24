import { test } from '../fixtures/test-fixtures';
import { expect } from '@playwright/test';

test.describe('Chat Conversation', () => {
  test('should load chat interface', async ({ page, authenticatedUserWithOrg }) => {
    await page.goto('/');

    // Verify chat input is present using data-testid
    await expect(page.getByTestId('chat-message-input')).toBeVisible({ timeout: 10000 });

    // Send a message
    const messageInput = page.getByTestId('chat-message-input');
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    await expect(messageInput).toBeEnabled({ timeout: 10000 });
    await messageInput.fill('Hello from Playwright');
    await page.keyboard.press('Enter');

    // Verify message appears in the list (optimistic update)
    await expect(page.getByText('Hello from Playwright')).toBeVisible({ timeout: 10000 });
  });
});
