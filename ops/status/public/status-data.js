export const REQUIRED_COMPONENTS = ["web-application", "api-and-database", "independent-status-page"];
export const STATUS_LABELS = {
  operational: "Operational", degraded: "Degraded", downtime: "Down", maintenance: "Maintenance",
  unknown: "Not reported", unavailable: "Unavailable", stale: "Stale", checking: "Checking"
};
const PRIORITY = ["operational", "maintenance", "degraded", "downtime", "unknown"];
export const MONITORING_MAX_AGE = 5 * 60_000;
export const METRICS_MAX_AGE = 15 * 60_000;
export const QUALITY_MAX_AGE = 14 * 24 * 60 * 60_000;

export function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error("Invalid timestamp");
  }
  const day = value.slice(0, 10);
  const parsed = Date.parse(value);
  const timeParts = value.slice(11, 19).split(":").map(Number);
  if (!Number.isFinite(parsed) || timeParts[0] > 23 || timeParts[1] > 59 || timeParts[2] > 59
    || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
    throw new Error("Invalid timestamp");
  }
  return new Date(parsed).toISOString();
}

export function freshness(value, maxAge, now = Date.now()) {
  const time = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(time) || time > now) return "invalid";
  return now - time > maxAge ? "stale" : "fresh";
}

export function qualityFreshness(value, now = new Date()) {
  const state = freshness(value, QUALITY_MAX_AGE, Number(now));
  return state === "fresh" ? "verified" : state;
}

export function parseBetterStackStatusUrl(value) {
  if (typeof value !== "string") throw new Error("Better Stack URL is missing");
  const url = new URL(value);
  const trusted = url.hostname.endsWith(".betteruptime.com") || url.hostname.endsWith(".betterstack.com");
  if (url.protocol !== "https:" || !trusted || url.username || url.password) {
    throw new Error("Better Stack URL is not a trusted public HTTPS page");
  }
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function statusValue(value) {
  return PRIORITY.includes(value) ? value : "unknown";
}

export function parseMonitoringFeed(payload, sourceUrl = "", now = Date.now()) {
  const root = record(payload);
  const data = record(root.data);
  const attributes = record(data.attributes);
  if (data.type !== "status_page" || !Array.isArray(root.included) || !Object.keys(attributes).length) {
    throw new Error("Invalid monitoring response");
  }
  const resources = root.included.filter((item) => record(item).type === "status_page_resource");
  const components = REQUIRED_COMPONENTS.map((key) => componentFrom(resources, key, now));
  const states = [statusValue(attributes.aggregate_state), ...components.map((item) => item.state)];
  const overallState = states.reduce((worst, state) => PRIORITY.indexOf(state) > PRIORITY.indexOf(worst) ? state : worst);
  // updated_at describes a status-page record, not a probe observation. Freshness uses retrieval time.
  return { overallState, components, ...parseIncidents(root.included, now), sourceUrl };
}

function componentFrom(resources, key, now) {
  const matches = resources.filter((item) => componentKey(record(item.attributes).public_name) === key);
  if (matches.length !== 1) return { key, state: "unknown", history: [] };
  const attributes = record(matches[0].attributes);
  return { key, state: statusValue(attributes.status), history: parseHistory(attributes.status_history, now) };
}

function componentKey(value) {
  return typeof value === "string"
    ? value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "";
}

export function parsePublicMetrics(payload) {
  const data = record(record(payload).data);
  const accounts = record(data.activeBetaAccounts);
  const generatedAt = timestamp(data.generatedAt);
  const workoutRecordsProcessed = count(data.workoutRecordsProcessed);
  let activeAccounts;
  if (accounts.kind === "below_threshold" && accounts.threshold === 5) {
    activeAccounts = { kind: "below_threshold", threshold: 5 };
  } else if (accounts.kind === "exact" && count(accounts.value) >= 5) {
    activeAccounts = { kind: "exact", value: accounts.value };
  } else {
    throw new Error("Invalid account disclosure");
  }
  return { generatedAt, activeAccounts, workoutRecordsProcessed };
}

export function parseQualitySummary(payload) {
  const data = record(payload);
  if (data.schemaVersion !== 1 || !/^[0-9a-f]{40}$/i.test(data.commitSha ?? "")) {
    throw new Error("Invalid build identity");
  }
  const coverage = record(data.coverage);
  return {
    commitSha: data.commitSha, verifiedAt: timestamp(data.verifiedAt),
    apiLines: percentage(coverage.apiLines), webLines: percentage(coverage.webLines)
  };
}

function percentage(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) throw new Error("Invalid coverage");
  return value;
}

