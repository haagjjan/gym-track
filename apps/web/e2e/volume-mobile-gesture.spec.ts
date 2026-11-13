import { expect, test, type CDPSession } from "@playwright/test";

// A phone: touch, coarse pointer, and short enough that a new account's
// Volume page (no data, compact stage) still has room to scroll.
test.use({ hasTouch: true, isMobile: true, viewport: { height: 640, width: 390 } });

test("lets a mobile swipe scroll from the 3D Volume figure while sideways drag still orbits", async ({ browserName, page }) => {
  test.skip(browserName !== "chromium", "Raw gesture injection uses the Chromium DevTools Protocol.");
  const tag = `${Date.now()}${process.pid}`;
  const username = `volume_${tag}`;

  await page.goto("/signup");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/Email address/i).fill(`volume_${tag}@example.com`);
  await page.getByLabel(/^Username$/i).fill(username);
  await page.getByLabel(/^Password \(at least 10 characters\)$/i).fill("volume-passphrase-1");
  await page.getByLabel(/at least 18 and live in Switzerland/i).check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();

  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.getByRole("button", { name: "Save settings on this device" }).click();
  await page.goto("/weekly-volume");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  // Native vertical scrolling keeps browser momentum and cancellation.
  await expect.poll(() => canvas.evaluate((element) => getComputedStyle(element).touchAction)).toBe("pan-y");

  const client = await page.context().newCDPSession(page);
  const initialBox = await canvas.boundingBox();
  expect(initialBox).not.toBeNull();
  const x = (initialBox?.x ?? 0) + (initialBox?.width ?? 0) / 2;
  const startY = (initialBox?.y ?? 0) + (initialBox?.height ?? 0) * 0.75;
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await swipe(client, { x, y: startY }, { x, y: startY - 220 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore + 40);

  await canvas.scrollIntoViewIfNeeded();
  const orbitBox = await canvas.boundingBox();
  expect(orbitBox).not.toBeNull();
  const orbitY = (orbitBox?.y ?? 0) + (orbitBox?.height ?? 0) * 0.5;
  const orbitStartX = (orbitBox?.x ?? 0) + (orbitBox?.width ?? 0) * 0.35;
  const orbitEndX = (orbitBox?.x ?? 0) + (orbitBox?.width ?? 0) * 0.7;
  const orbitScrollBefore = await page.evaluate(() => window.scrollY);
  const imageBefore = await canvas.screenshot();

  await swipe(client, { x: orbitStartX, y: orbitY }, { x: orbitEndX, y: orbitY });
  await page.waitForTimeout(300);
  const imageAfter = await canvas.screenshot();
  const orbitScrollAfter = await page.evaluate(() => window.scrollY);

  expect(Math.abs(orbitScrollAfter - orbitScrollBefore)).toBeLessThan(8);
  expect(imageAfter.equals(imageBefore), "sideways drag should change the rendered camera view").toBe(false);

  // A real skinned-mesh hit must select a region and show its count.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/analytics/weekly-volume**", (route) => route.fulfill({ json: { data: {
    weeks: [{ weekStart: "2026-11-09", weekEnd: "2026-11-15", items: [{
      muscleGroup: { id: "chest", slug: "chest", name: "Chest" }, workingSets: 6, exercises: [], recentSessions: []
    }], regionItems: ["chest", "lats"].map((slug) => ({
      muscleRegion: { id: slug, slug, name: slug === "chest" ? "Chest" : "Lats", muscleGroupSlug: slug === "chest" ? "chest" : "back" },
      workingSets: 6, exercises: [], recentSessions: []
    })) }]
  } } }));
  await page.reload();
  await expect(page.getByRole("button", { name: "Chest 6", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Muscle figure" })).toHaveAttribute("aria-busy", "false");
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await canvas.scrollIntoViewIfNeeded();
  const frontBox = (await canvas.boundingBox())!;
  await page.touchscreen.tap(frontBox.x + frontBox.width * 0.46, frontBox.y + frontBox.height * 0.29);
  const selected = page.getByRole("region", { name: "Selected muscle" });
  await expect(selected.getByRole("heading", { name: "Chest", exact: true })).toBeVisible();
  await expect(selected.getByRole("definition").filter({ hasText: /^6sets$/ })).toBeVisible();
  await page.getByRole("button", { name: "Close Chest", exact: true }).click();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.getByRole("radio", { name: "Back", exact: true }).click();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const backBox = (await canvas.boundingBox())!;
  await page.touchscreen.tap(backBox.x + backBox.width * 0.47, backBox.y + backBox.height * 0.35);
  await expect(selected.getByRole("heading", { name: "Lats", exact: true })).toBeVisible();

});

async function swipe(
  client: CDPSession,
  start: { x: number; y: number },
  end: { x: number; y: number }
): Promise<void> {
  await client.send("Input.dispatchTouchEvent", {
    touchPoints: [{ x: start.x, y: start.y }],
    type: "touchStart"
  });

  for (let step = 1; step <= 6; step += 1) {
    const fraction = step / 6;
    await client.send("Input.dispatchTouchEvent", {
      touchPoints: [{
        x: start.x + (end.x - start.x) * fraction,
        y: start.y + (end.y - start.y) * fraction
      }],
      type: "touchMove"
    });
    await new Promise((resolve) => setTimeout(resolve, 16));
  }

  await client.send("Input.dispatchTouchEvent", {
    touchPoints: [],
    type: "touchEnd"
  });
}
