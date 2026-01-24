import { test, expect, TestInfo } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import {
  navigateToModelsTab,
  importModelFromYAML,
  deleteModel,
  verifyModelExists,
  verifyModelNotExists,
  getModelIdByName,
} from '../utils/org-utils';
import { getOrgIdByEmail, createTestModel, deleteTestModel } from '../utils/db-utils';
import { generateTestEmail, generateTestModelName } from '../utils/test-factories';
import { createUserWithOrg } from '../utils/auth-factories';
import { cleanupTestUserByEmail } from '../utils/test-cleanup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a unique ID for this test run to avoid name conflicts between test runs
const testRunId = randomUUID().slice(0, 8);

/**
 * Helper function to inject Supabase session into Playwright page context
 * Similar to what the authenticatedUserWithOrg fixture does
 */
async function injectSessionIntoPage(page: any, session: any): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
  }

  // Extract project ID using the same logic as test fixtures
  const getSupabaseProjectId = (url: string): string => {
    if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return '127';
    }
    const match = url.match(/https:\/\/([^.]+)\./);
    return match ? match[1] : 'your-project-id';
  };

  const projectId = getSupabaseProjectId(supabaseUrl);
  const tokenKey = `sb-${projectId}-auth-token`;
  const sessionValue = JSON.stringify(session);

  // Inject Cookie (Server)
  await page.context().addCookies([
    {
      name: tokenKey,
      value: sessionValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ]);

  // Inject LocalStorage (Client)
  await page.goto('/404');
  await page.evaluate(
    ({ key, value }: { key: string; value: string }) => localStorage.setItem(key, value),
    { key: tokenKey, value: sessionValue }
  );
}

/**
 * Model Management E2E Tests
 *
 * Tests for CRUD operations on AI Connection models:
 * - Import model from YAML
 * - Create model manually
 * - Update existing model
 * - Delete model with confirmation
 */
