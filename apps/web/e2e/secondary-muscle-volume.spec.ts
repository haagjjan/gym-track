import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { expectNoSeriousAccessibilityViolations } from "./accessibility-assertions";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test("shows half-credit muscle volume without changing logged workout counts", async ({ page }) => {
  const tag = `half_${Date.now()}${process.pid}`;
  await page.goto("/signup");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.getByLabel(/Email address/i).fill(`${tag}@example.test`);
  await page.getByLabel(/^Username$/i).fill(tag);
  await page.getByLabel(/^Password \(at least 10 characters\)$/i).fill("half-volume-password");
  await page.getByLabel(/at least 18 and live in Switzerland/i).check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.getByRole("button", { name: "Save settings on this device" }).click();
  const headers = { origin: new URL(page.url()).origin };
  const groupsResponse = await page.request.get("/api/muscle-groups");
  const groups = (await groupsResponse.json() as { data: { items: { id: string; slug: string }[] } }).data.items;
  const exerciseResponse = await page.request.post("/api/exercises", { headers, data: {
    name: `Machine chest press ${tag}`, equipment: "machine", exerciseType: "compound", confirmNameWarning: true,
    primaryMuscleGroupIds: [groups.find((item) => item.slug === "chest")!.id], secondaryMuscleGroupIds: [groups.find((item) => item.slug === "triceps")!.id]
  } });
  expect(exerciseResponse.status(), await exerciseResponse.text()).toBe(201);
  const exercise = (await exerciseResponse.json() as { data: { exercise: { id: string } } }).data.exercise;
  const workoutResponse = await page.request.post("/api/workouts", { headers, data: { title: "Half-credit volume check" } });
  expect(workoutResponse.status()).toBe(201);
  const workoutId = (await workoutResponse.json() as { data: { workout: { id: string } } }).data.workout.id;
  const occurrenceResponse = await page.request.post(`/api/workouts/${workoutId}/exercises`, { headers, data: { exerciseId: exercise.id, clientMutationId: randomUUID() } });
  expect(occurrenceResponse.status()).toBe(201);
  const occurrence = (await occurrenceResponse.json() as { data: { sessionExercise: { id: string } } }).data.sessionExercise;
  for (const setType of ["warmup", "working"]) {
    const set = await page.request.post(`/api/workouts/${workoutId}/exercises/${occurrence.id}/sets`, { headers, data: { clientMutationId: randomUUID(), setType, weightKg: "20", reps: 8, rir: 2 } });
    expect(set.status(), await set.text()).toBe(201);
  }
  expect((await page.request.post(`/api/workouts/${workoutId}/end`, { headers, data: {} })).status()).toBe(200);

  await page.goto("/weekly-volume");
  await expect(page.getByRole("button", { name: "Chest 1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Triceps 0.5", exact: true })).toBeVisible();
  await expect(page.getByText("Each working set counts as 1 for primary muscles and 0.5 for secondary muscles.", { exact: true })).toBeVisible();
  await expect(page.getByText("1.5 sets", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Triceps 0.5", exact: true }).click();
  const detail = page.getByRole("region", { name: "Selected muscle" });
  await expect(detail.getByRole("definition").filter({ hasText: /^0\.5sets$/ })).toBeVisible();
  await expect(detail.getByText("0.5 sets", { exact: true })).toHaveCount(2);
  await expect(detail.getByRole("link")).toHaveAttribute("href", `/workouts/${workoutId}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectNoSeriousAccessibilityViolations(page);
  await expect(page.getByRole("group", { name: "Muscle figure" })).toHaveAttribute("aria-busy", "false", { timeout: 30000 });
  await page.screenshot({ path: test.info().outputPath("secondary-volume-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: test.info().outputPath("secondary-volume-desktop.png"), fullPage: true });

  await page.goto("/");
  const week = page.getByRole("region", { name: "This week" });
  await expect(week.getByRole("term").filter({ hasText: /^Sets$/ }).locator("..").getByRole("definition")).toHaveText("2");
  const history = await page.request.get("/api/workouts");
  expect((await history.json() as { data: { items: { totalSets: number }[] } }).data.items[0]!.totalSets).toBe(2);
});
