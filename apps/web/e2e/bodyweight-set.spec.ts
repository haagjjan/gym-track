import { expect, test } from "@playwright/test";

/** A bodyweight set is logged with 0 kg, and History links to the workout library. */
test.setTimeout(120_000);

test("logs a 0 kg set and reaches templates and exercises from History", async ({ page }) => {
  const username = `bw_${Date.now()}${process.pid}`;

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/signup");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/Email address/i).fill(`${username}@example.com`);
  await page.getByLabel(/^Username$/i).fill(username);
  await page.getByLabel(/^Password \(at least 10 characters\)$/i).fill("bodyweight-passphrase-1");
  await page.getByLabel(/at least 18 and live in Switzerland/i).check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await page.getByRole("region", { name: "Try the example" }).getByRole("button", { name: "Not now", exact: true }).click();
  await page.getByRole("dialog", { name: "Device storage choice" }).getByRole("button", { name: "Save settings on this device" }).click();

  await page.goto("/workout");
  await page.getByRole("button", { name: "Start empty workout", exact: true }).click();
  await page.getByRole("button", { name: "Add exercises" }).click();
  const picker = page.getByRole("dialog", { name: "Choose exercises" });
  await picker.getByRole("searchbox", { name: "Search exercises" }).fill("Pull Up");
  await picker.getByRole("button", { name: /Pull.?Up/i }).first().click();
  await page.getByRole("button", { name: "Add selected exercises (1)" }).click();

  await page.getByRole("button", { name: "Add set" }).click();
  await page.locator('input[inputmode="decimal"]').first().fill("0");
  await page.getByRole("button", { name: "Save set" }).click();
  await expect(page.getByRole("button", { name: /^Set 1: 0 kg × \d+/ })).toBeVisible();

  await page.goto("/workouts");
  const library = page.getByRole("navigation", { name: "Workout library" });
  await library.getByRole("link", { name: "Templates", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts\/templates$/);
  await page.goto("/workouts");
  await library.getByRole("link", { name: "Exercises", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts\/exercises$/);
});
