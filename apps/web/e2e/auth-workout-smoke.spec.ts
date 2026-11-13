import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  expectModalContract,
  expectNoSeriousAccessibilityViolations,
  expectZoomEnabled
} from "./accessibility-assertions";

/**
 * Mobile-first smoke over the rebuilt cockpit UI: signup → dashboard →
 * live session (add exercise, log a set) → complete → history shows the
 * session → progress renders the lift.
 */
test.setTimeout(180_000);

test("completes the core workout loop on the cockpit UI", async ({ page }) => {
  const tag = `${Date.now()}${process.pid}`;
  const username = `smoke_${tag}`;
  const password = "smoke-passphrase-1";
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? error.message);
  });

  await page.setViewportSize({ width: 390, height: 900 });

  // ---- Signup ----
  await page.goto("/signup");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await expectZoomEnabled(page);
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByLabel(/Email address/i).fill(`${username}@example.com`);
  await page.getByLabel(/^Username$/i).fill(username);
  await page.getByLabel(/^Password \(at least 10 characters\)$/i).fill(password);
  await page.getByLabel(/at least 18 and live in Switzerland/i).check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();
  await waitForIdleClient(page);

  const onboarding = page.getByRole("region", { name: "Try the example" });
  await expect(onboarding).toBeVisible();
  await onboarding.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(onboarding).toHaveCount(0);
  const storageChoice = page.getByRole("dialog", { name: "Device storage choice" });
  await storageChoice.getByRole("button", { name: "Save settings on this device" }).click();
  await expect(storageChoice).toHaveCount(0);
  await expectNoHorizontalScroll(page);

  let messageDismissed = false;
  await page.route("**/api/messages**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/messages" && request.method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: { items: messageDismissed ? [] : [{
            actionUrl: null,
            body: "Keyboard-accessible message.",
            essential: false,
            id: "00000000-0000-4000-8000-000000000001",
            responseOptions: [],
            responseType: "ACKNOWLEDGEMENT",
            title: "Accessibility check"
          }] } })
      });
      return;
    }
    if (pathname.endsWith("/dismiss") && request.method() === "POST") {
      messageDismissed = true;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {} }) });
      return;
    }
    await route.continue();
  });
  await page.reload();
  await waitForIdleClient(page);
  const messageDialog = page.getByRole("dialog", { name: "Message" });
  await expect(messageDialog.getByRole("button", { name: "Dismiss message" })).toBeFocused();
  await expectModalContract(page, messageDialog);
  await page.keyboard.press("Escape");
  await expect(messageDialog).toHaveCount(0);
  await page.unroute("**/api/messages**");

  // Fresh accounts are unverified → pending badge on the Settings entry, and a
  // resend affordance inside Settings (not a persistent top-of-app banner).
  await expect(page.getByRole("link", { name: /settings.*email not confirmed/i })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText("Email not confirmed", { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByRole("link", { name: "Contact support" }).click();
  await expect(page.getByRole("heading", { name: "Support", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  // The 3D body is the only Volume renderer, so Settings no longer offers a
  // renderer choice at all.
  await expect(page.getByRole("radiogroup", { name: "Volume body map" })).toHaveCount(0);

  // The weekly-sets limit opens in a sheet from its row, saves on its own,
  // then confirms with "Saved".
  await page.getByRole("button", { name: /^Full color on body map/ }).click();
  const heatCeiling = page.getByRole("spinbutton", { name: "Volume heat ceiling" });
  await heatCeiling.fill("35");
  await heatCeiling.blur();
  await expect(page.getByRole("status").filter({ hasText: "Saved" }).first()).toBeVisible();

  // ---- Logout / login round-trip ----
  await page.request.post("/api/auth/logout", {
    headers: { origin: new URL(page.url()).origin }
  });
  await page.goto("/login");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/Username or email/i).fill(username);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole("button", { name: "SIGN IN" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("button", { name: /^Full color on body map\s*35 sets/ })).toBeVisible();

  // The heat-ceiling preference survives navigation and auth. The 3D body is
  // now the only Volume renderer, so neither the flat map nor any renderer
  // toggle should be reachable.
  await page.goto("/weekly-volume");
  await expect(page.getByRole("heading", { name: "Muscle volume" })).toBeVisible();
  await expect(page.getByRole("group", { name: "FRONT muscle map" })).toHaveCount(0);
  await expect(page.getByRole("radiogroup", { name: "Body view" })).toHaveCount(0);

  // ---- Start a session from the launch screen ----
  await page.goto("/workout");
  await expect(page.getByRole("heading", { name: "Workout", exact: true })).toBeVisible();
  const startFromScratch = page.getByRole("button", { name: "Start empty workout", exact: true });
  await expect(startFromScratch).toBeVisible();
  // Templates and the exercise library live under the Workout tab.
  await expect(page.getByRole("link", { name: /^Templates/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Exercise library/ })).toBeVisible();
  await startFromScratch.click();
  await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]+\?focusName=1$/);
  const workoutId = page.url().match(/\/workouts\/([0-9a-f-]+)/)?.[1];
  expect(workoutId).toBeTruthy();
  const workoutName = page.getByLabel("Workout name");
  await expect(workoutName).toBeFocused();
  await workoutName.fill("Gym Smoke");
  await workoutName.press("Enter");
  await expect(workoutName).toHaveValue("Gym Smoke");
  await expect(page.getByTestId("workout-elapsed")).toHaveText(/^\d+:\d{2}$/);
  await expect(page.getByRole("button", { name: "Minimize workout" })).toBeVisible();

  // ---- Add an exercise via the sheet ----
  await expect(page.getByRole("list", { name: "Workout exercises" })).toHaveCount(0);
  const chooseExercises = page.getByRole("button", { name: "Add exercises" });
  await chooseExercises.click();
  const initialPicker = page.getByRole("dialog", { name: "Choose exercises" });
  await expect(initialPicker.getByRole("button", { name: "Close exercise picker" })).toBeFocused();
  await expectModalContract(page, initialPicker);
  await page.keyboard.press("Escape");
  await expect(initialPicker).toHaveCount(0);
  await expect(chooseExercises).toBeFocused();
  await chooseExercises.click();
  const exercisePicker = page.getByRole("dialog", { name: "Choose exercises" });
  await exercisePicker.getByRole("searchbox", { name: "Search exercises" }).fill("Bench Press");
  await page
    .getByRole("button", { name: /^Bench Press\b/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add selected exercises (1)" }).click();
  await expect(page.getByRole("heading", { name: "Bench Press" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Exercise navigation" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Workout exercises" })).toHaveCount(0);
  await page.getByRole("button", { name: "Exercises" }).click();
  await expect(page.getByRole("list", { name: "Workout exercises" })).toBeVisible();
  await page.getByRole("button", { name: /^Bench Press (No sets yet|\d+ sets?)$/ }).click();

  // ---- Preserve an unfinished set locally, then log it ----
  await page.getByRole("button", { name: "Add set" }).click();
  const newSetDialog = page.getByRole("dialog", { name: "New set" });
  await expect(newSetDialog).toBeVisible();
  await expect(newSetDialog).toBeFocused();
  await expectModalContract(page, newSetDialog);
  // Informational popovers remain non-modal and return focus to their trigger.
  const infoTrigger = page.getByRole("button", { name: "Information about reps in reserve" });
  await infoTrigger.click();
  const infoPopover = page.getByRole("dialog", { name: "Information about reps in reserve" });
  await expect(infoPopover).toHaveAttribute("aria-modal", "false");
  await page.keyboard.press("Tab");
  await expect(infoPopover.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(infoPopover).toHaveCount(0);
  await expect(infoTrigger).toBeFocused();
  await expect.poll(() => newSetDialog.evaluate((element) => getComputedStyle(element).position)).toBe("fixed");
  const weightInput = page.locator('input[inputmode="decimal"]').first();
  await expect(weightInput).not.toBeFocused();

  await weightInput.fill("60");
  await newSetDialog.getByRole("button", { name: "Increase weight" }).click();
  await expect(weightInput).not.toBeFocused();
  await expect(weightInput).toHaveValue("60");
  await newSetDialog.getByRole("button", { name: "Increase weight" }).click();
  await expect(weightInput).toHaveValue("62.5");
  await weightInput.fill("60");
  await page.reload();
  // A reload reopens the exercise you were on (remembered per workout for the session).
  await expect(page.getByRole("heading", { name: "Bench Press", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Add set" }).click();
  await expect(page.locator('input[inputmode="decimal"]').first()).toHaveValue("60");
  await page.getByRole("button", { name: "Save set" }).click();
  await expect(page.getByText(/60 kg × 8/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Set 1: 60 kg × 8/ })).toBeVisible();
  const timerDock = page.getByRole("timer", { name: "Rest timer" });
  await expect(timerDock).toBeVisible();
  // The rest timer sits in the bottom bar, in the thumb zone, next to Finish.
  await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toBeVisible();
  const timerBeforeEdit = await timerDock.getByTestId("rest-remaining").textContent();
  await page.getByRole("button", { name: /60 kg × 8/ }).click();
  const editSetDialog = page.getByRole("dialog", { name: "Edit set 1" });
  await expect(editSetDialog).toBeVisible();
  await expect(editSetDialog.locator('input[inputmode="decimal"]')).not.toBeFocused();
  await editSetDialog.getByRole("radio", { name: "Warm-up" }).click();
  await editSetDialog.getByLabel("Note").fill("Smoke edit");
  await editSetDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editSetDialog).toHaveCount(0);
  await expect(page.getByText("Warm-up", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /60 kg × 8/ }).click();
  const restoreWorkingDialog = page.getByRole("dialog", { name: "Edit set 1" });
  await restoreWorkingDialog.getByRole("radio", { name: "Working" }).click();
  await restoreWorkingDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Warm-up", { exact: true })).toHaveCount(0);
  await expect(timerDock).toBeVisible();
  await page.waitForTimeout(1_100);
  const timerAfterEdit = await timerDock.getByTestId("rest-remaining").textContent();
  expect(timerSeconds(timerAfterEdit)).toBeLessThan(timerSeconds(timerBeforeEdit));
  await expectNoHorizontalScroll(page);

  // ---- Complete (two-tap confirm) ----
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByRole("button", { name: "Tap again to finish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workout complete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save as template", exact: true })).toBeVisible();
  // The time is edited from the pencil next to Duration, in a sheet.
  await page.getByRole("button", { name: /^Duration .*Change workout time$/ }).click();
  const timeSheet = page.getByRole("dialog", { name: "Workout time" });
  await expect(timeSheet.getByLabel("Start")).toBeVisible();
  await expect(timeSheet.getByLabel("Finish")).toBeVisible();
  await timeSheet.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(timeSheet).toHaveCount(0);

  // The next workout shows and prefills the latest earlier best working set.
  await page.goto("/workout");
  await page.getByRole("button", { name: "Start empty workout", exact: true }).click();
  await page.getByRole("button", { name: "Add exercises" }).click();
  const secondPicker = page.getByRole("dialog", { name: "Choose exercises" });
  await expect(secondPicker.getByRole("searchbox")).not.toBeFocused();
  await secondPicker.getByRole("searchbox").fill("Bench Press");
  await secondPicker.getByRole("button", { name: /^Bench Press\b/ }).first().click();
  await secondPicker.getByRole("button", { name: "Add selected exercises (1)" }).click();
  await expect(page.getByText(/^Gym Smoke, /)).toBeVisible();
  await expect(page.getByText(/60 kg × 8/)).toBeVisible();
  await page.getByRole("button", { name: "Add set" }).click();
  await expect(page.locator('input[inputmode="decimal"]').first()).toHaveValue("60");
  await expect(page.locator('input[inputmode="decimal"]').first()).not.toBeFocused();
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Workout actions" }).click();
  await page.getByRole("menuitem", { name: "Discard workout" }).click();
  await page.getByRole("alertdialog", { name: "Discard this workout?" }).getByRole("button", { name: "Discard workout" }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await page.goto(`/workouts/${workoutId}`);

  // Move the completed session outside 3M so range-aware Progress widgets can
  // be checked against the all-time performance cards.
  const oldStart = new Date(Date.now() - 120 * 24 * 60 * 60 * 1_000);
  const oldEnd = new Date(oldStart.getTime() + 60 * 60 * 1_000);
  const timeUpdate = await page.request.patch(`/api/workouts/${workoutId}`, {
    data: { startedAt: oldStart.toISOString(), endedAt: oldEnd.toISOString() },
    headers: { origin: new URL(page.url()).origin }
  });
  expect(timeUpdate.ok()).toBe(true);

  // ---- History shows the session with its set detail ----
  await page.goto("/workouts");
  await expect(page.getByRole("heading", { name: "History", exact: true })).toBeVisible();
  const csvTrigger = page.getByRole("button", { name: "View CSV format" });
  await csvTrigger.click();
  const csvGuide = page.getByRole("dialog", { name: "Workout CSV guide" });
  await expect(csvGuide.getByRole("button", { name: "Close CSV format guide" })).toBeFocused();
  await expectModalContract(page, csvGuide);
  await page.keyboard.press("Escape");
  await expect(csvGuide).toHaveCount(0);
  await expect(csvTrigger).toBeFocused();
  await csvTrigger.click();
  await expect(csvGuide.getByText("workout_started_at", { exact: true })).toBeVisible();
  await expect(csvGuide.getByRole("link", { name: "Download sample CSV" })).toBeVisible();
  await csvGuide.getByRole("button", { name: "Close", exact: true }).click();
  // A history row opens a quick view of the sets; "Open workout" opens the full page.
  await page.getByRole("button", { name: /^Gym Smoke/ }).first().click();
  await expect(page.getByRole("list", { name: "Sets for Bench Press" }).getByText("60 kg × 8").first()).toBeVisible();
  await page.getByRole("link", { name: "Open workout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workout complete" })).toBeVisible();
  await page.getByRole("button", { name: /^Bench Press (No sets|\d+ sets?)$/ }).click();
  await expect(page.getByText(/60 kg × 8/)).toBeVisible();
  await expectNoHorizontalScroll(page);

  // ---- Progress renders the lift's signal ----
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exercise: Bench Press. Change exercise" })).toBeVisible();
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(metricValue(summary, "Sets, 1M")).toHaveText("0");
  await expect(metricValue(summary, "Volume, 1M")).toHaveText("0");
  await expect(metricValue(summary, "Best est. 1RM")).toHaveText("76");
  // The chart always holds every logged day; the window only sets how much is on screen.
  await expect(page.getByRole("button", { name: "Weight, kg" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reps" })).toBeVisible();
  await expect(page.getByText("60 kg × 8, est. 1RM 76 kg", { exact: false })).toBeVisible();
  await page.getByRole("radio", { name: "MAX" }).click();
  await expect(page.getByRole("radio", { name: "Est. 1RM" })).toBeVisible();
  await expect(metricValue(summary, "Sets, all")).toHaveText("1");
  await expect(metricValue(summary, "Volume, all")).toHaveText("480");
  await page.getByRole("button", { name: "How estimated 1RM is calculated" }).click();
  const estimatedHelp = page.getByRole("tooltip");
  await expect(estimatedHelp).toContainText("e1RM = weight × (1 + reps ÷ 30)");
  const helpBox = await estimatedHelp.boundingBox();
  expect(helpBox).not.toBeNull();
  expect((helpBox?.x ?? 0) + (helpBox?.width ?? 0)).toBeLessThanOrEqual(390);
  await expectNoHorizontalScroll(page);

  // ---- Completed logs can be removed everywhere ----
  await page.goto("/workouts");
  await page.getByRole("button", { name: /^Gym Smoke/ }).first().click();
  await page.getByRole("link", { name: "Open workout", exact: true }).click();
  // A finished workout is deleted from its detail page menu.
  const actions = page.getByRole("button", { name: "Workout actions" });
  await actions.click();
  await page.getByRole("menuitem", { name: "Delete workout" }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete this workout?" });
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await expectModalContract(page, deleteDialog);
  await page.keyboard.press("Escape");
  await expect(deleteDialog).toHaveCount(0);
  await expect(actions).toBeFocused();
  await actions.click();
  await page.getByRole("menuitem", { name: "Delete workout" }).click();
  await deleteDialog.getByRole("button", { name: "Delete workout" }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await expect(page.getByRole("button", { name: /^Gym Smoke/ })).toHaveCount(0);

  // ---- Accidental active workouts can be discarded and restarted ----
  await page.goto("/workout");
  await page.getByRole("button", { name: "Start empty workout", exact: true }).click();
  await page.getByRole("button", { name: "Workout actions" }).click();
  await page.getByRole("menuitem", { name: "Discard workout" }).click();
  const discardDialog = page.getByRole("alertdialog", { name: "Discard this workout?" });
  await discardDialog.getByRole("button", { name: "Discard workout" }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await page.goto("/workout");
  await expect(page.getByRole("button", { name: "Start empty workout", exact: true })).toBeEnabled();

  await page.goto("/help");
  await expect(page.getByRole("link", { name: "Take the tour", exact: true })).toBeVisible();
  await expect(page.getByText("Working and warmup sets", { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.setViewportSize({ width: 320, height: 568 });
  await expectNoHorizontalScroll(page);

  for (const width of [430, 1440]) {
    await page.setViewportSize({ width, height: 900 });

    for (const path of [
      "/",
      "/workout",
      "/workouts",
      "/workouts/templates",
      "/workouts/exercises",
      "/progress",
      "/weekly-volume",
      "/settings"
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  }

  expect(pageErrors, pageErrors.join("\n\n")).toHaveLength(0);
});

/**
 * The dashboard boots its 3D avatar on the client: a dynamic chunk, a local rigged GLB
 * parse, then WebGL program links. On CI's software rasterizer that bootstrap
 * blocks the renderer main thread for several seconds, and an assertion issued
 * inside that window burns its whole timeout without the browser ever answering
 * it: the modal contract then fails for a missing scroll lock that is in fact
 * applied, because the poll never got a value back at all.
 *
 * Waiting for asset loading to stop and for the page to answer promptly again
 * keeps the assertions that follow measuring the UI, not the avatar bootstrap.
 * Best effort by design: on timeout it hands back to the real assertions
 * instead of failing, so it can only ever remove a false negative.
 */
async function waitForIdleClient(page: Page): Promise<void> {
  const requiredCalmSamples = 5;
  const deadline = Date.now() + 60_000;
  let calmSamples = 0;
  let lastResourceCount = -1;

  while (calmSamples < requiredCalmSamples && Date.now() < deadline) {
    const started = Date.now();
    const resourceCount = await page.evaluate(() => performance.getEntriesByType("resource").length);
    const answeredWithin = Date.now() - started;

    calmSamples = answeredWithin < 500 && resourceCount === lastResourceCount ? calmSamples + 1 : 0;
    lastResourceCount = resourceCount;

    if (calmSamples < requiredCalmSamples) {
      await page.waitForTimeout(100);
    }
  }
}

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );

  expect(hasOverflow, "page must not scroll horizontally on mobile").toBe(false);
}

function metricValue(page: Page | Locator, label: string) {
  return page.getByText(label, { exact: true }).locator("..").locator(".num");
}

function timerSeconds(value: string | null): number {
  const match = /^(\d+):(\d{2})$/.exec(value?.trim() ?? "");
  expect(match, `expected a rest timer value, received ${value ?? "null"}`).not.toBeNull();
  return Number(match?.[1] ?? 0) * 60 + Number(match?.[2] ?? 0);
}
