import { expect, test } from "@playwright/test";
import { expectModalFocusTrap } from "./accessibility-assertions";

test.setTimeout(180_000);

test("creates, filters, edits, and launches a workout template", async ({ page }) => {
  const tag = `${Date.now().toString(36)}${process.pid.toString(36)}`;
  const username = `template_${tag}`;
  const templateName = `Push ${tag}`;

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/signup");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/Email address/i).fill(`${username}@example.com`);
  await page.getByLabel(/^Username$/i).fill(username);
  await page.getByLabel(/^Password \(at least 10 characters\)$/i).fill("template-passphrase-1");
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();
  const onboarding = page.getByRole("region", { name: "Try the example" });
  await expect(onboarding).toBeVisible();
  await onboarding.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(onboarding).toHaveCount(0);
  const storageChoice = page.getByRole("dialog", { name: "Device storage choice" });
  await storageChoice.getByRole("button", { name: "Save settings on this device" }).click();
  await expect(storageChoice).toHaveCount(0);

  await page.goto("/workouts/templates");
  // Templates is a pushed screen under the Workout tab, not a History sub-tab.
  await expect(page.getByRole("heading", { name: "Templates", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workout sections" })).toHaveCount(0);

  await page.getByRole("button", { name: /New template/i }).click();
  await page.getByLabel("Template name").fill(templateName);
  await page.getByRole("button", { name: "Choose exercises" }).click();
  const picker = page.getByRole("dialog", { name: "Choose template exercises" });
  await picker.getByRole("button", { name: /^Filters/ }).click();
  const nestedFilters = page.getByRole("dialog", { name: "Filter results" });
  await expect(nestedFilters.getByRole("button", { name: "Close filters" })).toBeFocused();
  await expectModalFocusTrap(page, nestedFilters);
  await page.keyboard.press("Escape");
  await expect(nestedFilters).toHaveCount(0);
  await expect(picker).toBeVisible();
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
  await page.getByRole("button", { name: "Save template" }).click();
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search workout templates" }).fill(templateName);
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();

  const templateFilterTrigger = page.getByRole("button", { name: /^Filters/ });
  await templateFilterTrigger.click();
  const filters = page.getByRole("dialog", { name: "Filter results" });
  await expect(filters.getByRole("button", { name: "Close filters" })).toBeFocused();
  await expectModalFocusTrap(page, filters);
  await page.keyboard.press("Escape");
  await expect(filters).toHaveCount(0);
  await expect(templateFilterTrigger).toBeFocused();
  await templateFilterTrigger.click();
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

  await page.getByRole("button", { name: `More actions for ${templateName}` }).click();
  await page.getByRole("dialog", { name: templateName }).getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit template" })).toBeVisible();
  await page.getByLabel("Template name").fill(`${templateName} changed`);
  await page.getByRole("button", { name: "CANCEL" }).click();
  const discard = page.getByRole("alertdialog", {
    name: "Discard changes?"
  });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();

  // Exercise editability is account-scoped and edit forms keep both muscle
  // sections collapsed until the user chooses to inspect them.
  const ownedExerciseName = `Owner Lift ${alphabeticTag(tag)}`;
  await page.goto("/workouts/exercises");
  await page.getByRole("button", { name: /New exercise/i }).click();
  const createExercise = page.getByRole("dialog", { name: "Create exercise" });
  await expect(createExercise.getByRole("button", { name: "Close exercise editor" })).toBeFocused();
  await expectModalFocusTrap(page, createExercise);
  const primaryMuscles = createExercise.getByRole("button", { name: /Primary muscles/ });
  await expect(primaryMuscles).toHaveAttribute("aria-expanded", "false");
  await primaryMuscles.click();
  await createExercise.getByLabel("Chest").check();
  await createExercise.getByLabel("Name").fill(ownedExerciseName);
  await createExercise.getByLabel("Equipment").selectOption("barbell");
  await createExercise.getByLabel("Type").selectOption("compound");
  await createExercise.getByRole("button", { name: "Create exercise" }).click();
  const nameReview = page.getByRole("alertdialog", { name: "Save this exercise name?" });
  await expect(nameReview).toBeVisible();
  await expect(nameReview.getByRole("button", { name: "CANCEL" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(nameReview).toHaveCount(0);
  await expect(createExercise).toBeVisible();
  await createExercise.getByRole("button", { name: "Create exercise" }).click();
  await nameReview.getByRole("button", { name: "Save exercise" }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  const exerciseFilters = page.getByRole("dialog", { name: "Filter results" });
  await exerciseFilters.getByLabel("Editability").selectOption("editable");
  await exerciseFilters.getByRole("button", { name: "Show results" }).click();
  await expect(page.getByRole("heading", { name: ownedExerciseName })).toBeVisible();
  const editExerciseTrigger = page.getByRole("button", { name: "Edit" });
  await editExerciseTrigger.click();
  const editExercise = page.getByRole("dialog", { name: "Edit exercise" });
  await expect(editExercise.getByRole("button", { name: "Close exercise editor" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(editExercise).toHaveCount(0);
  await expect(editExerciseTrigger).toBeFocused();
  await editExerciseTrigger.click();
  await expect(editExercise.getByRole("button", { name: /Primary muscles/ })).toHaveAttribute("aria-expanded", "false");
  await expect(editExercise.getByRole("button", { name: /Secondary muscles/ })).toHaveAttribute("aria-expanded", "false");
  await editExercise.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: /^Filters/ }).click();
  const readOnlyFilters = page.getByRole("dialog", { name: "Filter results" });
  await readOnlyFilters.getByLabel("Editability").selectOption("readOnly");
  await readOnlyFilters.getByRole("button", { name: "Show results" }).click();
  // Exercises the user can't edit say why in plain text on the row.
  await expect(page.getByText(/^(Built in|Shared)$/).first()).toBeVisible();

  await page.goto("/workouts/templates");
  await page
    .getByTestId("template-card")
    .getByRole("button", { name: `Start workout from ${templateName}`, exact: true })
    .click();
  await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]+\?focusName=1$/);
  await expect(page.getByLabel("Workout name")).toHaveValue(templateName);
  const exerciseList = page.getByRole("list", { name: "Workout exercises" });
  const benchPressRow = exerciseList.getByRole("button", { name: /^Bench Press (No sets yet|\d+ sets?)$/ });
  await expect(benchPressRow).toHaveCount(1);
  await benchPressRow.click();

  await page.getByRole("button", { name: "Remove exercise", exact: true }).click();
  const remove = page.getByRole("alertdialog", { name: "Remove Bench Press?" });
  await expect(remove).toBeVisible();
  await remove.getByRole("button", { name: "Remove exercise" }).click();
  await expect(page.getByRole("list", { name: "Workout exercises" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add exercises" })).toBeVisible();
});

function alphabeticTag(value: string): string {
  return value.replace(/[0-9]/g, (digit) => String.fromCharCode(97 + Number(digit)));
}
