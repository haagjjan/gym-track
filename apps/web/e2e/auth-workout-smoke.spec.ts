import { expect, test } from "@playwright/test";

test("signs up and logs a workout through the UI", async ({ page }) => {
  const tag = `${Date.now()}${process.pid}`;
  const username = `smoke_${tag}`;
  const exerciseName = `Smoke Bench ${tag}`;
  const accessoryExerciseName = `Smoke Curl ${tag}`;
  const draftExerciseName = `Smoke Pressdown ${tag}`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${username}@example.com`);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: `Welcome, ${username}` })).toBeVisible();

  await page.getByRole("button", { name: "Start or resume workout" }).click();
  await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Workout" })).toBeVisible();

  await page.locator(".createExerciseForm").getByLabel("Name").fill(exerciseName);
  await page.locator(".createExerciseForm").getByLabel("Primary muscle").selectOption({ label: "Chest" });
  await page.locator(".createExerciseForm").getByLabel("Equipment").fill("barbell");
  await page.locator(".createExerciseForm").getByLabel("Type").selectOption("compound");
  await page.getByRole("button", { name: "Create and add" }).click();

  const exerciseBlock = page.locator(".sessionExercise", { hasText: exerciseName });
  await expect(exerciseBlock.getByRole("heading", { name: exerciseName })).toBeVisible();
  await expect(exerciseBlock).toHaveClass(/sessionExerciseActive/);

  await exerciseBlock.getByLabel("Kg").fill("90");
  await exerciseBlock.getByLabel("Reps").fill("5");
  await exerciseBlock.getByLabel("RIR").fill("1");
  await exerciseBlock.getByLabel("Rest").fill("120");
  await exerciseBlock.getByRole("button", { name: "Save set" }).click();

  await expect(exerciseBlock.locator(".setSummaryRow")).toHaveCount(1);
  await expect(exerciseBlock.locator(".setSummaryRow")).toContainText("90.00 kg x 5");

  await page.locator(".createExerciseForm").getByLabel("Name").fill(accessoryExerciseName);
  await page.locator(".createExerciseForm").getByLabel("Primary muscle").selectOption({ label: "Biceps" });
  await page.getByRole("button", { name: "Create and add" }).click();

  const accessoryBlock = page.locator(".sessionExercise", { hasText: accessoryExerciseName });
  await expect(page.locator(".sessionExerciseActive")).toHaveCount(1);
  await expect(accessoryBlock).toHaveClass(/sessionExerciseActive/);
  await expect(exerciseBlock.locator(".setForm")).toHaveCount(0);
  await expect(exerciseBlock).toContainText("1 set logged");
  await expect(exerciseBlock).toContainText("Last: 90.00 kg × 5 · RIR 1 · 120s rest");

  await accessoryBlock.getByLabel("Kg").fill("30");
  await accessoryBlock.getByLabel("Reps").fill("12");
  await accessoryBlock.getByLabel("RIR").fill("3");
  await accessoryBlock.getByLabel("Rest").fill("60");
  await exerciseBlock.getByRole("button", { name: "Open/Edit" }).click();
  await expect(accessoryBlock).toContainText("Draft set started");
  await accessoryBlock.getByRole("button", { name: "Open/Edit" }).click();
  await expect(accessoryBlock.getByLabel("Kg")).toHaveValue("30");
  await expect(accessoryBlock.getByLabel("Reps")).toHaveValue("12");
  await expect(accessoryBlock.getByLabel("RIR")).toHaveValue("3");
  await expect(accessoryBlock.getByLabel("Rest")).toHaveValue("60");

  await accessoryBlock.getByRole("button", { name: "Save set" }).click();
  await expect(accessoryBlock.locator(".setSummaryRow")).toHaveCount(1);
  await expect(accessoryBlock.getByLabel("Kg")).toHaveValue("30.00");
  await accessoryBlock.locator(".setSummaryRow").getByRole("button", { name: "Delete" }).click();
  await expect(accessoryBlock.locator(".setSummaryRow")).toHaveCount(0);

  await exerciseBlock.getByRole("button", { name: "Open/Edit" }).click();
  await expect(exerciseBlock).toHaveClass(/sessionExerciseActive/);
  await exerciseBlock.locator(".setSummaryRow").getByRole("button", { name: "Edit" }).click();
  await exerciseBlock.locator(".setRow").getByLabel("Reps").fill("6");
  await exerciseBlock.locator(".setRow").getByRole("button", { name: "Save" }).click();
  await expect(exerciseBlock.locator(".setSummaryRow")).toContainText("90.00 kg x 6");

  await page.locator(".createExerciseForm").getByLabel("Name").fill(draftExerciseName);
  await page.locator(".createExerciseForm").getByLabel("Primary muscle").selectOption({ label: "Triceps" });
  await page.getByRole("button", { name: "Create and add" }).click();

  const draftBlock = page.locator(".sessionExercise", { hasText: draftExerciseName });
  await expect(draftBlock).toHaveClass(/sessionExerciseActive/);
  await draftBlock.getByLabel("Kg").fill("22");
  await exerciseBlock.getByRole("button", { name: "Open/Edit" }).click();
  await expect(draftBlock).toContainText("Draft set started");
  await draftBlock.getByRole("button", { name: "Remove" }).click();
  await expect(draftBlock).toHaveCount(0);
  await expect(page.getByText("Draft set started")).toHaveCount(0);

  await accessoryBlock.getByRole("button", { name: "Up" }).click();
  await expect(accessoryBlock.locator(".positionBadge")).toHaveText("1");

  await page.getByRole("button", { name: "End workout" }).click();
  await expect(page.getByText("Closed workout")).toBeVisible();
  await expect(page.getByRole("button", { name: "End workout" })).toBeDisabled();

  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await expect(page.locator(".historyRow").first()).toContainText("2 exercises");

  const importedExerciseName = `CSV Row ${tag}`;
  const csv = [
    "workout_started_at,workout_ended_at,workout_type,workout_title,workout_notes,exercise_name,primary_muscle_group_slug,equipment,exercise_type,exercise_position,set_order,set_type,weight_kg,reps,rir,rest_time_seconds,set_note",
    `2026-05-20T08:00:00.000Z,2026-05-20T09:00:00.000Z,upper,CSV Upper,,${importedExerciseName},chest,dumbbell,compound,1,1,working,42.50,10,2,60,Smoke import`
  ].join("\n");

  await page.setInputFiles('input[name="workoutCsv"]', {
    name: "workouts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv)
  });
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("Imported 1 workout from 1 row.")).toBeVisible();
  await expect(page.getByText("CSV Upper")).toBeVisible();

  const download = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export CSV" }).click()
  ]).then(([file]) => file);

  expect(download.suggestedFilename()).toBe("gym-workouts.csv");

  await page.locator(".historyRow").first().click();
  const detailExerciseBlock = page.locator(".sessionExercise", { hasText: exerciseName });
  await expect(detailExerciseBlock.getByRole("heading", { name: exerciseName })).toBeVisible();
  await detailExerciseBlock.getByRole("button", { name: "Open/Edit" }).click();
  await expect(detailExerciseBlock.locator(".setSummaryRow")).toContainText("90.00 kg x 6");

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Exercise progress" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(exerciseName) })).toBeVisible();
  await expect(page.getByLabel("Weight and reps over time")).toBeVisible();

  await page.goto("/weekly-volume");
  await expect(page.getByRole("heading", { name: "Muscle heat map" })).toBeVisible();
  await expect(page.getByLabel("Weekly volume body map")).toBeVisible();
  await expect(page.locator("svg.bodyMap rect")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Chest" })).toBeVisible();
  await page.getByRole("button", { name: /Back, 0 working sets/ }).click();
  await expect(page.getByRole("heading", { name: "Back" })).toBeVisible();
});
