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
  unknown: "Not verified"
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
  let sourceUrl;

  try {
    const config = record(await fetchJson(STATUS_CONFIG_URL));
    sourceUrl = parseBetterStackStatusUrl(config.betterStackStatusUrl);
  } catch {
    renderMonitoringUnavailable("No external observer is configured for this page yet.", "Not configured");
    return;
  }

  try {
    const feed = await fetchJson(`${sourceUrl}/index.json`);
    renderMonitoring(parseMonitoringFeed(feed, sourceUrl));
  } catch {
    renderMonitoringUnavailable("The external monitor could not be reached, so its verdict cannot be shown.", "Unreachable");
  }
}

async function refreshMetrics() {
  try {
    renderMetrics(parsePublicMetrics(await fetchJson(METRICS_URL)));
  } catch {
    setValue("accounts-value", "No data", true);
    setValue("workouts-value", "No data", true);
    setState("accounts-dot", "unavailable");
    setState("workouts-dot", "unavailable");
    setText("accounts-note", "The live aggregate endpoint could not be reached");
    setText("workouts-note", "The live aggregate endpoint could not be reached");
    setText("metrics-updated", "Live production metrics could not be recounted");
  }
}

async function refreshQuality() {
  try {
    renderQuality(parseQualitySummary(await fetchJson(QUALITY_URL)));
  } catch {
    setValue("api-coverage", "No data", true);
    setValue("web-coverage", "No data", true);
    setText("coverage-note", "No verified coverage artifact is available");
    setText("web-coverage-note", "No verified coverage artifact is available");
    setText("build-note", "No verified build evidence is available");
    renderCommit(null);
    setState("api-coverage-dot", "unavailable");
    setState("web-coverage-dot", "unavailable");
    setState("build-dot", "unavailable");
  }
}

function renderMonitoring(view) {
  renderOverall(view.overallState, overallSummary(view.overallState));
  setText("monitor-updated", freshness(view.updatedAt));
  document.getElementById("monitor-updated").title = formatDate(view.updatedAt);

  for (const component of view.components) renderComponent(component);

  renderIncidents("active-incidents", view.activeIncidents, "Nothing is broken that the monitors can see.");
  renderIncidents("resolved-incidents", view.resolvedIncidents, "No resolved incidents in the public feed.");
  setText("active-incident-count", String(view.activeIncidents.length));

  const source = document.getElementById("monitor-source");
  source.href = view.sourceUrl;
  source.hidden = false;
  document.getElementById("monitor-source-missing").hidden = true;

  if (view.uptime === null) {
    setValue("uptime-value", "No data", true);
    setText("uptime-note", "The complete 90-day monitor history is unavailable");
    setState("uptime-dot", "unavailable");
  } else {
    setValue("uptime-value", `${view.uptime.toFixed(2)}%`, false);
    setText("uptime-note", "Lowest availability among all three probes");
    setState("uptime-dot", "operational");
  }
}

function renderMonitoringUnavailable(summary, observerLabel) {
  renderOverall("unknown", summary);
  setText("monitor-updated", "No data");
  setValue("uptime-value", "No data", true);
  setText("uptime-note", "No external monitor verdict is available");
  setText("active-incident-count", "—");
  setState("uptime-dot", "unavailable");

  const source = document.getElementById("monitor-source");
  const missing = document.getElementById("monitor-source-missing");
  source.hidden = true;
  missing.hidden = false;
  missing.textContent = observerLabel;

  for (const key of REQUIRED_COMPONENTS) renderComponent({ key, state: "unknown" });
  renderIncidents("active-incidents", [], "The live incident feed is unavailable.");
  renderIncidents("resolved-incidents", [], "Incident history is unavailable.");
}

function renderOverall(state, summary) {
  setState("overall-band", state);
  setState("topbar-state", state);
  setText("overall-title", overallTitle(state));
  setText("overall-summary", summary);
  setText("topbar-state-label", STATUS_LABELS[state] ?? STATUS_LABELS.unknown);
}

