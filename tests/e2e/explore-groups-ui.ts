/**
 * Quick script to explore the Groups page UI and find correct selectors
 */

import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env files
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Check .env.test file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function exploreGroupsUI() {
  console.log('🔍 Exploring Groups UI...\n');

  // Sign in
  const email = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
  const password = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.session) {
    throw new Error(`Login failed: ${error?.message}`);
  }

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Inject session
  const projectId = '127';
  const tokenKey = `sb-${projectId}-auth-token`;
  await context.addCookies([
    {
      name: tokenKey,
      value: JSON.stringify(authData.session),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.goto('http://localhost:3000/404');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: tokenKey,
    value: JSON.stringify(authData.session),
  });

  // Navigate to admin
  await page.goto('http://localhost:3000/admin');
  await page.waitForTimeout(2000);

  console.log('📍 Current URL:', page.url());

  // Find Groups tab
  console.log('\n🔎 Looking for Groups tab...');
  const groupsTab = page.getByRole('tab', { name: /groups/i });
  const isVisible = await groupsTab.isVisible().catch(() => false);
  console.log('Groups tab visible:', isVisible);

  if (isVisible) {
    await groupsTab.click();
    await page.waitForTimeout(1000);
  }

  // Explore the page
  console.log('\n📄 Page Title:', await page.title());

  // Find all headings
  console.log('\n📋 Headings on page:');
  const headings = await page.locator('h1, h2, h3, h4').allTextContents();
  headings.forEach((h, i) => console.log(`  ${i + 1}. "${h}"`));

  // Find all buttons
  console.log('\n🔘 Buttons on page:');
  const buttons = page.getByRole('button');
  const buttonCount = await buttons.count();
  console.log(`Found ${buttonCount} buttons:`);

  for (let i = 0; i < Math.min(buttonCount, 10); i++) {
    const button = buttons.nth(i);
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    const testId = await button.getAttribute('data-testid');
    const isVisible = await button.isVisible();

    console.log(
      `  ${i + 1}. Text: "${text?.trim() || '(empty)'}" | aria-label: "${ariaLabel || '(none)'}" | testid: "${testId || '(none)'}" | visible: ${isVisible}`
    );
  }

  // Find the Add button specifically
  console.log('\n🔍 Looking for Add/Plus button near "Groups" heading...');
  const groupsHeading = page.getByRole('heading', { name: 'Groups' });
  const headingVisible = await groupsHeading.isVisible().catch(() => false);
  console.log('Groups heading visible:', headingVisible);

  if (headingVisible) {
    // Get the parent container
    const container = groupsHeading.locator('..');
    const containerHTML = await container.innerHTML().catch(() => 'Could not get HTML');
    console.log('\n📝 Container HTML around "Groups" heading:');
    console.log(containerHTML.substring(0, 500) + '...');

    // Find buttons in container
    const containerButtons = container.getByRole('button');
    const containerButtonCount = await containerButtons.count();
    console.log(`\nFound ${containerButtonCount} buttons in container`);

    for (let i = 0; i < containerButtonCount; i++) {
      const btn = containerButtons.nth(i);
      const text = await btn.textContent();
      const html = await btn.innerHTML().catch(() => '(error)');
      console.log(`  Button ${i + 1}:`);
      console.log(`    Text: "${text?.trim() || '(empty)'}"`);
      console.log(`    HTML: ${html.substring(0, 100)}...`);
    }
  }

  // Check if there's an empty state
  console.log('\n🔍 Checking for empty state...');
  const emptyState = page.getByText('No groups found');
  const emptyVisible = await emptyState.isVisible().catch(() => false);
  console.log('Empty state visible:', emptyVisible);

  if (emptyVisible) {
    console.log('✅ Page is showing empty state - good for testing!');
  }

  console.log('\n✅ Exploration complete! Browser will stay open for 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
}

exploreGroupsUI().catch(console.error);
