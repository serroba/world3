import { expect, test, devices } from "@playwright/test";

const iPhone = devices["iPhone 13"];

test.describe("mobile experience", () => {
  test.use({ ...iPhone });

  test("homepage loads and nav is accessible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav.site-nav")).toBeVisible();
    await expect(page.locator(".site-nav__brand")).toBeVisible();

    // Nav links should be horizontally scrollable, not overflowing the viewport
    const body = page.locator("body");
    const bodyBox = await body.boundingBox();
    expect(bodyBox!.width).toBeLessThanOrEqual(iPhone.viewport!.width + 1);
  });

  test("explore view renders charts without horizontal overflow", async ({ page }) => {
    await page.goto("/#explore?preset=standard-run&view=combined");
    await page.waitForSelector("#explore-charts canvas");
    await expect(page.locator("#explore-charts canvas")).toHaveCount(1);

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("model page sections render and pills are tappable", async ({ page }) => {
    await page.goto("/#model");
    await page.waitForSelector(".model-section");
    const sections = page.locator(".model-section");
    await expect(sections).not.toHaveCount(0);

    // Nav pills should be visible and tappable
    const pills = page.locator(".model-nav-pill");
    await expect(pills.first()).toBeVisible();
    const pillBox = await pills.first().boundingBox();
    expect(pillBox!.height).toBeGreaterThanOrEqual(40);
  });

  test("advanced view input rows are usable on mobile", async ({ page }) => {
    await page.goto("/#advanced");
    await page.waitForSelector("#advanced-charts canvas");

    // Open first accordion
    const firstAccordion = page.locator("details.accordion").first();
    if ((await firstAccordion.getAttribute("open")) === null) {
      await firstAccordion.locator("summary").click();
    }

    // Number inputs should not overflow the viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("compare view table scrolls horizontally without page overflow", async ({ page }) => {
    await page.goto("/#compare");
    await page.waitForFunction(
      () => document.querySelectorAll("#compare-select-a option").length > 0,
    );
    await page.locator("#compare-select-a").selectOption({ index: 0 });
    await page.locator("#compare-select-b").selectOption({ index: 1 });
    await page.waitForSelector("#compare-metrics tr, #compare-metrics .metric-row");

    // Table should be inside a scroll wrapper
    const scrollWrapper = page.locator("#compare-metrics .table-scroll");
    await expect(scrollWrapper).toHaveCount(1);

    // Page itself should not have horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