test.describe('Model Management', () => {
  // Common test data - includes unique suffix to prevent conflicts
  const yamlModelName = `OpenAI GPT-4.1 Chat-${testRunId}`;
  const testEndpoint = 'https://httpbin.org/post'; // A working endpoint for testing

  test.describe('YAML Import', () => {
    test('should import a model from YAML file', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        // Get the absolute path to the YAML fixture
        const yamlFilePath = path.resolve(__dirname, '../fixtures/openai-model-config.yaml');

        // Import the model with unique name for test isolation
        await importModelFromYAML(page, yamlFilePath, {
          replaceIfExists: true,
          nameOverride: yamlModelName,
        });

        // Verify the model was created
        await verifyModelExists(page, yamlModelName);
      } finally {
        // Always cleanup, regardless of test result
        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });

    test('should validate YAML before import', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        // Navigate to models tab
        await navigateToModelsTab(page);

        // Wait for Import button to be visible and click it
        const importButton = page.getByTestId('model-import-button');
        await expect(importButton).toBeVisible({ timeout: 10000 });
        await expect(importButton).toBeEnabled({ timeout: 10000 });
        await importButton.click();

        // Wait for import modal
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

        // Get the valid YAML file
        const yamlFilePath = path.resolve(__dirname, '../fixtures/openai-model-config.yaml');

        // Upload the valid file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(yamlFilePath);

        // Wait for file to be loaded - wait for the file name to appear in the upload area
        await expect(page.getByText(/\.yaml|\.yml/)).toBeVisible({ timeout: 10000 });

        // Wait for the options section to appear (checkboxes only show after file is uploaded)
        // Wait for at least one of the checkboxes to be visible to ensure the options section has rendered
        const replaceLabel = page.getByTestId('import-replace-if-exists-label');
        const apiKeyLabel = page.getByTestId('import-api-key-label');
        // Wait for either label to be visible (they both appear when file is uploaded)
        try {
          await expect(replaceLabel).toBeVisible({ timeout: 5000 });
        } catch {
          await expect(apiKeyLabel).toBeVisible({ timeout: 5000 });
        }

        // Wait for Validate button to appear and click it
        const validateButton = page.getByTestId('import-validate-button');
        await expect(validateButton).toBeVisible({ timeout: 10000 });
        await expect(validateButton).toBeEnabled({ timeout: 10000 });
        await validateButton.click();

        // Should show validation passed (since we're using valid YAML)
        await expect(page.getByText('Configuration is valid')).toBeVisible({ timeout: 10000 });

        // Close the modal
        const cancelButton = page.getByRole('button', { name: 'Cancel' });
        await expect(cancelButton).toBeVisible({ timeout: 10000 });
        await cancelButton.click();
      } finally {
        // Always cleanup, regardless of test result
        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });
  });

  test.describe('Manual Model Creation', () => {
    test('should open the model creation wizard', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);

        // Navigate to models tab
        await navigateToModelsTab(page);

        // Wait for and click the + button using test ID
        const addButton = page.getByTestId('model-add-button');
        await expect(addButton).toBeVisible({ timeout: 10000 });
        await expect(addButton).toBeEnabled({ timeout: 10000 });
        await addButton.click();

        // Verify wizard opens - for new models, first step is template selection
        await expect(page.getByTestId('wizard-step-title-template')).toBeVisible({
          timeout: 10000,
        });

        // Close wizard
        await page.keyboard.press('Escape');
      } finally {
        // Always cleanup, regardless of test result
        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });

    test('should fill basic info step', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);

        const manualModelName = 'Test Manual Model';

        // Navigate to models tab
        await navigateToModelsTab(page);

        // Click the + button using test ID
        const addButton = page.getByTestId('model-add-button');
        await expect(addButton).toBeVisible({ timeout: 10000 });
        await expect(addButton).toBeEnabled({ timeout: 10000 });
        await addButton.click();

        // Wait for wizard - first step is "template" for new models
        await expect(page.getByTestId('wizard-step-title-template')).toBeVisible({
          timeout: 10000,
        });

        // Click "Start from Scratch" to proceed to basic info
        const startFromScratchButton = page.getByRole('button', { name: /start from scratch/i });
        await expect(startFromScratchButton).toBeVisible({ timeout: 10000 });
        await startFromScratchButton.click();

        // Wait for connection step (first step after template selection)
        await expect(page.getByTestId('wizard-step-title-connection')).toBeVisible({
          timeout: 10000,
        });

        // Fill in basic info
        await expect(page.getByTestId('wizard-input-name')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('wizard-input-name').fill(manualModelName);
        await expect(page.getByTestId('wizard-input-model-id')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('wizard-input-model-id').fill('test-manual-model');
        await expect(page.getByTestId('wizard-input-endpoint')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('wizard-input-endpoint').fill(testEndpoint);
        await expect(page.getByTestId('wizard-input-description')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('wizard-input-description').fill('A test model created manually');

        // Add a header
        await expect(page.getByTestId('wizard-button-add-header')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('wizard-button-add-header').click();
        await expect(page.getByTestId('wizard-input-header-key-0')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('wizard-input-header-key-0').fill('Content-Type');
        await expect(page.getByTestId('wizard-input-header-value-0')).toBeVisible({
          timeout: 10000,
        });
        await page.getByTestId('wizard-input-header-value-0').fill('application/json');

        // Note: Suggestion prompts may be on a different step, skipping for connection step test

        // Verify Next button is enabled (basic validation passed)
        const nextButton = page.getByTestId('wizard-button-next');
        await nextButton.scrollIntoViewIfNeeded();
        await expect(nextButton).toBeEnabled({ timeout: 10000 });

        // Close wizard
        await page.keyboard.press('Escape');
      } finally {
        // Always cleanup, regardless of test result
        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });

    test('should create a model through all wizard steps', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);

        // Use the exact same model configuration as the YAML file (with unique suffix)
        const manualModelName = yamlModelName;

        // Navigate to models tab
        await navigateToModelsTab(page);

        // Click the + button using test ID
        const addButton = page.getByTestId('model-add-button');
        await expect(addButton).toBeVisible({ timeout: 10000 });
        await expect(addButton).toBeEnabled({ timeout: 10000 });
        await addButton.click();

        // Step 1: Basic Info - Match YAML exactly
        await expect(page.getByTestId('wizard-step-title-basic')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('wizard-input-name').fill(manualModelName);
        await page.getByTestId('wizard-input-model-id').fill('openai-gpt-4.1');
        await page
          .getByTestId('wizard-input-endpoint')
          .fill('https://api.openai.com/v1/chat/completions');
        await page
          .getByTestId('wizard-input-description')
          .fill(
            'Direct integration with OpenAI GPT-4.1 for advanced conversational AI capabilities'
          );

        // Add headers from YAML
        await page.getByTestId('wizard-button-add-header').click();
        await page.getByTestId('wizard-input-header-key-0').fill('Authorization');
        await page.getByTestId('wizard-input-header-value-0').fill('Bearer {{openai_api_key}}');

        await page.getByTestId('wizard-button-add-header').click();
        await page.getByTestId('wizard-input-header-key-1').fill('Content-Type');
        await page.getByTestId('wizard-input-header-value-1').fill('application/json');

        // Add suggestion prompts from YAML (UI allows max 3, so we'll add first 3)
        const suggestionPrompts = [
          'Generate creative marketing copy for a new product launch',
          'Analyze complex data and provide strategic recommendations',
          'Write technical documentation for API endpoints',
          'Create personalized email templates for different customer segments',
          'Generate code solutions for specific programming challenges',
        ];

        // Add and fill the first prompt
        await page.getByTestId('wizard-button-add-suggestion-prompt').click();
        await expect(page.getByTestId('wizard-input-suggestion-prompt-0')).toBeVisible();
        await page.getByTestId('wizard-input-suggestion-prompt-0').fill(suggestionPrompts[0]);

        // Add and fill the second prompt
        await page.getByTestId('wizard-button-add-suggestion-prompt').click();
        await expect(page.getByTestId('wizard-input-suggestion-prompt-1')).toBeVisible();
        await page.getByTestId('wizard-input-suggestion-prompt-1').fill(suggestionPrompts[1]);

        // Add and fill the third prompt (max allowed is 3)
        await page.getByTestId('wizard-button-add-suggestion-prompt').click();
        await expect(page.getByTestId('wizard-input-suggestion-prompt-2')).toBeVisible();
        await page.getByTestId('wizard-input-suggestion-prompt-2').fill(suggestionPrompts[2]);

        // Verify the button is no longer visible (max 3 prompts reached)
        await expect(page.getByTestId('wizard-button-add-suggestion-prompt')).not.toBeVisible();

        // Go to Step 2: Field Mapping
        await page.getByTestId('wizard-button-next').click();
        await expect(page.getByTestId('wizard-step-title-field-mapping')).toBeVisible();
        // Note: Field mapping configuration from YAML is complex and would require
        // interacting with the MessageFormatMapper component. For now, we'll proceed
        // with defaults and the test will verify the model can be created.

        // Go to Step 3: Request Template - Match YAML request_schema
        await page.getByTestId('wizard-button-next').click();
        await expect(page.getByTestId('wizard-step-title-request-template')).toBeVisible();

        // Fill in request body template matching YAML request_schema
        // Convert YAML structure to use ${messages} template variable
        const bodyConfig = JSON.stringify(
          {
            model: 'gpt-4.1-turbo',
            messages: '${messages}',
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stream: false,
            user: '${user_id}',
          },
          null,
          2
        );
        await page.getByTestId('wizard-textarea-body-config').fill(bodyConfig);

        // Mock the API response to return a successful 200 status
        // This simulates a successful endpoint test without requiring an actual API key
        // Set up route interception BEFORE navigating to the test endpoint step
        await page.route('**/api/model', async route => {
          const request = route.request();
          if (request.method() === 'POST') {
            // Return a mock successful response that matches OpenAI format
            const mockResponse = {
              id: 'chatcmpl-test',
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: 'gpt-4.1-turbo',
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: 'This is a test response from the mocked endpoint.',
                  },
                  finish_reason: 'stop',
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 10,
                total_tokens: 20,
              },
            };

            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(mockResponse),
            });
          } else {
            await route.continue();
          }
        });

        // Go to Step 3: Response Handling - Set response path for webhook
        await page.getByTestId('wizard-button-next').click();
        await expect(page.getByTestId('wizard-step-title-response')).toBeVisible({
          timeout: 10000,
        });

        // Set response path matching YAML: "choices[0].message.content"
        await page.getByTestId('wizard-input-response-path').fill('choices[0].message.content');

        // Wait for extraction to complete (if test endpoint was run)
        await page.waitForTimeout(500);

        // Go to Step 4: Test Endpoint
        await page.getByTestId('wizard-button-next').click();
        await expect(page.getByTestId('wizard-step-title-test')).toBeVisible({
          timeout: 10000,
        });

        // The test endpoint step uses a different UI - it has a test message input and Send Test button
        // Set up route interception BEFORE clicking test button
        await page.route('**/api/test-model-endpoint', async route => {
          const request = route.request();
          if (request.method() === 'POST') {
            // Return a mock successful response that matches OpenAI format
            const mockResponse = {
              status: 200,
              statusText: 'OK',
              headers: {},
              body: JSON.stringify({
                id: 'chatcmpl-test',
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: 'gpt-4.1-turbo',
                choices: [
                  {
                    index: 0,
                    message: {
                      role: 'assistant',
                      content: 'This is a test response from the mocked endpoint.',
                    },
                    finish_reason: 'stop',
                  },
                ],
                usage: {
                  prompt_tokens: 10,
                  completion_tokens: 10,
                  total_tokens: 20,
                },
              }),
              responseTime: 100,
            };

            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(mockResponse),
            });
          } else {
            await route.continue();
          }
        });

        // Click the Send Test button (the test endpoint step uses a different button)
        const sendTestButton = page.getByRole('button', { name: /send test/i });
        await expect(sendTestButton).toBeVisible({ timeout: 10000 });
        await sendTestButton.click();

        // Wait for the test to complete - wait for final response to appear
        await expect(page.getByText(/final response/i)).toBeVisible({ timeout: 15000 });

        // Wait a bit more for any async state updates
        await page.waitForTimeout(500);

        // Verify the Next button is now enabled (response status should be 200)
        await expect(page.getByTestId('wizard-button-next')).toBeEnabled({ timeout: 5000 });

        // Wait for extraction to complete
        await page.waitForTimeout(1000);

        // If we have a response, the path should extract a value
        // If not (due to test endpoint failure), we'll set a mock value path
        // The wizard should still allow saving with a valid path structure

        // Save the model
        await page.getByTestId('wizard-button-save').click();

        // Wait for wizard to close completely
        // The wizard container should disappear
        await expect(page.getByTestId('wizard-container')).not.toBeVisible({ timeout: 10000 });

        // Verify we're still on the models page (wizard closes but stays on same page)
        await expect(page).toHaveURL(/.*\/admin.*/, { timeout: 5000 });

        // Verify the models tab content is visible (heading confirms we're on models tab)
        await expect(page.getByRole('heading', { name: 'AI Connections' })).toBeVisible({
          timeout: 10000,
        });

        // Wait for models grid to refresh after creation
        // addModel calls refreshModels() automatically, so wait for refresh to complete
        await page.waitForTimeout(1000); // Wait for refresh to start

        // Wait for loading grid to disappear (if it appears) or for models grid to be ready
        const loadingGrid = page.getByTestId('models-loading-grid');
        const modelsGrid = page.getByTestId('models-grid');

        // Check if loading grid appears (models are refreshing)
        const loadingCount = await loadingGrid.count();
        if (loadingCount > 0) {
          // Wait for loading to finish
          await expect(loadingGrid).not.toBeVisible({ timeout: 10000 });
        }

        // Ensure models grid is visible/attached
        await expect(modelsGrid).toBeAttached({ timeout: 10000 });

        // Verify the model was created with the exact name from YAML
        await verifyModelExists(page, manualModelName);
      } finally {
        // Always cleanup, regardless of test result
        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });

    test('should navigate through wizard steps', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        // Navigate to models tab
        await navigateToModelsTab(page);

        // Click the + button
        await page.getByTestId('model-add-button').click();

        // Step 1: Basic Info
        await expect(page.getByTestId('wizard-step-title-basic')).toBeVisible();
        await page.getByTestId('wizard-input-name').fill('Wizard Test Model');
        await page.getByTestId('wizard-input-endpoint').fill(testEndpoint);

        // Go to Step 2: Field Mapping
        await page.getByTestId('wizard-button-next').click();
        await expect(page.getByTestId('wizard-step-title-field-mapping')).toBeVisible();

        // Go to Step 3: Request Template
        await page.getByTestId('wizard-button-next').click();
        await expect(page.getByTestId('wizard-step-title-request-template')).toBeVisible();

        // Go back to Step 2
        await page.getByTestId('wizard-button-back').click();
        await expect(page.getByTestId('wizard-step-title-field-mapping')).toBeVisible();

        // Close wizard
        await page.keyboard.press('Escape');
      } finally {
        // Always cleanup, regardless of test result
        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });
  });

  test.describe('Model Deletion', () => {
    test('should show delete confirmation dialog', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let testModelId: string | null = null;
      let testModelNiceName: string | null = null;
      let orgId: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Setup: Create a model programmatically
        const dbModelId = `test-model-${Date.now()}`;
        testModelNiceName = generateTestModelName(testInfo, 'Test');
        testModelId = await createTestModel(
          orgId,
          dbModelId,
          testModelNiceName,
          'Test model for deletion'
        );
        // Navigate to models tab
        await navigateToModelsTab(page);

        // Get the model ID
        const modelId = await getModelIdByName(page, testModelNiceName);

        // Hover on the model card to reveal buttons
        await page.getByTestId(`model-card-${modelId}`).hover();

        // Click delete button using test ID
        await page.getByTestId(`model-delete-${modelId}`).click();

        // Verify confirmation dialog using test ID
        await expect(page.getByTestId('delete-model-dialog')).toBeVisible();
        await expect(page.getByText('Confirm Delete AI Connection')).toBeVisible();
        await expect(page.getByTestId('delete-model-confirm-input')).toBeVisible();

        // Cancel deletion using test ID
        await page.getByTestId('delete-model-cancel-button').click();
        await expect(page.getByTestId('delete-model-dialog')).not.toBeVisible();

        // Model should still exist
        await verifyModelExists(page, testModelNiceName!);
      } finally {
        // Always cleanup, regardless of test result
        if (testModelId && orgId) {
          try {
            await deleteTestModel(testModelId, orgId);
          } catch (error) {
            // Model may have been deleted by the test, that's okay
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });

    test('should require exact model name to delete', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let testModelId: string | null = null;
      let testModelNiceName: string | null = null;
      let orgId: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Setup: Create a model programmatically
        const dbModelId = `test-model-${Date.now()}`;
        testModelNiceName = generateTestModelName(testInfo, 'Test');
        testModelId = await createTestModel(
          orgId,
          dbModelId,
          testModelNiceName,
          'Test model for deletion'
        );
        // Navigate to models tab
        await navigateToModelsTab(page);

        // Get the model ID
        const modelId = await getModelIdByName(page, testModelNiceName);

        // Hover on the model card to reveal buttons
        await page.getByTestId(`model-card-${modelId}`).hover();

        // Click delete button
        await page.getByTestId(`model-delete-${modelId}`).click();

        // Try typing wrong name
        await page.getByTestId('delete-model-confirm-input').fill('Wrong Name');

        // Delete button should be disabled
        await expect(page.getByTestId('delete-model-confirm-button')).toBeDisabled();

        // Cancel and close
        await page.getByTestId('delete-model-cancel-button').click();
      } finally {
        // Always cleanup, regardless of test result
        if (testModelId && orgId) {
          try {
            await deleteTestModel(testModelId, orgId);
          } catch (error) {
            // Model may have been deleted by the test, that's okay
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });

    test('should delete model when correct name is entered', async ({
      page,
    }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let testModelId: string | null = null;
      let testModelNiceName: string | null = null;
      let orgId: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Setup: Create a model programmatically
        const dbModelId = `test-model-${Date.now()}`;
        testModelNiceName = generateTestModelName(testInfo, 'Test');
        testModelId = await createTestModel(
          orgId,
          dbModelId,
          testModelNiceName,
          'Test model for deletion'
        );

        // Test: Delete the model via UI
        await deleteModel(page, testModelNiceName);

        // Verify model no longer exists
        await verifyModelNotExists(page, testModelNiceName);
      } finally {
        // Always cleanup, regardless of test result
        if (testModelId && orgId) {
          try {
            await deleteTestModel(testModelId, orgId);
          } catch (error) {
            // Model may have been deleted by the test, that's okay
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });
  });

  test.describe('Model Export', () => {
    test('should have export button on model card', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let testModelId: string | null = null;
      let testModelNiceName: string | null = null;
      let orgId: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Setup: Create a model programmatically
        const dbModelId = `test-model-${Date.now()}`;
        testModelNiceName = generateTestModelName(testInfo, 'Test');
        testModelId = await createTestModel(
          orgId,
          dbModelId,
          testModelNiceName,
          'Test model for export'
        );
        // Navigate to models tab
        await navigateToModelsTab(page);

        // Get the model ID
        const modelId = await getModelIdByName(page, testModelNiceName);

        // Hover on the model card to reveal buttons
        await page.getByTestId(`model-card-${modelId}`).hover();

        // Export button should be visible using test ID
        await expect(page.getByTestId(`model-export-${modelId}`)).toBeVisible();
      } finally {
        // Always cleanup, regardless of test result
        if (testModelId && orgId) {
          try {
            await deleteTestModel(testModelId, orgId);
          } catch (error) {
            console.error('Failed to delete test model:', error);
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });
  });
});
