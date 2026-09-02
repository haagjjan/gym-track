const STATUS_CONFIG_URL = "./config.json";
const QUALITY_URL = "./quality.json";
const METRICS_URL = "https://app.gymtrack.ch/api/public-status";
const REPOSITORY_URL = "https://github.com/haagjjan/gym-track";
const REQUIRED_COMPONENTS = ["web-application", "api-and-database", "independent-status-page"];
const STATUS_PRIORITY = new Map([
  ["operational", 0], ["maintenance", 1], ["degraded", 2], ["downtime", 3], ["unknown", 4]
]);
const STATUS_LABELS = {
  operational: "Operational", maintenance: "Maintenance",
  degraded: "Degraded", downtime: "Disruption",
  unknown: "Unavailable"
};
const QUALITY_STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1_000;

export function parseBetterStackStatusUrl(value) {
  if (typeof value !== "string") throw new Error("Better Stack URL is missing");
  const url = new URL(value);
  const trustedHost = url.hostname.endsWith(".betteruptime.com")
    || url.hostname.endsWith(".betterstack.com")
    || url.hostname === "uptime.betterstack.com";

  if (url.protocol !== "https:" || !trustedHost || url.username || url.password) {
    throw new Error("Better Stack URL is not a trusted public HTTPS page");
  }

  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function parseMonitoringFeed(payload, sourceUrl = "") {
  const root = record(payload);
  const data = record(root.data);
  const attributes = record(data.attributes);
  const included = Array.isArray(root.included) ? root.included : [];
  const resources = included.filter((item) => record(item).type === "status_page_resource");
  const components = REQUIRED_COMPONENTS.map((key) => componentFrom(resources, key));
  const aggregate = statusValue(attributes.aggregate_state);
  const complete = components.every((component) => component.state !== "unknown");
  const overallState = complete
    ? worstStatus([aggregate, ...components.map((component) => component.state)])
    : "unknown";
  const availabilities = components.map((component) => component.availability)
    .filter((value) => Number.isFinite(value));
  const reports = included.filter((item) => record(item).type === "status_report")
    .map((item) => incidentFrom(item, included))
    .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt));

  return {
    overallState,
    components,
    uptime: availabilities.length === REQUIRED_COMPONENTS.length
      ? Math.min(...availabilities)
      : null,
    updatedAt: isoDate(attributes.updated_at),
    activeIncidents: reports.filter((incident) => incident.endsAt === null),
    resolvedIncidents: reports.filter((incident) => incident.endsAt !== null).slice(0, 3),
    sourceUrl
  };
}

export function parsePublicMetrics(payload) {
  const data = record(record(payload).data);
  const accounts = record(data.activeBetaAccounts);
  const generatedAt = isoDate(data.generatedAt);
  const workouts = nonNegativeInteger(data.workoutRecordsProcessed, "workout count");
  let activeAccounts;

  if (accounts.kind === "below_threshold") {
    activeAccounts = {
      kind: "below_threshold",
      threshold: nonNegativeInteger(accounts.threshold, "account threshold")
    };
  } else if (accounts.kind === "exact") {
    activeAccounts = {
      kind: "exact",
      value: nonNegativeInteger(accounts.value, "active accounts")
    };
  } else {
    throw new Error("active account disclosure is invalid");
  }

  return { generatedAt, activeAccounts, workoutRecordsProcessed: workouts };
}

export function parseQualitySummary(payload) {
  const value = record(payload);
  const coverage = record(value.coverage);
  const commitSha = typeof value.commitSha === "string" ? value.commitSha : "";

  if (value.schemaVersion !== 1 || !/^[0-9a-f]{7,40}$/i.test(commitSha)) {
    throw new Error("quality evidence identity is invalid");
  }

  return {
    commitSha,
    verifiedAt: isoDate(value.verifiedAt),
    apiLines: percentage(coverage.apiLines),
    webLines: percentage(coverage.webLines)
  };
}

export function qualityFreshness(verifiedAt, now = new Date()) {
  const age = now.getTime() - Date.parse(verifiedAt);
  return age >= 0 && age <= QUALITY_STALE_AFTER_MS ? "verified" : "stale";
}

function componentFrom(resources, key) {
  const item = resources.find((candidate) => componentKey(record(record(candidate).attributes).public_name) === key);
  if (!item) return { key, state: "unknown", availability: null };
  const attributes = record(record(item).attributes);

  return {
    key,
    state: statusValue(attributes.status),
    availability: availabilityPercentage(attributes.availability)
  };
}

