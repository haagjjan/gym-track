// Test-only examples. Never copied into public/ or used as a production fallback.
export const FIXTURE_SHA = "1234567890abcdef1234567890abcdef12345678";
export const PROVIDER = "https://gymtrack.betteruptime.com";
export const SCENARIOS = ["healthy", "incident", "degraded", "outage", "maintenance", "unavailable", "unconfigured", "malformed", "incomplete", "stale", "metrics-unavailable", "metrics-stale", "build-stale", "build-missing", "build-future"];

export function resource(publicName, status = "operational") {
  return { type: "status_page_resource", attributes: { public_name: publicName, status, availability: 1 } };
}

export function monitoringFixture(now = Date.now()) {
  const days = [3, 2, 1].map((offset) => ({
    day: new Date(now - offset * 86_400_000).toISOString().slice(0, 10), status: "operational",
    downtime_duration: 0, maintenance_duration: 0
  }));
  const included = [resource("Web application"), resource("API and database"), resource("Independent status page")];
  for (const item of included) item.attributes.status_history = structuredClone(days);
  return { data: { type: "status_page", attributes: { aggregate_state: "operational", updated_at: "2020-01-01T00:00:00Z" } }, included };
}

export function incidentFixture(now = Date.now(), resolved = false) {
  const start = new Date(now - 3_600_000).toISOString();
  const update = new Date(now - 600_000).toISOString();
  return [
    {
      id: "report-1", type: "status_report",
      attributes: { title: "Workout saves are delayed", starts_at: start, ends_at: resolved ? update : null, aggregate_state: resolved ? "resolved" : "degraded" },
      relationships: { status_updates: { data: [{ id: "update-1", type: "status_update" }] } }
    },
    { id: "update-1", type: "status_update", attributes: {
      message: resolved ? "Workout saves have recovered. We are continuing to review the cause."
        : "Some members may be unable to save a workout. We are investigating the database connection. Next update within 30 minutes.",
      published_at: update
    } }
  ];
}

export function metricsFixture(now = Date.now()) {
  return { data: { generatedAt: new Date(now).toISOString(), activeBetaAccounts: { kind: "below_threshold", threshold: 5 }, workoutRecordsProcessed: 105 } };
}

export function qualityFixture(now = Date.now()) {
  return { schemaVersion: 1, commitSha: FIXTURE_SHA, verifiedAt: new Date(now - 86_400_000).toISOString(), coverage: { apiLines: 49.96, webLines: 8.05 } };
}

export function scenarioFixture(scenario, now = Date.now()) {
  const monitoring = monitoringFixture(now);
  if (["incident", "degraded", "outage", "maintenance"].includes(scenario)) {
    const state = scenario === "outage" ? "downtime" : scenario === "maintenance" ? "maintenance" : "degraded";
    monitoring.data.attributes.aggregate_state = state;
    monitoring.included[1].attributes.status = state;
  }
  if (scenario === "incident") monitoring.included.push(...incidentFixture(now), ...incidentFixture(now - 86_400_000, true).map((item) => {
    const value = structuredClone(item);
    value.id += "-resolved";
    if (value.relationships) value.relationships.status_updates.data[0].id += "-resolved";
    return value;
  }));
  if (scenario === "incomplete") monitoring.included.pop();
  const metrics = metricsFixture(scenario === "metrics-stale" ? now - 16 * 60_000 : now);
  const quality = qualityFixture(now);
  if (scenario === "build-stale") quality.verifiedAt = new Date(now - 15 * 86_400_000).toISOString();
  if (scenario === "build-future") quality.verifiedAt = new Date(now + 86_400_000).toISOString();
  return { monitoring, metrics, quality };
}