function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid count");
  return value;
}

export function parseHistory(value, now = Date.now()) {
  if (!Array.isArray(value)) return [];
  const entries = new Map();
  const duplicates = new Set();
  for (const candidate of value) {
    const entry = historyEntry(candidate, now);
    if (!entry) continue;
    if (entries.has(entry.day)) duplicates.add(entry.day);
    entries.set(entry.day, entry);
  }
  // Duplicate dates are ambiguous; do not choose an arbitrary healthy entry.
  return [...entries.values()].filter((entry) => !duplicates.has(entry.day))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function historyEntry(candidate, now) {
  const value = record(candidate);
  const day = value.day;
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const time = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== day || time > now) return null;
  const state = statusValue(value.status);
  if (state === "unknown") return null;
  const durations = [value.downtime_duration, value.maintenance_duration];
  if (durations.some((duration) => duration !== undefined &&
    (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0 || duration > 86_400))) return null;
  return { day, state, downtimeDuration: durations[0] ?? null, maintenanceDuration: durations[1] ?? null };
}

export function historySummary(components) {
  return components.filter((item) => item.history.length).map((item) => ({
    key: item.key, count: item.history.length,
    from: item.history[0].day, to: item.history.at(-1).day,
    nonOperationalDays: item.history.filter((entry) => entry.state !== "operational").length
  }));
}

export function parseIncidents(included, now = Date.now()) {
  const reports = included.filter((item) => record(item).type === "status_report");
  const incidents = reports.map((item) => incidentFrom(item, included, now));
  const valid = incidents.filter(Boolean);
  return {
    incidentsIncomplete: incidents.length !== valid.length || valid.some((item) => item.updateIncomplete),
    activeIncidents: valid.filter((item) => !item.resolved).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    resolvedIncidents: valid.filter((item) => item.resolved)
      .sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt)).slice(0, 3)
  };
}

function incidentFrom(item, included, now) {
  try {
    const attributes = record(item.attributes);
    const startsAt = validTime(attributes.starts_at, now);
    const endsAt = attributes.ends_at === null ? null : validTime(attributes.ends_at, now);
    if (endsAt && endsAt < startsAt) return null;
    const updates = incidentUpdates(item, included, now);
    const latest = updates.valid[0];
    // Public reports may explicitly say resolved with a null ends_at.
    const resolved = endsAt !== null || attributes.aggregate_state === "resolved";
    const resolvedAt = endsAt ?? (resolved ? latest?.publishedAt : null);
    if (resolved && !resolvedAt) return null;
    return {
      title: typeof attributes.title === "string" && attributes.title.trim() ? attributes.title : "Service incident",
      message: latest?.message ?? "No incident update was provided. View the monitoring source for details.",
      startsAt, endsAt, resolved, resolvedAt, updatedAt: latest?.publishedAt ?? null,
      state: statusValue(attributes.aggregate_state), updateIncomplete: updates.incomplete
    };
  } catch {
    return null;
  }
}

function incidentUpdates(item, included, now) {
  const references = record(record(item.relationships).status_updates).data;
  if (references !== undefined && !Array.isArray(references)) return { valid: [], incomplete: true };
  const ids = (Array.isArray(references) ? references : []).map((entry) => String(record(entry).id ?? ""));
  const candidates = included.filter((entry) => record(entry).type === "status_update" && ids.includes(String(entry.id)));
  const valid = candidates.map((entry) => {
    try {
      const value = record(entry.attributes);
      if (typeof value.message !== "string" || !value.message.trim()) return null;
      return { message: value.message, publishedAt: validTime(value.published_at, now) };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { valid, incomplete: valid.length !== ids.length };
}

function validTime(value, now) {
  const iso = timestamp(value);
  if (Date.parse(iso) > now) throw new Error("Future incident timestamp");
  return iso;
}
