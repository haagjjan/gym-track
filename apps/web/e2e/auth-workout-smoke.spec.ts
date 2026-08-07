import { expect, type Page, test } from "@playwright/test";
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
  await page.getByLabel(/EMAIL_ADDRESS/).fill(`${username}@example.com`);
  await page.getByLabel(/OPERATOR_ID/).fill(username);
  await page.getByLabel(/ACCESS_CODE/).fill(password);
  await page.getByRole("button", { name: "REGISTER" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();

  const onboarding = page.getByRole("dialog", { name: "Welcome, Founding Member" });
  await expect(onboarding).toBeFocused();
  await expectModalContract(page, onboarding);
  await page.keyboard.press("Escape");
  await expect(onboarding).toHaveCount(0);
  const storageChoice = page.getByRole("dialog", { name: "Device storage choice" });
  await storageChoice.getByRole("button", { name: "ALLOW FUNCTIONAL" }).click();
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
            body: "Keyboard-accessible beta message.",
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
  const messageDialog = page.getByRole("dialog", { name: "Beta message" });
  await expect(messageDialog.getByRole("button", { name: "Dismiss message" })).toBeFocused();
  await expectModalContract(page, messageDialog);
  await page.keyboard.press("Escape");
  await expect(messageDialog).toHaveCount(0);
  await page.unroute("**/api/messages**");

  // Fresh accounts are unverified → pending badge on the settings icon, and a
  // resend affordance inside Settings (not a persistent top-of-app banner).
  await expect(page.getByLabel("Settings")).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText("EMAIL_UNVERIFIED")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  // Volume defaults to 3D; the lightweight 2D map is a device-local Settings
  // preference rather than an always-visible control on the Volume screen.
  const volumeMapSettings = page.getByRole("radiogroup", {
    name: "Volume body map"
  });

  await expect(volumeMapSettings.getByRole("radio", { name: "3d" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await volumeMapSettings.getByRole("radio", { name: "2d" }).click();
  await expect(volumeMapSettings.getByRole("radio", { name: "2d" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await page.getByRole("spinbutton", { name: "Volume heat ceiling" }).fill("35");
  await page.getByRole("button", { name: "SAVE HEAT CEILING" }).click();
  await expect(page.getByRole("button", { name: "SAVED" })).toBeVisible();

  // ---- Logout / login round-trip ----
  await page.request.post("/api/auth/logout", {
    headers: { origin: new URL(page.url()).origin }
  });
  await page.goto("/login");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/OPERATOR_ID/).fill(username);
  await page.getByLabel(/ACCESS_CODE/).fill(password);
  await page.getByRole("button", { name: "AUTHENTICATE" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("spinbutton", { name: "Volume heat ceiling" })).toHaveValue("35");

  // The Settings preference survives navigation/auth and the same-muscle
  // interaction toggles selection off on its second click.
  await page.goto("/weekly-volume");
  await expect(page.getByRole("group", { name: "FRONT muscle map" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Body view" })).toHaveCount(0);

  const chestRegion = page.getByLabel("chest", { exact: true }).first();

  await chestRegion.click();
  await expect(chestRegion).toHaveAttribute("stroke", "#d9b9ff");
  await chestRegion.click();
  await expect(chestRegion).toHaveAttribute("stroke", "#0a0a0a");

  // ---- Start a session from the launch screen ----
  await page.goto("/workout");
  await expect(page.getByRole("heading", { name: "Start a workout" })).toBeVisible();
  await expect(page.getByText("Start from scratch", { exact: true })).toBeVisible();
  await expect(page.getByText("USE_WORKOUT_TEMPLATE", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "START", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]+\?focusName=1$/);
  const workoutId = page.url().match(/\/workouts\/([0-9a-f-]+)/)?.[1];
  expect(workoutId).toBeTruthy();
  const workoutName = page.getByLabel("Workout name");
  await expect(workoutName).toBeFocused();
  await workoutName.fill("Gym Smoke");
  await workoutName.press("Enter");
  await expect(workoutName).toHaveValue("Gym Smoke");
  const liveStatus = page.getByText(/^LIVE · \d{2}:\d{2}:\d{2}$/);
  await expect(liveStatus).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => liveStatus.locator(".status-dot").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // ---- Add an exercise via the sheet ----
  await expect(page.getByRole("list", { name: "Workout exercises" })).toHaveCount(0);
  const chooseExercises = page.getByRole("button", { name: "Choose exercises" });
  await chooseExercises.click();
  const initialPicker = page.getByRole("dialog", { name: "Choose exercises" });
  await expect(initialPicker.getByRole("button", { name: "Close exercise picker" })).toBeFocused();
  await expectModalContract(page, initialPicker);
  await page.keyboard.press("Escape");
  await expect(initialPicker).toHaveCount(0);
  await expect(chooseExercises).toBeFocused();
  await chooseExercises.click();
  await page.getByPlaceholder(/Scan catalog/).fill("Bench Press");
  await page
    .getByRole("button", { name: /^Bench Press\b/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add selected exercises (1)" }).click();
  await expect(page.getByRole("heading", { name: "Bench Press" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Set mode exercise navigation" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Workout exercises" })).toHaveCount(0);
  await page.getByRole("button", { name: "Exercises" }).click();
  await expect(page.getByText("Tap an exercise to log sets.")).toBeVisible();
  await page.getByRole("button", { name: /Bench Press \d+ sets$/ }).click();

  // ---- Preserve an unfinished set locally, then log it ----
  await page.getByRole("button", { name: "Add Set" }).click();
  const newSetDialog = page.getByRole("dialog", { name: "New set" });
  await expect(newSetDialog).toBeVisible();
  await expect(newSetDialog).toBeFocused();
  await expectModalContract(page, newSetDialog);
  await expect.poll(() => newSetDialog.evaluate((element) => getComputedStyle(element).position)).toBe("fixed");
  const weightInput = page.locator('input[inputmode="decimal"]').first();
  await expect(weightInput).not.toBeFocused();

  await weightInput.fill("60");
  await newSetDialog.getByRole("button", { name: "Increase WEIGHT" }).click();
  await expect(weightInput).not.toBeFocused();
  await expect(weightInput).toHaveValue("60");
  await newSetDialog.getByRole("button", { name: "Increase WEIGHT" }).click();
  await expect(weightInput).toHaveValue("62.5");
  await weightInput.fill("60");
  await page.reload();
  await page.getByRole("button", { name: /Bench Press \d+ sets$/ }).click();
  await page.getByRole("button", { name: "Add Set" }).click();
  await expect(page.locator('input[inputmode="decimal"]').first()).toHaveValue("60");
  await page.getByRole("button", { name: "SAVE SET" }).click();
  await expect(page.getByText(/60 kg × 8/)).toBeVisible();
  await expect(page.getByText("Working", { exact: true })).toBeVisible();
  await expect(page.getByText("REST_PROTOCOL")).toBeVisible();
  const timerDock = page.locator("div.fixed.inset-x-0.bottom-0").filter({ hasText: "REST_PROTOCOL" });
  await expect(timerDock).toBeVisible();
  const timerBeforeEdit = await timerDock.locator("p.font-mono").textContent();
  await page.getByRole("button", { name: /60 kg × 8/ }).click();
  const editSetDialog = page.getByRole("dialog", { name: "Edit set 1" });
  await expect(editSetDialog).toBeVisible();
  await expect(page.getByText("REST_PROTOCOL")).toHaveCount(0);
  await expect(editSetDialog.locator('input[inputmode="decimal"]')).not.toBeFocused();
  await editSetDialog.getByRole("radio", { name: "warmup" }).click();
  await editSetDialog.getByLabel("Note").fill("Smoke edit");
  await editSetDialog.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect(editSetDialog).toHaveCount(0);
  await expect(page.getByText("Warmup", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /60 kg × 8/ }).click();
  const restoreWorkingDialog = page.getByRole("dialog", { name: "Edit set 1" });
  await restoreWorkingDialog.getByRole("radio", { name: "working" }).click();
  await restoreWorkingDialog.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect(page.getByText("Working", { exact: true })).toBeVisible();
  await expect(timerDock).toBeVisible();
  await page.waitForTimeout(1_100);
  const timerAfterEdit = await timerDock.locator("p.font-mono").textContent();
  expect(timerSeconds(timerAfterEdit)).toBeLessThan(timerSeconds(timerBeforeEdit));
  await expectNoHorizontalScroll(page);

  // ---- Complete (two-tap confirm) ----
  await page.getByRole("button", { name: "FINISH", exact: true }).click();
  await page.getByRole("button", { name: "CONFIRM FINISH", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Session saved successfully" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View History" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

  // The next workout shows and prefills the latest earlier best working set.
  await page.goto("/workout");
  await page.getByRole("button", { name: "START", exact: true }).click();
  await page.getByRole("button", { name: "Choose exercises" }).click();
  const secondPicker = page.getByRole("dialog", { name: "Choose exercises" });
  await expect(secondPicker.getByRole("searchbox")).not.toBeFocused();
  await secondPicker.getByRole("searchbox").fill("Bench Press");
  await secondPicker.getByRole("button", { name: /^Bench Press\b/ }).first().click();
  await secondPicker.getByRole("button", { name: "Add selected exercises (1)" }).click();
  await expect(page.getByText(/^Gym Smoke ·/)).toBeVisible();
  await expect(page.getByText(/60 kg × 8/)).toBeVisible();
  await page.getByRole("button", { name: "Add Set" }).click();
  await expect(page.locator('input[inputmode="decimal"]').first()).toHaveValue("60");
  await expect(page.locator('input[inputmode="decimal"]').first()).not.toBeFocused();
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Workout actions" }).click();
  await page.getByRole("menuitem", { name: "Discard workout" }).click();
  await page.getByRole("alertdialog", { name: "Discard this workout?" }).getByRole("button", { name: "DISCARD WORKOUT" }).click();
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
  await expect(page.getByRole("heading", { name: "Workout history" })).toBeVisible();
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
  await page.getByRole("button", { name: /GYM_SMOKE/ }).first().click();
  await expect(page.getByText(/60 kg × 8/)).toBeVisible();
  await expectNoHorizontalScroll(page);

  // ---- Progress renders the lift's signal ----
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress analytics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bench Press" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "EST_1RM" })).toBeVisible();
  await expect(metricValue(page, "TOTAL_SETS")).toHaveText("0");
  await expect(metricValue(page, "TOTAL_TONNAGE")).toHaveText("0 KG");
  await expect(metricValue(page, "BEST_SET")).toHaveText("60×8");
  await page.getByRole("radio", { name: "MAX" }).click();
  await expect(metricValue(page, "TOTAL_SETS")).toHaveText("1");
  await expect(metricValue(page, "TOTAL_TONNAGE")).toHaveText("480 KG");
  await page.getByRole("button", { name: "How estimated 1RM is calculated" }).click();
  const estimatedHelp = page.getByRole("tooltip");
  await expect(estimatedHelp).toContainText("e1RM = weight × (1 + reps ÷ 30)");
  const helpBox = await estimatedHelp.boundingBox();
  expect(helpBox).not.toBeNull();
  expect((helpBox?.x ?? 0) + (helpBox?.width ?? 0)).toBeLessThanOrEqual(390);
  await expectNoHorizontalScroll(page);

  // ---- Completed logs can be removed everywhere ----
  await page.goto("/workouts");
  await page.getByRole("button", { name: /GYM_SMOKE/ }).first().click();
  const deleteTrigger = page.getByRole("button", { name: "Delete" });
  await deleteTrigger.click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete this workout log?" });
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog.getByRole("button", { name: "CANCEL" })).toBeFocused();
  await expectModalContract(page, deleteDialog);
  await page.keyboard.press("Escape");
  await expect(deleteDialog).toHaveCount(0);
  await expect(deleteTrigger).toBeFocused();
  await deleteTrigger.click();
  await deleteDialog.getByRole("button", { name: "DELETE LOG" }).click();
  await expect(deleteDialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: /GYM_SMOKE/ })).toHaveCount(0);

  // ---- Accidental active workouts can be discarded and restarted ----
  await page.goto("/workout");
  await page.getByRole("button", { name: "START", exact: true }).click();
  await page.getByRole("button", { name: "Workout actions" }).click();
  await page.getByRole("menuitem", { name: "Discard workout" }).click();
  const discardDialog = page.getByRole("alertdialog", { name: "Discard this workout?" });
  await discardDialog.getByRole("button", { name: "DISCARD WORKOUT" }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await page.goto("/workout");
  await expect(page.getByRole("button", { name: "START", exact: true })).toBeEnabled();

  // Informational popovers remain non-modal and return focus to their trigger.
  await page.goto("/help");
  const infoTrigger = page.getByRole("button", { name: "Information about set types" });
  await infoTrigger.click();
  const infoPopover = page.getByRole("dialog", { name: "Information about set types" });
  await expect(infoPopover).toHaveAttribute("aria-modal", "false");
  await page.keyboard.press("Tab");
  await expect(infoPopover.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(infoPopover).toHaveCount(0);
  await expect(infoTrigger).toBeFocused();
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

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );

  expect(hasOverflow, "page must not scroll horizontally on mobile").toBe(false);
}

function metricValue(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator("..").locator("p").nth(1);
}

function timerSeconds(value: string | null): number {
  const match = /^(\d+):(\d{2})$/.exec(value?.trim() ?? "");
  expect(match, `expected a rest timer value, received ${value ?? "null"}`).not.toBeNull();
  return Number(match?.[1] ?? 0) * 60 + Number(match?.[2] ?? 0);
}