function componentKey(value) {
  return typeof value === "string"
    ? value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : "";
}

function incidentFrom(item, included) {
  const value = record(item);
  const attributes = record(value.attributes);
  const relationships = record(value.relationships);
  const updateIds = Array.isArray(record(relationships.status_updates).data)
    ? record(relationships.status_updates).data.map((update) => String(record(update).id ?? ""))
    : [];
  const messages = included.filter((candidate) => {
    const update = record(candidate);
    return update.type === "status_update" && updateIds.includes(String(update.id ?? ""));
  }).map((candidate) => record(record(candidate).attributes))
    .sort((left, right) => Date.parse(String(right.published_at)) - Date.parse(String(left.published_at)));
  const latestMessage = messages[0]?.message;
  return {
    title: typeof attributes.title === "string" ? attributes.title : "Service incident",
    message: typeof latestMessage === "string" ? latestMessage : "See the monitoring source for details.",
    startsAt: isoDate(attributes.starts_at),
    endsAt: attributes.ends_at === null ? null : isoDate(attributes.ends_at),
    state: statusValue(attributes.aggregate_state)
  };
}

function statusValue(value) {
  return typeof value === "string" && STATUS_PRIORITY.has(value) ? value : "unknown";
}

function worstStatus(states) {
  return states.reduce((worst, state) =>
    (STATUS_PRIORITY.get(state) ?? 4) > (STATUS_PRIORITY.get(worst) ?? 4) ? state : worst,
  "operational");
}

function availabilityPercentage(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const normalized = value <= 1 ? value * 100 : value;
  return normalized <= 100 ? normalized : null;
}

function percentage(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("coverage percentage is invalid");
  }
  return value;
}

function nonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} is invalid`);
  return value;
}

function isoDate(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error("timestamp is invalid");
  }
  return new Date(value).toISOString();
}

function record(value) {
  return value && typeof value === "object" ? value : {};
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`request failed: ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function refreshMonitoring() {
  try {
    const config = record(await fetchJson(STATUS_CONFIG_URL));
    const sourceUrl = parseBetterStackStatusUrl(config.betterStackStatusUrl);
    const feed = await fetchJson(`${sourceUrl}/index.json`);
    renderMonitoring(parseMonitoringFeed(feed, sourceUrl));
  } catch {
    renderMonitoringUnavailable();
  }
}

async function refreshMetrics() {
  try {
    renderMetrics(parsePublicMetrics(await fetchJson(METRICS_URL)));
  } catch {
    setText("accounts-value", "Unavailable");
    setText("workouts-value", "Unavailable");
    setState("accounts-dot", "unavailable");
    setState("workouts-dot", "unavailable");
    setText("accounts-note", "The live aggregate endpoint could not be reached");
    setText("metrics-updated", "Live project metrics unavailable");
  }
}

async function refreshQuality() {
  try {
    renderQuality(parseQualitySummary(await fetchJson(QUALITY_URL)));
  } catch {
    setText("api-coverage", "Unavailable");
    setText("web-coverage", "Unavailable");
    setText("coverage-note", "No verified coverage artifact is available");
    setState("coverage-dot", "unavailable");
    setState("build-state", "unavailable");
    document.querySelector("#build-state strong").textContent = "Evidence unavailable";
  }
}

function renderMonitoring(view) {
  setState("overall-card", view.overallState);
  setText("overall-title", overallTitle(view.overallState));
  setText("overall-summary", overallSummary(view.overallState));
  setText("monitor-updated", formatDate(view.updatedAt));
  for (const component of view.components) renderComponent(component);
  renderIncidents("active-incidents", view.activeIncidents, "No active incidents reported.");
  renderIncidents("resolved-incidents", view.resolvedIncidents, "No resolved incidents in the public feed.");
  setText("active-incident-count", String(view.activeIncidents.length));
  const source = document.getElementById("monitor-source");
  source.href = view.sourceUrl;
  source.hidden = false;
  document.getElementById("monitor-source-missing").hidden = true;

  if (view.uptime === null) {
    setText("uptime-value", "Unavailable");
    setText("uptime-note", "The complete 90-day monitor history is unavailable");
    setState("uptime-dot", "unavailable");
  } else {
    setText("uptime-value", `${view.uptime.toFixed(2)}%`);
    setText("uptime-note", "Lowest availability among all required monitors");
    setState("uptime-dot", "operational");
  }
}