function renderComponent(component) {
  const label = STATUS_LABELS[component.state] ?? STATUS_LABELS.unknown;

  for (const element of document.querySelectorAll(`[data-component="${component.key}"]`)) {
    element.dataset.state = component.state;
    const monitorState = element.querySelector(".monitor-state span");
    if (monitorState) monitorState.textContent = label;
    const probeState = element.querySelector(".probe-state");
    if (probeState) probeState.textContent = label;
  }
}

function renderIncidents(targetId, incidents, emptyMessage) {
  const target = document.getElementById(targetId);
  target.replaceChildren();

  if (incidents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = emptyMessage;
    target.append(empty);
    return;
  }

  for (const incident of incidents) target.append(incidentElement(incident));
}

function incidentElement(incident) {
  const article = document.createElement("article");
  article.className = incident.endsAt ? "incident" : "incident incident-active";
  article.dataset.state = incident.state;

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
    : `Under ${metrics.activeAccounts.threshold}`;

  setValue("accounts-value", accounts, false);
  setValue("workouts-value", number(metrics.workoutRecordsProcessed), false);
  setText("accounts-note", `Recounted ${freshness(metrics.generatedAt)}`);
  setText("workouts-note", "Erased rows are gone, so this count can fall");
  setText("metrics-updated", `Live production metrics recounted ${freshness(metrics.generatedAt)}`);
  setState("accounts-dot", "operational");
  setState("workouts-dot", "operational");
}

function renderQuality(quality) {
  const state = qualityFreshness(quality.verifiedAt);
  const shortSha = quality.commitSha.slice(0, 7);
  const dotState = state === "verified" ? "operational" : "stale";

  setValue("api-coverage", `${quality.apiLines.toFixed(1)}%`, false);
  setValue("web-coverage", `${quality.webLines.toFixed(1)}%`, false);
  setText("coverage-note", `Measured on ${shortSha}`);
  setText("web-coverage-note", "Same commit as the row above");
  setState("api-coverage-dot", dotState);
  setState("web-coverage-dot", dotState);
  setState("build-dot", dotState);
  setText("build-note", state === "verified"
    ? `All checks passed ${freshness(quality.verifiedAt)}`
    : `Older than 14 days — last passed ${formatDate(quality.verifiedAt)}`);

  renderCommit(quality.commitSha);
}

function renderCommit(commitSha) {
  const link = document.getElementById("commit-link");
  const holder = link.parentElement;

  if (commitSha === null) {
    link.textContent = "No data";
    link.removeAttribute("href");
    holder.classList.add("is-empty");
    return;
  }

  link.textContent = commitSha.slice(0, 7);
  link.href = `${REPOSITORY_URL}/commit/${commitSha}`;
  holder.classList.remove("is-empty");
}

function overallTitle(state) {
  return {
    operational: "Everything the monitors watch is up",
    degraded: "Something is degraded",
    downtime: "Service disruption",
    maintenance: "Planned maintenance",
    unknown: "Not verified right now"
  }[state];
}

function overallSummary(state) {
  return {
    operational: "The login surface, the path from the public API through to a live database read, and this page are all responding.",
    degraded: "At least one probe is seeing reduced reliability. The incident log below has the detail.",
    downtime: "At least one probe cannot reach the service. The incident log below has the detail.",
    maintenance: "Planned maintenance is affecting at least one probed surface.",
    unknown: "No operational claim is being made."
  }[state];
}

function freshness(value) {
  const seconds = Math.round((Date.now() - Date.parse(value)) / 1000);

  if (!Number.isFinite(seconds) || seconds < 0) return formatDate(value);
  if (seconds < 90) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return formatDate(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
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

function setValue(id, text, isEmpty) {
  const element = document.getElementById(id);
  element.textContent = text;
  element.classList.toggle("is-empty", isEmpty);
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
