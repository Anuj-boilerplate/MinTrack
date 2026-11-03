import { test, expect } from '@playwright/test';
import { createMockDatabase, setupMockSupabase } from './mockSupabase';

test.describe('MinTrack Application Full Scan', () => {

  test('01 - Auth Screen (Unauthenticated View)', async ({ page }) => {
    const db = createMockDatabase();
    await setupMockSupabase(page, db, { authenticated: false });

    await page.goto('/');

    // Check main auth elements
    await expect(page.locator('h1')).toContainText('MinTrack Cloud Sync');
    await expect(page.locator('button', { hasText: 'Continue with Google' })).toBeVisible();
    await expect(page.locator('label[for="email-input"]')).toContainText('Email Address');
    await expect(page.locator('#email-input')).toBeVisible();

    await page.screenshot({ path: 'screenshots/01-auth-screen.png', fullPage: true });
  });

  test('02 - Onboarding / Term Setup Screen', async ({ page }) => {
    const db = createMockDatabase({
      profile: { id: '11111111-2222-3333-4444-555555555555', term_start_date: null, term_end_date: null }
    });
    await setupMockSupabase(page, db, { authenticated: true });

    await page.goto('/');

    // Check setup screen elements
    await expect(page.locator('#setup-screen')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(page.locator('button', { hasText: 'Start Term' })).toBeVisible();

    await page.screenshot({ path: 'screenshots/02-setup-screen.png', fullPage: true });

    // Select start date via custom DatePicker popover
    await page.locator('#term-start').click();
    await expect(page.locator('.datepicker-popover')).toBeVisible();
    await page.locator('button.datepicker-day-cell:not(.empty)').first().click();

    // Select end date via custom DatePicker popover
    await page.locator('#term-end').click();
    await expect(page.locator('.datepicker-popover')).toBeVisible();
    // Advance month to ensure end date is after start date
    await page.locator('.datepicker-nav-btn').last().click();
    await page.locator('button.datepicker-day-cell:not(.empty)').last().click();

    await page.locator('button', { hasText: 'Start Term' }).click();

    // Verify transition into main app
    await expect(page.locator('.home-wordmark')).toContainText('MinTrack');
  });

  test('03 - Home Dashboard (Goals, Coverflow & Add Goal Modal)', async ({ page }) => {
    const db = createMockDatabase();
    await setupMockSupabase(page, db, { authenticated: true });

    await page.goto('/');

    // Verify main app dashboard
    await expect(page.locator('.coverflow-container')).toBeVisible();
    await expect(page.locator('text=Linear Algebra').first()).toBeVisible();
    await expect(page.locator('text=Algorithms & Data Structures').first()).toBeVisible();

    await page.screenshot({ path: 'screenshots/03-home-dashboard.png', fullPage: true });

    // Open Add Subject Modal
    await page.locator('button.coverflow-add-btn, button[aria-label="Add Goal"]').first().click();
    await expect(page.locator('#add-subject-modal')).toBeVisible();
    await expect(page.locator('#subject-name')).toBeVisible();

    await page.screenshot({ path: 'screenshots/04-add-goal-modal.png' });

    // Add new goal
    await page.locator('#subject-name').fill('Quantum Computing');
    await page.locator('#target-hours').fill('45');
    await page.locator('button', { hasText: 'Add Goal' }).click();

    // Modal closes and new goal appears in state
    await expect(page.locator('#add-subject-modal')).not.toBeVisible();
    expect(db.subjects.some(s => s.name === 'Quantum Computing')).toBe(true);
  });

  test('04 - Task Runway (TodoScreen, Inline Add, Completion Trail)', async ({ page }) => {
    const db = createMockDatabase();
    await setupMockSupabase(page, db, { authenticated: true });

    await page.goto('/');

    // Switch to Tasks Tab
    await page.locator('button', { hasText: 'To-Do' }).click();
    await expect(page.locator('#todo-screen')).toBeVisible();

    // Verify existing tasks
    await expect(page.locator('text=Complete Problem Set 4').first()).toBeVisible();
    await expect(page.locator('text=Read Graph Theory Chapter 6').first()).toBeVisible();

    await page.screenshot({ path: 'screenshots/05-todo-runway.png', fullPage: true });

    // Click "+ What needs doing?" in the active runway column
    const addBtn = page.locator('.runway-col--active button', { hasText: 'What needs doing?' });
    await addBtn.click();
    const taskInput = page.locator('.runway-col--active input[placeholder="What needs to be done?"]');
    await expect(taskInput).toBeVisible();

    await taskInput.fill('Review Midterm Exam Questions');
    await taskInput.press('Enter');

    await expect(page.locator('text=Review Midterm Exam Questions').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/06-todo-with-new-task.png', fullPage: true });
  });

  test('05 - Focus Timer & Review (TimerScreen, Pomodoro Config, Review Modal)', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    const db = createMockDatabase();
    await setupMockSupabase(page, db, { authenticated: true });

    await page.goto('/');

    // Wait for coverflow to settle
    await expect(page.locator('.coverflow-container')).toBeVisible();
    await page.waitForTimeout(1000);

    // Click "Start session" on the active card
    const startBtn = page.locator('.coverflow-card.active button', { hasText: 'Start session' });
    await expect(startBtn).toBeVisible();
    await startBtn.dispatchEvent('click');

    // Check if modal opens
    await expect(page.locator('#pomodoro-modal')).toBeVisible();
    await expect(page.locator('text=Configure Session')).toBeVisible();
    await expect(page.locator('text=Standard')).toBeVisible();
    await expect(page.locator('text=Deep Work')).toBeVisible();

    await page.screenshot({ path: 'screenshots/07-pomodoro-config-modal.png' });

    // Start Session from the modal
    await page.locator('#pomodoro-modal button', { hasText: 'Start Session' }).click();

    // Verify Timer Screen
    await expect(page.locator('#timer-screen')).toBeVisible();
    await expect(page.locator('#timer-display')).toBeVisible();
    await expect(page.locator('text=Focus Phase')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Pause' })).toBeVisible();

    await page.screenshot({ path: 'screenshots/08-active-timer-screen.png', fullPage: true });

    // Click Stop button to transition to review
    await page.locator('#stop-timer-btn').click();

    // Verify Session Review Modal
    await expect(page.locator('#session-review-modal')).toBeVisible();
    await expect(page.locator('#review-tracked-time')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Count It' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Discard' })).toBeVisible();

    await page.screenshot({ path: 'screenshots/09-session-review-modal.png' });

    // Save session
    await page.locator('button', { hasText: 'Count It' }).click();
    await expect(page.locator('#session-review-modal')).not.toBeVisible();
  });

  test('06 - Analytics / Digest Screen', async ({ page }) => {
    const db = createMockDatabase();
    await setupMockSupabase(page, db, { authenticated: true });

    await page.goto('/');

    // Switch to Digest tab
    await page.locator('button', { hasText: 'Digest' }).click();
    await expect(page.locator('#digest-screen')).toBeVisible();
    await expect(page.locator('h1', { hasText: 'The Digest' })).toBeVisible();
    await expect(page.locator('text=Cumulative hours')).toBeVisible();

    await page.screenshot({ path: 'screenshots/10-analytics-screen.png', fullPage: true });
  });

  test('07 - Settings Modal, Session History & Theme Switcher', async ({ page }) => {
    const db = createMockDatabase();
    await setupMockSupabase(page, db, { authenticated: true });

    await page.goto('/');

    // Open Settings
    await page.locator('button[title="Settings"]').click();
    await expect(page.locator('#settings-modal')).toBeVisible();
    await expect(page.locator('text=Session History')).toBeVisible();
    await expect(page.locator('text=Clear All Data')).toBeVisible();
    await expect(page.locator('text=Smart Date Recognition')).toBeVisible();

    await page.screenshot({ path: 'screenshots/11-settings-modal.png' });

    // Open Session History
    await page.locator('button', { hasText: 'Session History' }).click();
    await expect(page.locator('h2', { hasText: 'Session History' })).toBeVisible();
    await expect(page.locator('text=Linear Algebra').first()).toBeVisible();

    await page.screenshot({ path: 'screenshots/12-session-history-modal.png' });

    // Close History Modal using the close button in the modal pane
    await page.locator('.modal-pane button').first().click();
    await expect(page.locator('h2', { hasText: 'Session History' })).not.toBeVisible();

    // Test Theme Toggle from TopBar
    const themeBtn = page.locator('button.theme-toggle-svg-btn');
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(600); // Wait for transition overlay animation
      await page.screenshot({ path: 'screenshots/13-light-theme.png', fullPage: true });
    }
  });

});
