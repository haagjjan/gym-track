import { expect, test } from "@playwright/test";

const statusOrigin = "https://status.gymtrack.ch";

test("public aggregate BFF is registered and usable by independent probes and the status page", async ({ request }) => {
  for (const origin of [null, statusOrigin]) {
    const response = await request.get("/api/public-status", {
      headers: origin ? { origin } : {}
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(response.headers()["access-control-allow-origin"]).toBe(origin ?? undefined);
    const { data } = await response.json();
    expect(Object.keys(data).sort()).toEqual([
      "activeAccounts", "activeBetaAccounts", "completedWorkoutsByWeek",
      "completedWorkoutsLast30Days", "generatedAt", "workoutRecordsProcessed"
    ]);
    expect(Number.isFinite(Date.parse(data.generatedAt))).toBeTruthy();
    expect(data.workoutRecordsProcessed).toBeGreaterThanOrEqual(0);
    expect(data.completedWorkoutsLast30Days).toBeGreaterThanOrEqual(0);
    expect(data.completedWorkoutsByWeek).toHaveLength(8);
  }
  const forbidden = await request.get("/api/public-status", { headers: { origin: "https://untrusted.example" } });
  expect(forbidden.status()).toBe(403);
  expect(forbidden.headers()["access-control-allow-origin"]).toBeUndefined();
});
