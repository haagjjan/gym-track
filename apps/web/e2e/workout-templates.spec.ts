import { expect, test } from "@playwright/test";

test.setTimeout(180_000);

test("creates, filters, edits, and launches a workout template", async ({ page }) => {
  const tag = `${Date.now().toString(36)}${process.pid.toString(36)}`;
  const username = `template_${tag}`;
  const templateName = `Push ${tag}`;

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/signup");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/EMAIL_ADDRESS/).fill(`${username}@example.com`);
  await page.getByLabel(/OPERATOR_ID/).fill(username);
  await page.getByLabel(/ACCESS_CODE/).fill("template-passphrase-1");
  await page.getByRole("button", { name: "REGISTER" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();

  await page.goto("/workouts/templates");
  const tabs = page.getByRole("navigation", { name: "Workout sections" });
  await expect(tabs.getByRole("link", { name: "Workout History" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Workout Templates" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Exercise List" })).toBeVisible();

  await page.getByRole("button", { name: /New template/i }).click();
  await page.getByLabel("TEMPLATE_NAME").fill(templateName);
  await page.getByRole("button", { name: "Choose exercises" }).click();
  const picker = page.getByRole("dialog", { name: "Choose template exercises" });
  await picker.getByRole("searchbox").fill("Bench Press");
  await picker.getByRole("button", { name: /^Bench Press\b/ }).first().click();
  await picker.getByRole("button", { name: "Add selected exercises (1)" }).click();
  await expect(page.getByRole("button", { name: /^REPLACE$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove Bench Press" }).click();
  await expect(page.getByRole("button", { name: "Remove Bench Press" })).toHaveCount(0);
  await page.getByRole("button", { name: "Choose exercises" }).click();
  const reopenedPicker = page.getByRole("dialog", { name: "Choose template exercises" });
  await reopenedPicker.getByRole("searchbox").fill("Bench Press");
  await reopenedPicker.getByRole("button", { name: /^Bench Press\b/ }).first().click();
  await reopenedPicker.getByRole("button", { name: "Add selected exercises (1)" }).click();
  await page.getByRole("button", { name: "SAVE_TEMPLATE" }).click();
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search workout templates" }).fill(templateName);
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();

  await page.getByRole("button", { name: /^Filters/ }).click();
  const filters = page.getByRole("dialog", { name: "Filter results" });
  await filters.getByText(/^Muscles/).click();
  await filters.getByLabel("Chest").check();
  await filters.getByLabel("Equipment").selectOption("barbell");
  await filters.getByLabel("Type").selectOption("compound");
  await filters.getByRole("button", { name: "Show results" }).click();
  await page.getByLabel("Sort").last().selectOption("name");
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();

  await page.goto("/settings");
  await page.goto("/workouts/templates");
  await expect(page.getByRole("searchbox", { name: "Search workout templates" })).toHaveValue("");
  await expect(page.getByLabel("Sort").last()).toHaveValue("name");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const restoredFilters = page.getByRole("dialog", { name: "Filter results" });
  await restoredFilters.getByText(/^Muscles/).click();
  await expect(restoredFilters.getByLabel("Chest")).toBeChecked();
  await expect(restoredFilters.getByLabel("Equipment")).toHaveValue("barbell");
  await expect(restoredFilters.getByLabel("Type")).toHaveValue("compound");
  await restoredFilters.getByRole("button", { name: "Show results" }).click();

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit Template" })).toBeVisible();
  await page.getByLabel("TEMPLATE_NAME").fill(`${templateName} changed`);
  await page.getByRole("button", { name: "CANCEL" }).click();
  const discard = page.getByRole("alertdialog", {
    name: "Discard unsaved template changes?"
  });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "DISCARD CHANGES" }).click();
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();

  // Exercise editability is account-scoped and edit forms keep both muscle
  // sections collapsed until the user chooses to inspect them.
  const ownedExerciseName = `Owner Lift ${alphabeticTag(tag)}`;
  await page.goto("/workouts/exercises");
  await page.getByRole("button", { name: /New exercise/i }).click();
  const createExercise = page.getByRole("dialog", { name: "Create exercise" });
  await createExercise.getByLabel("Name").fill(ownedExerciseName);
  const primaryMuscles = createExercise.locator("details").filter({ hasText: "Primary muscles" });
  await primaryMuscles.locator("summary").click();
  await primaryMuscles.getByLabel("Chest").check();
  await createExercise.getByLabel("Equipment").selectOption("barbell");
  await createExercise.getByLabel("Type").selectOption("compound");
  await createExercise.getByRole("button", { name: "Create exercise" }).click();
  const nameReview = page.getByRole("alertdialog", { name: "Save this exercise name?" });
  await expect(nameReview).toBeVisible();
  await nameReview.getByRole("button", { name: "SAVE EXERCISE" }).click();
  await expect(page.getByRole("heading", { name: ownedExerciseName })).toBeVisible();
  await page.getByRole("button", { name: /^Filters/ }).click();
  const exerciseFilters = page.getByRole("dialog", { name: "Filter results" });
  await exerciseFilters.getByLabel("Editability").selectOption("editable");
  await exerciseFilters.getByRole("button", { name: "Show results" }).click();
  await expect(page.getByRole("heading", { name: ownedExerciseName })).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  const editExercise = page.getByRole("dialog", { name: "Edit exercise" });
  await expect(editExercise.locator("details").filter({ hasText: "Primary muscles" })).not.toHaveAttribute("open", "");
  await expect(editExercise.locator("details").filter({ hasText: "Secondary muscles" })).not.toHaveAttribute("open", "");
  await editExercise.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: /^Filters/ }).click();
  const readOnlyFilters = page.getByRole("dialog", { name: "Filter results" });
  await readOnlyFilters.getByLabel("Editability").selectOption("readOnly");
  await readOnlyFilters.getByRole("button", { name: "Show results" }).click();
  const readOnlyInfo = page.getByRole("button", { name: /Read only/ }).first();
  await readOnlyInfo.click();
  await expect(page.getByRole("tooltip")).toContainText(/system exercise|Another user created/);

  await page.goto("/workouts/templates");
  await page
    .getByTestId("template-card")
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]+\?focusName=1$/);
  await expect(page.getByLabel("Workout name")).toHaveValue(templateName);
  const exerciseList = page.getByRole("list", { name: "Workout exercises" });
  const benchPressRow = exerciseList.getByRole("button", { name: /Bench Press \d+ sets$/ });
  await expect(benchPressRow).toHaveCount(1);
  await benchPressRow.click();

  await page.getByRole("button", { name: "Remove" }).click();
  const remove = page.getByRole("alertdialog", { name: "Remove Bench Press?" });
  await expect(remove).toBeVisible();
  await remove.getByRole("button", { name: "REMOVE EXERCISE" }).click();
  await expect(page.getByRole("list", { name: "Workout exercises" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Choose exercises" })).toBeVisible();
});

function alphabeticTag(value: string): string {
  return value.replace(/[0-9]/g, (digit) => String.fromCharCode(97 + Number(digit)));
}
