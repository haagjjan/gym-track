import { expect, test } from "@playwright/test";

test("signs up and logs a workout through the UI", async ({ page }) => {
  const tag = `${Date.now()}${process.pid}`;
  const username = `smoke_${tag}`;
  const exerciseName = `Smoke Bench ${tag}`;

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

  await exerciseBlock.getByLabel("Kg").fill("90");
  await exerciseBlock.getByLabel("Reps").fill("5");
  await exerciseBlock.getByLabel("RIR").fill("1");
  await exerciseBlock.getByLabel("Rest").fill("120");
  await exerciseBlock.getByRole("button", { name: "Add set" }).click();

  await expect(exerciseBlock.locator(".setRow")).toHaveCount(1);
  await expect(exerciseBlock.locator(".setRow").getByLabel("Reps")).toHaveValue("5");

  await page.getByRole("button", { name: "End workout" }).click();
  await expect(page.getByText("Closed workout")).toBeVisible();
  await expect(page.getByRole("button", { name: "End workout" })).toBeDisabled();

  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await expect(page.locator(".historyRow").first()).toContainText("1 exercise");

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
  await expect(page.getByRole("heading", { name: exerciseName })).toBeVisible();
  await expect(page.locator(".setRow").getByLabel("Kg")).toHaveValue("90.00");

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
