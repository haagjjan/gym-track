import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 768, 1440]) {
  test(`healthy showcase and activity at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/?fixture=healthy");
    await expect(page.locator("#overall-title")).toHaveText("GymTrack is operational");
    await expect(page.locator("#accounts-value")).toHaveText("8");
    await expect(page.locator("#recent-value")).toHaveText("23");
    await expect(page.locator("#weekly-chart rect")).toHaveCount(8);
    await page.getByText("Weekly counts and dates", { exact: true }).click();
    const bars = await page.locator("#weekly-chart rect").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-count")));
    const rows = await page.locator("#weekly-rows td").allTextContents();
    expect(bars).toEqual(rows);
    await expect(page.locator("#weekly-rows tr").last()).toContainText("partial");
    for (const image of await page.locator(".showcase img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBe(Number(await image.getAttribute("width")));
      const dimensions = await image.evaluate((node) => {
        const asset = node as HTMLImageElement;
        return { width: asset.naturalWidth, height: asset.naturalHeight };
      });
      expect(dimensions.height).toBe(Number(await image.getAttribute("height")));
      expect(dimensions.height / dimensions.width).toBeGreaterThan(1.8);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`showcase-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

for (const scenario of ["metrics-unavailable", "metrics-stale", "metrics-legacy", "metrics-empty", "metrics-malformed", "unconfigured", "outage", "build-future"]) {
  test(`independent evidence: ${scenario}`, async ({ page }) => {
    await page.goto(`/?fixture=${scenario}`);
    await expect(page.locator("#workouts-value")).toHaveText(scenario === "metrics-unavailable" || scenario === "metrics-stale" ? "—" : "105");
    await expect(page.getByRole("heading", { name: "Log the work. See your progress." })).toBeVisible();
    await expect(page.locator(".showcase img")).toHaveCount(3);
    if (scenario === "metrics-legacy") {
      await expect(page.locator("#accounts-label")).toHaveText("Enabled beta accounts");
      await expect(page.locator("#accounts-scope")).toContainText("Excludes administrators");
    }
    if (scenario === "metrics-malformed" || scenario === "metrics-legacy") {
      await expect(page.locator("#weekly-activity")).toBeHidden();
      await expect(page.locator("#activity-breakdown-notice")).toContainText("unavailable");
    }
    if (scenario === "metrics-empty") {
      await expect(page.locator("#recent-value")).toHaveText("0");
      await expect(page.locator("#weekly-summary")).toContainText("No completed workouts");
    }
    if (scenario === "unconfigured") await expect(page.locator("#overall-title")).toHaveText("Live status unavailable");
    if (scenario === "outage") await expect(page.locator("#overall-title")).toContainText("outage");
  });
}

test("keyboard access and static content without JavaScript", async ({ browser, page }) => {
  await page.goto("/?fixture=healthy");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto("http://127.0.0.1:4179/");
  await expect(staticPage.locator("#project-title")).toBeVisible();
  await expect(staticPage.locator(".showcase img")).toHaveCount(3);
  await expect(staticPage.locator("noscript p")).toContainText("JavaScript is required");
  await expect(staticPage.locator("#accounts-value")).toHaveText("—");
  await context.close();
});
