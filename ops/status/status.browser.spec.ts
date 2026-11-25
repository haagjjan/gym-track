import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function stubDemoEmbed(page: import("@playwright/test").Page) {
  await page.route("https://app.gymtrack.ch/demo**", (route) => route.abort());
}

for (const width of [390, 768, 1440]) {
  test(`healthy showcase, timelines and activity at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await stubDemoEmbed(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/?fixture=healthy");
    await expect(page.locator("#overall-title")).toHaveText("GymTrack is operational");
    await expect(page.locator(".about-app")).toContainText("What it does well");
    await expect(page.locator(".about-app")).toContainText("Who it is for");
    await expect(page.locator(".about-app")).toContainText("Why I built it");
    await expect(page.locator("#accounts-value")).toHaveText("8");
    await expect(page.locator("#sets-value")).toHaveText("1,248");
    await expect(page.locator('[data-component="api-and-database"] h3')).toContainText("Public metrics endpoint");
    await expect(page.locator('[data-component="web-application"] .service-uptime')).toHaveText("100.00%");
    await expect(page.locator('[data-component="api-and-database"] .service-uptime')).toHaveText("99.93%");

    // Default 30d segmented timeline, plus 7d and 90d switching and day click inspection.
    const apiCard = page.locator('[data-component="api-and-database"]');
    await expect(apiCard.locator(".timeline-day")).toHaveCount(30);
    await expect(apiCard.locator(".timeline-from")).toHaveText("30 days ago");
    await apiCard.locator('.timeline-day[data-day-state="degraded"]').click();
    await expect(apiCard.locator(".timeline-inspector")).toBeVisible();
    await expect(apiCard.locator(".inspector-status")).toHaveText("Degraded");
    await expect(apiCard.locator(".inspector-detail")).toContainText("Downtime: 3 min");

    await page.getByRole("button", { name: "7d", exact: true }).click();
    await expect(apiCard.locator(".timeline-day")).toHaveCount(7);
    await expect(apiCard.locator(".timeline-from")).toHaveText("7 days ago");

    await page.getByRole("button", { name: "90d", exact: true }).click();
    await expect(apiCard.locator(".timeline-day")).toHaveCount(90);
    await expect(apiCard.locator(".timeline-from")).toHaveText("90 days ago");

    await page.getByRole("button", { name: "30d", exact: true }).click();
    await expect(apiCard.locator(".timeline-day")).toHaveCount(30);

    await expect(page.locator("#weekly-chart rect")).toHaveCount(8);
    await page.getByText("Weekly counts and dates", { exact: true }).click();
    const bars = await page.locator("#weekly-chart rect").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-count")));
    const rows = await page.locator("#weekly-rows td").allTextContents();
    expect(bars).toEqual(rows);
    await expect(page.locator("#weekly-rows tr").last()).toContainText("partial");

    await expect(page.locator(".phone-device #app-preview-frame")).toHaveAttribute("src", "https://app.gymtrack.ch/demo");
    await expect(page.locator("#preview-fallback-image")).toHaveAttribute("src", "./images/workout.webp");
    await page.getByRole("button", { name: "Progress" }).click();
    await expect(page.locator("#app-preview-frame")).toHaveAttribute("src", "https://app.gymtrack.ch/demo/progress");
    await expect(page.locator("#preview-fallback-image")).toHaveAttribute("src", "./images/progress.webp");
    await expect(page.locator("#phone-screen")).toHaveAttribute("data-preview-state", "fallback", { timeout: 8_000 });
    await expect(page.locator("#preview-retry")).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const accessibility = await new AxeBuilder({ page }).exclude("#app-preview-frame").analyze();
    expect(accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`showcase-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

for (const scenario of ["metrics-unavailable", "metrics-stale", "metrics-legacy", "metrics-empty", "metrics-malformed", "unconfigured", "outage", "build-future"]) {
  test(`independent evidence: ${scenario}`, async ({ page }) => {
    await stubDemoEmbed(page);
    await page.goto(`/?fixture=${scenario}`);
    await expect(page.locator("#workouts-value")).toHaveText(scenario === "metrics-unavailable" || scenario === "metrics-stale" ? "—" : "105");
    await expect(page.getByRole("heading", { name: "Log the work. See your progress." })).toBeVisible();
    await expect(page.locator("#app-preview-frame")).toHaveAttribute("src", "https://app.gymtrack.ch/demo");
    if (scenario === "metrics-legacy") {
      await expect(page.locator("#accounts-label")).toHaveText("Enabled beta accounts");
      await expect(page.locator("#accounts-scope")).toContainText("Excludes administrators");
      await expect(page.locator("#sets-value")).toHaveText("—");
    }
    if (scenario === "metrics-malformed" || scenario === "metrics-legacy") {
      await expect(page.locator("#weekly-activity")).toBeHidden();
      await expect(page.locator("#activity-breakdown-notice")).toContainText("unavailable");
    }
    if (scenario === "metrics-empty") {
      await expect(page.locator("#sets-value")).toHaveText("0");
      await expect(page.locator("#weekly-summary")).toContainText("No completed workouts");
    }
    if (scenario === "unconfigured") {
      await expect(page.locator("#overall-title")).toHaveText("Live status unavailable");
      await expect(page.locator('[data-component="web-application"] .service-uptime')).toBeHidden();
    }
    if (scenario === "outage") await expect(page.locator("#overall-title")).toContainText("outage");
  });
}

test("keyboard access and static content without JavaScript", async ({ browser, page }) => {
  await stubDemoEmbed(page);
  await page.goto("/?fixture=healthy");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await stubDemoEmbed(staticPage);
  await staticPage.goto("http://127.0.0.1:4179/");
  await expect(staticPage.locator("#project-title")).toBeVisible();
  await expect(staticPage.locator(".about-app")).toBeVisible();
  await expect(staticPage.locator("#app-preview-frame")).toBeVisible();
  await expect(staticPage.locator("noscript p")).toContainText("JavaScript is required");
  await expect(staticPage.locator("#accounts-value")).toHaveText("—");
  await context.close();
});

test("reveals live embedded preview on demo-ready handshake", async ({ page }) => {
  await page.route("https://app.gymtrack.ch/demo**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><html><body><script>const send=()=>window.parent.postMessage({type:"gymtrack:demo-ready",path:"/demo/volume"},"*");window.addEventListener("message",(e)=>{if(e.data&&e.data.type==="gymtrack:demo-ping")send();});send();</script><p>Demo ready</p></body></html>`
    })
  );
  await page.goto("/?fixture=healthy");
  await page.locator("#phone-screen").scrollIntoViewIfNeeded();
  await expect(page.locator("#phone-screen")).toHaveAttribute("data-preview-state", "live");
  await expect(page.locator("#preview-fallback")).toBeHidden();
  await expect(page.getByRole("button", { name: "Volume" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#preview-open-link")).toHaveAttribute("href", "https://app.gymtrack.ch/demo/volume");
});
