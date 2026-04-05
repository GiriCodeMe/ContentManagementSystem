import { test, expect } from '@playwright/test'

test.describe('CMS Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows EPAM blue header with title', async ({ page }) => {
    await expect(page.locator('.header')).toBeVisible()
    await expect(page.getByText('TechVision Knowledge Base')).toBeVisible()
  })

  test('search input is present in header', async ({ page }) => {
    await expect(page.locator('.header-search input')).toBeVisible()
  })

  test('sidebar is visible with categories', async ({ page }) => {
    await expect(page.locator('.sidebar')).toBeVisible()
    // At least one category header should appear after pages load
    await expect(page.locator('.sidebar-section-header').first()).toBeVisible({ timeout: 5000 })
  })

  test('first page loads automatically', async ({ page }) => {
    // After load, a page title should appear in the content area
    await expect(page.locator('.page-title')).toBeVisible({ timeout: 5000 })
  })

  test('clicking a sidebar page loads its content', async ({ page }) => {
    await page.locator('.sidebar-item').nth(1).click()
    await expect(page.locator('.page-title')).toBeVisible({ timeout: 5000 })
  })

  test('metadata bar shows word count and reading time', async ({ page }) => {
    await expect(page.locator('.page-meta-bar')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.page-meta-bar')).toContainText('words')
    await expect(page.locator('.page-meta-bar')).toContainText('min read')
  })

  test('breadcrumbs show Home and category', async ({ page }) => {
    await expect(page.locator('.breadcrumbs')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.breadcrumbs')).toContainText('Home')
  })

  test('tag chips appear in the sidebar', async ({ page }) => {
    await expect(page.locator('.sidebar-tags .tag').first()).toBeVisible({ timeout: 5000 })
  })

  test('clicking a tag filters the page list', async ({ page }) => {
    await page.locator('.sidebar-tags .tag').first().click()
    const tag = page.locator('.sidebar-tags .tag.active')
    await expect(tag).toBeVisible()
  })

  test('searching shows results in sidebar', async ({ page }) => {
    await page.locator('.header-search input').fill('cloud')
    await expect(page.locator('.search-result').first()).toBeVisible({ timeout: 5000 })
  })

  test('clicking search result navigates to page', async ({ page }) => {
    await page.locator('.header-search input').fill('cloud')
    await page.locator('.search-result').first().click()
    await expect(page.locator('.page-title')).toBeVisible({ timeout: 5000 })
  })

  test('edit button opens edit textarea', async ({ page }) => {
    await expect(page.locator('.page-title')).toBeVisible({ timeout: 5000 })
    await page.getByText('✏ Edit').click()
    await expect(page.locator('.edit-textarea')).toBeVisible()
  })

  test('cancel returns to read mode', async ({ page }) => {
    await expect(page.locator('.page-title')).toBeVisible({ timeout: 5000 })
    await page.getByText('✏ Edit').click()
    await page.getByText('Cancel').click()
    await expect(page.locator('.edit-textarea')).not.toBeVisible()
  })

  test('Table of Contents appears for pages with headings', async ({ page }) => {
    await expect(page.locator('.toc')).toBeVisible({ timeout: 5000 })
  })
})
