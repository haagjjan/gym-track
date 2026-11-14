import { expect, test, type Page, type APIRequestContext } from "@playwright/test";
import { PUBLIC_PRIVACY_VERSION, PUBLIC_TERMS_VERSION } from "../src/shared/public-policy";
import { expectModalContract, expectNoSeriousAccessibilityViolations } from "./accessibility-assertions";

test.setTimeout(180_000);
test.use({ actionTimeout: 15_000 });
const origin = process.env.WEB_BASE_URL ?? "http://localhost:3000";
let primaryUsername: string | null = null;
async function account(request: APIRequestContext, separateAccount = false): Promise<void> {
  if (primaryUsername && !separateAccount) {
    const login = await request.post("/api/auth/login", { headers: { origin }, data: { username: primaryUsername, password: "example-test-passphrase" } });
    expect(login.ok()).toBeTruthy();
    await request.patch("/api/users/me/onboarding", { headers: { origin }, data: { version: 2, steps: { demoInvitationHandled: false, demo_finish_skipped: false, demo_finish_completed: false } } });
    return;
  }
  const username = `demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const signup = await request.post("/api/auth/signup", { headers: { origin }, data: { username, email: `${username}@example.com`, password: "example-test-passphrase", termsVersion: PUBLIC_TERMS_VERSION, privacyVersion: PUBLIC_PRIVACY_VERSION, adultAttested: true } });
  expect(signup.status(), await signup.text()).toBe(201);
  if (!separateAccount) primaryUsername = username;
  const privacy = await request.patch("/api/users/me/privacy-preferences", { headers: { origin }, data: { functionalStorageEnabled: false } });
  expect(privacy.ok()).toBeTruthy();
}
async function data(request: APIRequestContext, path: string) { return (await (await request.get(path)).json()).data; }
// Steps complete on the action itself and the tour moves on by itself.
async function expectStep(page: Page, title: string): Promise<void> { await expect(page.getByRole("complementary", { name: "Tour" })).toContainText(title); }
// The shell's own back-navigation list is UI state, not account or example data.
async function storageSnapshot(page: Page) {
  return page.evaluate(() => {
    const session = { ...sessionStorage };
    delete session["gymtrack.nav-history"];
    return { local: { ...localStorage }, session };
  });
}
async function noOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}

test("hands-on example uses real controls and cannot pollute the account", async ({ page }, testInfo) => {
  const request = page.request;
  await account(request);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  const invitation = page.getByRole("region", { name: "Try the example" });
  await expect(invitation).toBeVisible();
  await invitation.getByRole("link", { name: "Take the tour", exact: true }).click();
  await expect(page.getByRole("heading", { name: "See how it works" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("01-entry.png"), fullPage: true });
  const writes: string[] = [];
  page.on("request", (request) => { if (/\/api\/(workouts|sets|exercises|workout-templates|users\/me\/preferences)/.test(request.url()) && request.method() !== "GET") writes.push(`${request.method()} ${new URL(request.url()).pathname}`); });
  const before = await data(request, "/api/workouts");
  const storageBefore = await storageSnapshot(page);
  await page.getByRole("button", { name: "Start the tour" }).click();

  // 1. Log a set: the tour opens straight in the example workout.
  await expect(page).toHaveURL(/\/help\/demo\/session$/);
  await expectStep(page, "Log a set");
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Barbell Bench Press/ }).click();
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New set", exact: true });
  await editor.getByRole("textbox", { name: /^Weight/ }).fill("-1");
  await editor.getByRole("button", { name: "Save set", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("Enter a weight");
  await editor.getByRole("textbox", { name: /^Weight/ }).fill("20");
  await editor.getByRole("textbox", { name: /^Reps/ }).fill("8");
  await editor.getByRole("radio", { name: "2", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("02-editor.png"), fullPage: true });
  await expect(page).toHaveTitle(/Hands-on example/);
  await expectNoSeriousAccessibilityViolations(page);
  await expectModalContract(page, editor);
  await editor.getByRole("button", { name: "Save set", exact: true }).click();

  // 2. Finish. Editing a set isn't a step any more, but still works.
  await expectStep(page, "Finish the workout");
  await page.getByRole("button", { name: /20 kg × 8/ }).click();
  const edit = page.getByRole("dialog", { name: "Edit set", exact: true });
  await expect(edit).toBeFocused();
  await edit.getByRole("textbox", { name: /^Weight/ }).fill("22.5");
  await edit.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: /22.5 kg × 8/ })).toBeVisible();
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByRole("button", { name: "Tap again to finish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Example workout complete" })).toBeVisible();

  // 3. Progress: the tour moves on by itself.
  await expect(page).toHaveURL(/\/help\/demo\/progress$/);
  await expectStep(page, "Check your progress");
  await page.getByRole("button", { name: "Previous day" }).click();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("03-progress.png"), fullPage: true });

  // 4. Volume.
  await expect(page).toHaveURL(/\/help\/demo\/volume$/);
  await expect(page.getByRole("heading", { name: "Muscle volume", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Chest/ }).click();
  await expect(page.getByRole("heading", { name: "Chest", exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("04-volume.png"), fullPage: true });

  await expect(page.getByRole("heading", { name: "You\u2019re set" })).toBeVisible();
  expect(writes).toEqual([]);
  expect(await data(request, "/api/workouts")).toEqual(before);
  expect(await storageSnapshot(page)).toEqual(storageBefore);
  await page.getByRole("button", { name: "Copy example template", exact: true }).click();
  await expect(page.getByRole("button", { name: "Template copied", exact: true })).toBeDisabled();
  expect(writes).toEqual(["POST /api/workout-templates"]);
  const templates = await data(request, "/api/workout-templates");
  expect(templates.items).toHaveLength(1);
  expect(templates.items[0].exercises).toHaveLength(3);
  expect(await data(request, "/api/workouts")).toEqual(before);
  const state = await data(request, "/api/users/me/onboarding");
  for (const lesson of ["log", "finish", "progress", "volume"]) expect(state.onboarding.steps[`demo_${lesson}_completed`]).toBe(true);
  for (const width of [430, 1440]) { await page.setViewportSize({ width, height: 900 }); await noOverflow(page); }
  await page.getByRole("link", { name: "View saved template", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit template", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Template name", exact: true })).toHaveValue("Example full-body");
  expect(writes).toEqual(["POST /api/workout-templates"]);
});

test("skip, reset, replay, unknown practice, and account switching stay isolated", async ({ page }) => {
  const request = page.request;
  await account(request);
  await page.goto("/");
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect.poll(async () => (await data(request, "/api/users/me/onboarding")).onboarding.steps.demoInvitationHandled).toBe(true);
  await page.reload();
  await expect(page.getByRole("region", { name: "Try the example" })).toHaveCount(0);
  await page.goto("/help/demo?lesson=finish");
  await page.getByRole("button", { name: "Start this step" }).click();
  // Wait for the lesson's workout page before leaving it, or the History tap
  // cancels that navigation and Back has nothing to return to.
  await expect(page).toHaveURL(/\/help\/demo\/session$/);
  await expect(page.getByRole("button", { name: /^Barbell Bench Press 1 set$/ })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "History", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workout history", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("button", { name: /^Barbell Bench Press 1 set$/ })).toBeVisible();
  // Ending the tour mid-step records it as skipped, not completed.
  await page.getByRole("button", { name: "End tour", exact: true }).click();
  await expect.poll(async () => (await data(request, "/api/users/me/onboarding")).onboarding.steps.demo_finish_skipped).toBe(true);
  expect((await data(request, "/api/users/me/onboarding")).onboarding.steps.demo_finish_completed).not.toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "See how it works" })).toBeVisible();
  await page.getByRole("button", { name: "Explore on my own" }).click();
  await expect(page.getByText("8 example workouts. Tap one to see its sets.")).toBeVisible();
  await page.goto("/help/demo/history/missing");
  await expect(page.getByRole("heading", { name: "See how it works" })).toBeVisible();
  await page.getByRole("button", { name: "Explore on my own" }).click();
  await page.getByRole("button", { name: "Exit example" }).first().click();
  await account(request, true);
  await page.reload();
  await expect(page.getByRole("region", { name: "Try the example" })).toBeVisible();
  expect((await data(request, "/api/users/me/onboarding")).onboarding.steps.demo_finish_skipped).toBeUndefined();
});

test("progress sync failures are non-blocking and retry from Help", async ({ page }) => {
  const request = page.request;
  await account(request);
  await page.route("**/api/users/me/onboarding", async (route) => {
    if (route.request().method() === "PATCH") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "offline" } }) });
    else await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(page.getByRole("region", { name: "Try the example" })).toHaveCount(0);
  await page.getByRole("link", { name: "Help", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry sync" })).toBeVisible();
  await page.unroute("**/api/users/me/onboarding");
  await page.getByRole("button", { name: "Retry sync" }).click();
  await expect(page.getByRole("button", { name: "Retry sync" })).toHaveCount(0);
  expect((await data(request, "/api/users/me/onboarding")).onboarding.steps.demoInvitationHandled).toBe(true);
});

test("returning users opt in, unavailable template copies fail safely, and real workouts resume", async ({ page }) => {
  const request = page.request;
  await account(request);
  await request.patch("/api/users/me/onboarding", { headers: { origin }, data: { version: 2, steps: { demoInvitationHandled: true, finishWorkout: true } } });
  const created = await request.post("/api/workouts", { headers: { origin }, data: {} });
  expect(created.ok()).toBeTruthy();
  const realWorkout = (await created.json()).data.workout;
  const before = await data(request, "/api/workouts");
  const templatesBefore = await data(request, "/api/workout-templates");
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Try the example" })).toHaveCount(0);
  await page.getByRole("link", { name: "Help", exact: true }).click();
  await page.getByRole("link", { name: "Take the tour", exact: true }).click();
  await page.getByRole("button", { name: "Explore on my own" }).click();
  await page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Home", exact: true }).click();
  await page.route("**/api/exercises?**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { items: [] } }) }));
  await page.getByRole("button", { name: "Copy example template", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No template was copied" })).toBeVisible();
  await page.unroute("**/api/exercises?**");
  await page.route("**/api/workout-templates", async (route) => {
    if (route.request().method() === "POST") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Template service unavailable. Try again." } }) });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Copy example template", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Template service unavailable" })).toBeVisible();
  expect(await data(request, "/api/workout-templates")).toEqual(templatesBefore);
  expect(await data(request, "/api/workouts")).toEqual(before);
  await page.getByRole("button", { name: "Start my workout", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/workouts/${realWorkout.id}$`));
  expect((await data(request, "/api/users/me/onboarding")).onboarding.steps.finishWorkout).toBe(true);
});
