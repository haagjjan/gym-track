import { expect, type Locator, type Page, test } from "@playwright/test";

test.setTimeout(180_000);

test("completes the mobile workout flow and reviews redesigned screens", async ({ page }) => {
  const tag = `${Date.now()}${process.pid}`;
  const username = `smoke_${tag}`;
  const password = "secret";
  const pressName = "Incline Dumbbell Press";
  const rowName = "Barbell Row";

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/signup");
  await page.getByLabel("EMAIL_ADDRESS").fill(`${username}@example.com`);
  await page.getByLabel("OPERATOR_ID").fill(username);
  await page.getByLabel("ACCESS_CODE").fill(password);
  await page.getByRole("button", { name: "REGISTER_PROFILE" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /START_SESSION|RESUME_SESSION/i })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.request.post("/api/auth/logout");
  await page.goto("/login");
  await page.getByLabel("OPERATOR_ID").fill(username);
  await page.getByLabel("ACCESS_CODE").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /START_SESSION|RESUME_SESSION/i })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.goto("/workout");
  await expect(page.getByRole("heading", { name: /SELECT_OPERATION/i })).toBeVisible();
  await page.getByRole("button", { name: "START_EMPTY_SESSION" }).first().click();
  await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]+$/);
  const activeWorkoutUrl = page.url();

  await insertExercise(page, pressName, "Chest");
  const pressPanel = exercisePanel(page, pressName);
  await expect(pressPanel).toHaveClass(/sessionExerciseActive/);

  await saveSet(pressPanel, {
    kg: "40",
    reps: "10",
    rest: "60",
    rir: "4",
    type: "warmup"
  });
  await expect(pressPanel.locator(".setSummaryRow")).toHaveCount(1);
  await expect(pressPanel.locator(".setSummaryRow").first()).toContainText("40.00 kg x 10");

  await saveSet(pressPanel, {
    kg: "90",
    reps: "5",
    rest: "120",
    rir: "1",
    type: "working"
  });
  await expect(pressPanel.locator(".setSummaryRow")).toHaveCount(2);
  await expect(pressPanel.locator(".setSummaryRow").last()).toContainText("90.00 kg x 5");

  const workingSet = pressPanel.locator(".setSummaryRow").filter({ hasText: "90.00 kg x 5" });
  await workingSet.getByRole("button", { name: "EDIT" }).click();
  const editRow = pressPanel.locator(".setRowEditing");
  await editRow.getByLabel("Reps").fill("6");
  await editRow.getByRole("button", { name: "SAVE" }).click();
  await expect(pressPanel.locator(".setSummaryRow").last()).toContainText("90.00 kg x 6");

  await insertExercise(page, rowName, "Back");
  const rowPanel = exercisePanel(page, rowName);
  await expect(page.locator(".sessionExerciseActive")).toHaveCount(1);
  await expect(rowPanel).toHaveClass(/sessionExerciseActive/);
  await saveSet(rowPanel, {
    kg: "70",
    reps: "8",
    rest: "90",
    rir: "2",
    type: "working"
  });
  await expect(rowPanel.locator(".setSummaryRow")).toHaveCount(1);

  page.once("dialog", (dialog) => dialog.accept());
  await rowPanel.locator(".setSummaryRow").getByRole("button", { name: "DELETE" }).click();
  await expect(rowPanel.locator(".setSummaryRow")).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await rowPanel.getByRole("button", { name: "REMOVE" }).click();
  await expect(rowPanel).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "COMPLETE_SESSION" }).click();
  await expect(page.getByText("CLOSED")).toBeVisible();
  await expect(page.getByRole("button", { name: "COMPLETE_SESSION" })).toBeDisabled();
  await expectNoHorizontalScroll(page);

  await page.goto("/workouts");
  await expect(page.getByRole("heading", { name: /SESSION HISTORY/i })).toBeVisible();
  const historyCard = page.locator(".historyCard").filter({ hasText: pressName }).first();
  await expect(historyCard).toBeVisible();
  await historyCard.getByRole("button", { name: "EXPAND" }).click();
  await expect(historyCard).toContainText("90.00 kg x 6");

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: /PROGRESS ANALYTICS/i })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(pressName, "i") })).toBeVisible();
  await expect(page.getByRole("region", { name: /Weight and reps over/i })).toBeVisible();
  await page.getByRole("button", { name: "EST_1RM" }).click();
  await expect(page.getByRole("region", { name: /Estimated 1RM over/i })).toBeVisible();

  await page.goto("/weekly-volume");
  await expect(page.getByRole("heading", { name: /MUSCLE VOLUME/i })).toBeVisible();
  await expect(page.getByLabel("Weekly volume body map")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chest" })).toBeVisible();

  await expectRoutesToFit(page, [
    "/",
    "/workout",
    activeWorkoutUrl,
    "/workouts",
    "/progress",
    "/weekly-volume"
  ]);
});

async function insertExercise(page: Page, name: string, muscle: string): Promise<void> {
  const insertAction = page
    .getByRole("button", { name: /INSERT_(FIRST_)?EXERCISE/ })
    .first();

  await insertAction.click();
  const dialog = page.getByRole("dialog", { name: "Add exercise to session" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox", { name: "Exercise" }).fill(name);

  const existingOption = dialog.locator(".exerciseOption").filter({ hasText: name }).first();

  if (await isVisibleAfterLoad(existingOption)) {
    await existingOption.click();
    await expect(dialog).toBeHidden();
    return;
  }

  await dialog.locator(".createExerciseForm").getByLabel("Name").fill(name);
  await dialog.locator(".createExerciseForm").getByLabel("Primary muscle").selectOption({ label: muscle });
  await dialog.locator(".createExerciseForm").getByLabel("Equipment").fill("barbell");
  await dialog.locator(".createExerciseForm").getByLabel("Type").selectOption("compound");
  await dialog.getByRole("button", { name: "CREATE_ADD" }).click();
  await expect(dialog).toBeHidden();
}

async function isVisibleAfterLoad(locator: Locator): Promise<boolean> {
  return locator.waitFor({ state: "visible", timeout: 3_000 }).then(
    () => true,
    () => false
  );
}

async function saveSet(
  panel: Locator,
  values: {
    kg: string;
    reps: string;
    rest: string;
    rir: string;
    type: "warmup" | "working";
  }
): Promise<void> {
  await panel.getByLabel("Type").selectOption(values.type);
  await panel.getByLabel("Kg").fill(values.kg);
  await panel.getByLabel("Reps").fill(values.reps);
  await panel.getByLabel("RIR").fill(values.rir);
  await panel.getByLabel("Rest").fill(values.rest);
  await panel.getByRole("button", { name: "SAVE_SET" }).click();
  await expect(panel.getByText(/SET_\d+_SAVED/)).toBeVisible();
}

function exercisePanel(page: Page, name: string): Locator {
  return page.locator(".sessionExercise", { hasText: name });
}

async function expectRoutesToFit(page: Page, routes: string[]): Promise<void> {
  for (const width of [390, 430, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 900 });

    for (const route of routes) {
      await page.goto(route);
      await page.locator("main").waitFor({ state: "visible" });
      await expectNoHorizontalScroll(page);
    }
  }
}

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    bodyClient: document.body.clientWidth,
    bodyScroll: document.body.scrollWidth,
    docClient: document.documentElement.clientWidth,
    docScroll: document.documentElement.scrollWidth
  }));
  const maxClient = Math.max(metrics.bodyClient, metrics.docClient);
  const maxScroll = Math.max(metrics.bodyScroll, metrics.docScroll);

  expect(maxScroll).toBeLessThanOrEqual(maxClient + 1);
}
