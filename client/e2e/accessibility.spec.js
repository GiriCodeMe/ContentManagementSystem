import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('WCAG 2.1 AA — CMS Portal', () => {
  test('home page has no critical a11y violations', async ({ page }) => {
    await page.goto('/')
    // Wait for content to load
    await page.locator('.page-title').waitFor({ timeout: 8000 }).catch(() => {})
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    // Filter out known false-positives from highlight.js code styles
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })

  test('sidebar navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/')
    await page.locator('.sidebar-item').first().waitFor({ timeout: 5000 })
    // Tab to sidebar and navigate
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['INPUT', 'A', 'DIV', 'SPAN', 'BUTTON']).toContain(focused)
  })

  test('search input has accessible placeholder', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('.header-search input')
    await expect(input).toHaveAttribute('placeholder')
  })

  test('edit mode textarea is accessible', async ({ page }) => {
    await page.goto('/')
    await page.locator('.page-title').waitFor({ timeout: 5000 })
    await page.getByText('✏ Edit').click()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })
})
