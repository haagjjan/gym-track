import { expect, test } from "@playwright/test";
import { trackingProgressFixture } from "./tracking-progress-fixture";
import { expectNoSeriousAccessibilityViolations } from "./accessibility-assertions";

test.skip(process.env.TEST_EXTENDED_TRACKING !== "true", "Requires an isolated API/web pair with ENABLE_EXTENDED_TRACKING=true.");
test.setTimeout(180_000);
test.use({ actionTimeout: 15000, reducedMotion: "reduce" });
test("logs, edits and reviews time sets and cardio without counting cardio as muscle volume", async ({ page }) => {
  const tag = `timed_${Date.now()}${process.pid}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/signup");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/Email address/i).fill(`${tag}@example.test`);
  await page.getByLabel(/^Username$/i).fill(tag);
  await page.getByLabel(/^Password \(at least 10 characters\)$/i).fill("extended-tracking-pass");
  await page.getByLabel(/at least 18 and live in Switzerland/i).check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.getByRole("button", { name: "Save settings on this device" }).click();
  const created = await page.request.post("/api/workouts", { headers: { origin: new URL(page.url()).origin }, data: { title: "Time and cardio check" } });
  expect(created.status()).toBe(201);
  const workoutId = (await created.json() as { data: { workout: { id: string } } }).data.workout.id;
  await page.goto(`/workouts/${workoutId}`);

  // A time exercise is picked from the same list as every other exercise.
  async function addExercise(search: string, name: RegExp, cardio = false): Promise<void> {
    await page.getByRole("button", { name: cardio ? "Add cardio" : "Add exercises" }).click();
    const picker = page.getByRole("dialog", { name: cardio ? "Choose cardio" : "Choose exercises" });
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill(search);
    await picker.getByRole("button", { name }).first().click();
    await page.getByRole("button", { name: cardio ? "Add selected cardio (1)" : "Add selected exercises (1)" }).click();
  }
  // The "Time" filter narrows the picker to timed exercises, and cardio is not offered here.
  await page.getByRole("button", { name: "Add exercises" }).click();
  const timePicker = page.getByRole("dialog", { name: "Choose exercises" });
  await expect(timePicker.getByRole("radio", { name: "Cardio", exact: true })).toHaveCount(0);
  await timePicker.getByRole("radio", { name: "Time", exact: true }).click();
  await expect(timePicker.getByRole("button", { name: /^Dead hang\b/ })).toBeVisible();
  await expect(timePicker.getByRole("button", { name: /^Wall Sit\b/ })).toBeVisible();
  await expect(timePicker.getByRole("button", { name: /Bench Press/ })).toHaveCount(0);
  await timePicker.getByRole("button", { name: "Close exercise picker" }).click();
  await addExercise("Dead hang", /^Dead hang\b/);
  await expect(page.getByRole("heading", { name: "Dead hang", level: 2 })).toBeVisible();

  // Minutes and seconds, never raw seconds.
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  let sheet = page.getByRole("dialog", { name: "New set", exact: true });
  await sheet.getByLabel("Minutes", { exact: true }).fill("1");
  await sheet.getByLabel("Seconds", { exact: true }).fill("30");
  await sheet.getByLabel("Added weight, kg").fill("5");
  await sheet.getByRole("button", { name: "Save set", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await page.getByRole("button", { name: /^Set 1: 1:30 \+ 5 kg/ }).click();
  sheet = page.getByRole("dialog", { name: "Edit set 1", exact: true });
  await sheet.getByRole("button", { name: "Increase duration" }).click();
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Set 1: 1:35 \+ 5 kg/ })).toBeVisible();

  // The timer fills the duration; a lost acknowledgement must not create a duplicate.
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  sheet = page.getByRole("dialog", { name: "New set", exact: true });
  await sheet.getByRole("button", { name: "Start timer", exact: true }).click();
  await expect.poll(async () => Number(await sheet.getByLabel("Seconds", { exact: true }).inputValue())).toBeGreaterThanOrEqual(1);
  await sheet.getByRole("button", { name: "Stop timer", exact: true }).click();
  let lostAcknowledgement = false;
  await page.route(`**/api/tracking/workouts/${workoutId}/timed-sets`, async (route) => {
    if (!lostAcknowledgement && route.request().method() === "POST") {
      lostAcknowledgement = true; await route.fetch(); await route.abort("failed");
    } else await route.continue();
  });
  await sheet.getByRole("button", { name: "Save set", exact: true }).click();
  await expect(page.getByText(/connection .* failed/i)).toBeVisible();
  await sheet.getByRole("button", { name: "Save set", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await page.unroute(`**/api/tracking/workouts/${workoutId}/timed-sets`);
  const stored = await page.request.get(`/api/tracking/workouts/${workoutId}`);
  expect((await stored.json() as { data: { timedSets: unknown[] } }).data.timedSets).toHaveLength(2);

  // Cardio is an exercise too: minutes, distance, and the optional extras.
  await page.getByRole("button", { name: "Exercises" }).click();
  await addExercise("Treadmill", /^Treadmill Run\b/, true);
  await expect(page.getByRole("heading", { name: "Treadmill Run", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  const cardio = page.getByRole("dialog", { name: "New entry", exact: true });
  await cardio.getByLabel("Minutes", { exact: true }).fill("25");
  await cardio.getByLabel("Distance, km").fill("5");
  await cardio.getByRole("button", { name: "More details", exact: true }).click();
  await cardio.getByLabel("Calories, kcal").fill("300");
  await cardio.getByLabel("Avg heart rate, bpm").fill("145");
  await cardio.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(cardio).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Entry 1: 25:00 · 5 km, 5:00 \/km · 300 kcal · 145 bpm/ })).toBeVisible();

  // Both sit in the workout's exercise list with their own counts.
  await page.getByRole("button", { name: "Exercises" }).click();
  await expect(page.getByRole("list", { name: "Workout exercises" }).getByRole("button", { name: /^Dead hang\s*2 sets$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cardio", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Workout cardio" }).getByRole("button", { name: /^Treadmill Run\s*1 entry$/ })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("time-cardio-workout.png") });

  // The Exercises menu can create time and cardio exercises.
  await page.goto("/workouts/exercises");
  await page.getByRole("button", { name: /Create exercise|New exercise/ }).first().click();
  const editor = page.getByRole("dialog", { name: "Create exercise" });
  await expect(editor.getByRole("radio", { name: "Weight & reps" })).toBeChecked();
  await editor.getByRole("radio", { name: "Time", exact: true }).click();
  await expect(editor.getByText(/Holds timed in minutes and seconds/)).toBeVisible();
  await editor.getByRole("radio", { name: "Cardio", exact: true }).click();
  await expect(editor.getByRole("radio", { name: "Cardio", exact: true })).toBeChecked();
  await editor.getByRole("button", { name: "Close exercise editor" }).click();

  expect((await page.request.post(`/api/workouts/${workoutId}/end`, { headers: { origin: new URL(page.url()).origin }, data: {} })).status()).toBe(200);
  await page.goto("/progress");
  await page.getByRole("radio", { name: "Time and cardio", exact: true }).click();
  const progress = page.getByRole("region", { name: "Time and cardio progress" });
  async function chooseProgressExercise(name: string): Promise<void> {
    await progress.getByRole("button", { name: /^Exercise: .*Change exercise$/ }).click();
    const picker = page.getByRole("dialog", { name: "Choose an exercise" });
    await picker.getByRole("searchbox", { name: "Search exercises" }).fill(name);
    await picker.getByRole("button", { name: new RegExp(`^${name}\\b`) }).click();
    await expect(picker).toHaveCount(0);
  }
  await expect(progress.getByRole("status")).toContainText("1:35 + 5 kg");
  await chooseProgressExercise("Treadmill Run");
  await expect(progress.getByRole("status")).toContainText("5:00 /km");
  await page.goto("/workouts");
  await page.getByRole("button", { name: /Time and cardio check/ }).click();
  await expect(page.getByText(/25:00 · 5 km/)).toBeVisible();
  const volume = await page.request.get("/api/analytics/weekly-volume");
  expect(volume.status()).toBe(200);
  const payload = await volume.json() as { data: { weeks: { items: { workingSets: number }[] }[] } };
  expect(payload.data.weeks.flatMap((week) => week.items).reduce((sum, item) => sum + item.workingSets, 0)).toBe(3);

  // Several weeks cover repeated holds, warm-ups, intervals and missing distances.
  const sample = trackingProgressFixture();
  const imported = await page.request.post("/api/tracking/import.csv", {
    headers: { origin: new URL(page.url()).origin, "content-type": "text/csv" }, data: sample
  });
  expect(imported.status()).toBe(201);
  expect((await imported.json()).data).toMatchObject({ importedRows: 114, importedWorkouts: 12 });
  await page.goto("/progress");
  await page.getByRole("radio", { name: "Time and cardio", exact: true }).click();
  await chooseProgressExercise("Dead hang");
  await progress.getByRole("radio", { name: "Max", exact: true }).click();
  await expect(progress.getByRole("region", { name: "Summary" })).toContainText("Sets, all38");
  await progress.getByRole("button", { name: "Previous day", exact: true }).click();
  await expect(progress.getByRole("status")).toContainText("1:07 + 10 kg");
  await progress.getByRole("radio", { name: "1W", exact: true }).click();
  const plotScroller = progress.locator('[dir="rtl"]');
  await expect.poll(() => plotScroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await progress.getByRole("radio", { name: "Added weight", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: test.info().outputPath("timed-progress-mobile.png") });
  await progress.getByRole("button", { name: "Show as table", exact: true }).click();
  await expect(progress.getByRole("table").getByRole("row")).toHaveCount(14);
  await expect(progress.getByRole("table").getByRole("row").nth(1)).toContainText("1:35 + 5 kg");
  await progress.getByRole("radio", { name: "Duration", exact: true }).click();
  await expect(progress.getByRole("table").getByRole("row")).toHaveCount(14);
  await chooseProgressExercise("Rowing Machine");
  await progress.getByRole("radio", { name: "Distance", exact: true }).click();
  await expect(progress.getByRole("status")).toContainText("2:15");
  await progress.getByRole("button", { name: "Show as table", exact: true }).click();
  await expect(progress.getByRole("table").getByRole("row")).toHaveCount(7);
  await chooseProgressExercise("Stationary Bike");
  await progress.getByRole("radio", { name: "Distance", exact: true }).click();
  await expect(progress.getByText(/No distance is logged/)).toBeVisible();
  await progress.getByRole("radio", { name: "Duration", exact: true }).click();
  await progress.getByRole("radio", { name: "Max", exact: true }).click();
  await progress.getByRole("button", { name: "Show as table", exact: true }).click();
  await expect(progress.getByRole("table").getByRole("row")).toHaveCount(7);
  await progress.getByRole("button", { name: "Show as chart", exact: true }).click();
  await expectNoSeriousAccessibilityViolations(page);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: test.info().outputPath("cardio-progress-small-reduced-motion.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect.poll(() => progress.locator('[dir="rtl"] svg.recharts-surface').evaluate((svg) => Math.abs(svg.getBoundingClientRect().height - svg.closest('[dir="rtl"]')!.clientHeight) < 1)).toBe(true);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: test.info().outputPath("cardio-progress-desktop.png") });
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.screenshot({ path: test.info().outputPath("cardio-progress-wide.png") });

});
