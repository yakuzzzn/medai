import { test, expect } from '@playwright/test';

test.describe('Draft Viewer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the draft viewer page
    await page.goto('/drafts/test-draft-id');
  });

  test('should display draft information correctly', async ({ page }) => {
    // Check that the draft title is displayed
    await expect(page.getByRole('heading', { name: 'Draft Note' })).toBeVisible();
    
    // Check that SOAP sections are displayed
    await expect(page.getByText('Subjective')).toBeVisible();
    await expect(page.getByText('Objective')).toBeVisible();
    await expect(page.getByText('Assessment')).toBeVisible();
    await expect(page.getByText('Plan')).toBeVisible();
  });

  test('should allow editing SOAP sections', async ({ page }) => {
    // Click edit button
    await page.getByRole('button', { name: 'Edit' }).click();
    
    // Check that textareas are now editable
    const subjectiveTextarea = page.locator('textarea').first();
    await expect(subjectiveTextarea).toBeVisible();
    
    // Edit the subjective section
    await subjectiveTextarea.fill('Patient reports chest pain for 2 days');
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Verify save success message
    await expect(page.getByText('Draft updated successfully')).toBeVisible();
  });

  test('should display confidence scores', async ({ page }) => {
    // Check that confidence indicators are displayed
    await expect(page.locator('[data-testid="confidence-indicator"]')).toBeVisible();
    
    // Check that confidence percentages are shown
    await expect(page.getByText(/^\d+%$/)).toBeVisible();
  });

  test('should sync to EHR', async ({ page }) => {
    // Click sync button
    await page.getByRole('button', { name: 'Sync to EHR' }).click();
    
    // Verify sync success message
    await expect(page.getByText('Draft synced to EHR successfully')).toBeVisible();
  });

  test('should display audio player', async ({ page }) => {
    // Check that audio player is displayed
    await expect(page.getByText('Audio Recording')).toBeVisible();
    
    // Check that play button is available
    await expect(page.getByRole('button', { name: /play/i })).toBeVisible();
  });

  test('should display coding suggestions', async ({ page }) => {
    // Check that coding section is displayed
    await expect(page.getByText('Coding Suggestions')).toBeVisible();
    
    // Check that ICD codes are shown
    await expect(page.getByText(/ICD-10 Codes/)).toBeVisible();
    
    // Check that Rx codes are shown
    await expect(page.getByText(/RxNorm Codes/)).toBeVisible();
  });

  test('should display raw transcript', async ({ page }) => {
    // Check that transcript section is displayed
    await expect(page.getByText('Raw Transcript')).toBeVisible();
    
    // Check that word error rate is shown
    await expect(page.getByText(/Word Error Rate/)).toBeVisible();
    
    // Check that confidence score is shown
    await expect(page.getByText(/Confidence/)).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Navigate to a non-existent draft to test loading
    await page.goto('/drafts/non-existent-draft');
    
    // Check that loading spinner is displayed
    await expect(page.locator('.animate-spin')).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Mock API error and navigate
    await page.route('**/api/v1/drafts/**', route => 
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    
    await page.goto('/drafts/test-draft-id');
    
    // Check that error message is displayed
    await expect(page.getByText('Failed to load draft')).toBeVisible();
  });
}); 