function renderMonitoringUnavailable() {
  setState("overall-card", "unknown");
  setText("overall-title", "Live status unavailable");
  setText("overall-summary", "The independent monitoring feed could not be verified. No operational claim is being made.");
  setText("monitor-updated", "Unavailable");
  setText("uptime-value", "Unavailable");
  setText("uptime-note", "Better Stack configuration or feed unavailable");
  setText("active-incident-count", "—");
  setState("uptime-dot", "unavailable");
  for (const key of REQUIRED_COMPONENTS) renderComponent({ key, state: "unknown" });
  renderIncidents("active-incidents", [], "Live incident feed unavailable.");
  renderIncidents("resolved-incidents", [], "Incident history unavailable.");
}

function renderComponent(component) {
  const row = document.querySelector(`[data-component="${component.key}"]`);
  if (!row) return;
  const state = row.querySelector(".service-state");
  state.dataset.state = component.state;
  state.lastChild.textContent = ` ${STATUS_LABELS[component.state] ?? STATUS_LABELS.unknown}`;
}

function renderIncidents(targetId, incidents, emptyMessage) {
  const target = document.getElementById(targetId);
  target.replaceChildren();
  if (incidents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyMessage;
    target.append(empty);
    return;
  }
  for (const incident of incidents) target.append(incidentElement(incident));
}

function incidentElement(incident) {
  const article = document.createElement("article");
  article.className = "incident-item";
  const title = document.createElement("strong");
  title.textContent = incident.title;
  const message = document.createElement("p");
  message.textContent = incident.message;
  const time = document.createElement("time");
  time.dateTime = incident.endsAt ?? incident.startsAt;
  time.textContent = incident.endsAt
    ? `Resolved ${formatDate(incident.endsAt)}`
    : `Started ${formatDate(incident.startsAt)}`;
  article.append(title, message, time);
  return article;
}

function renderMetrics(metrics) {
  const accounts = metrics.activeAccounts.kind === "exact"
    ? number(metrics.activeAccounts.value)
    : `Fewer than ${metrics.activeAccounts.threshold}`;
  setText("accounts-value", accounts);
  setText("workouts-value", number(metrics.workoutRecordsProcessed));
  setText("accounts-note", `Fresh aggregate generated ${formatDate(metrics.generatedAt)}`);
  setText("metrics-updated", `Live metrics recounted ${formatDate(metrics.generatedAt)}`);
  setState("accounts-dot", "operational");
  setState("workouts-dot", "operational");
}

function renderQuality(quality) {
  const freshness = qualityFreshness(quality.verifiedAt);
  const shortSha = quality.commitSha.slice(0, 7);
  setText("api-coverage", `${quality.apiLines.toFixed(1)}%`);
  setText("web-coverage", `${quality.webLines.toFixed(1)}%`);
  setText("coverage-note", `${freshness === "verified" ? "Verified" : "Stale"} at commit ${shortSha}`);
  setState("coverage-dot", freshness === "verified" ? "operational" : "stale");
  setState("build-state", freshness);
  document.querySelector("#build-state strong").textContent = freshness === "verified"
    ? "All repository checks passed"
    : "Verification is older than 14 days";
  const link = document.getElementById("commit-link");
  link.textContent = shortSha;
  link.href = `${REPOSITORY_URL}/commit/${quality.commitSha}`;
  setText("build-verified", formatDate(quality.verifiedAt));
}

function overallTitle(state) {
  return {
    operational: "All monitored systems operational",
    degraded: "Some systems are degraded",
    downtime: "Service disruption detected",
    maintenance: "Scheduled maintenance underway",
    unknown: "Live status unavailable"
  }[state];
}

function overallSummary(state) {
  return {
    operational: "The web app, API/database path, and independent status host are responding normally.",
    degraded: "At least one monitored surface is responding with reduced reliability.",
    downtime: "At least one monitored surface is unavailable. See the incident log for updates.",
    maintenance: "Planned maintenance is affecting at least one monitored surface.",
    unknown: "The monitoring feed is incomplete or unavailable. No operational claim is being made."
  }[state];
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value)) + " UTC";
}

function number(value) {
  return new Intl.NumberFormat("en").format(value);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function setState(id, value) {
  document.getElementById(id).dataset.state = value;
}

function start() {
  void refreshMonitoring();
  void refreshMetrics();
  void refreshQuality();
  window.setInterval(refreshMonitoring, 60_000);
  window.setInterval(refreshMetrics, 5 * 60_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void refreshMonitoring();
      void refreshMetrics();
    }
  });
}

if (typeof document !== "undefined") start();
