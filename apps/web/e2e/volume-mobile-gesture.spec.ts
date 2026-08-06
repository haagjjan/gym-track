import { expect, test, type CDPSession } from "@playwright/test";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { height: 900, width: 390 }
});

test("lets a mobile swipe scroll from the 3D Volume figure while sideways drag still orbits", async ({ browserName, page }) => {
  test.skip(browserName !== "chromium", "Raw gesture injection uses the Chromium DevTools Protocol.");
  const tag = `${Date.now()}${process.pid}`;
  const username = `volume_${tag}`;

  await page.goto("/signup");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/EMAIL_ADDRESS/).fill(`volume_${tag}@example.com`);
  await page.getByLabel(/OPERATOR_ID/).fill(username);
  await page.getByLabel(/ACCESS_CODE/).fill("volume-passphrase-1");
  await page.getByRole("button", { name: "REGISTER" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();

  await page.goto("/weekly-volume");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
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
