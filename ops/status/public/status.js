const STATUS_CONFIG_URL = "./config.json";
const QUALITY_URL = "./quality.json";
const METRICS_URL = "https://app.gymtrack.ch/api/public-status";
const REPOSITORY_URL = "https://github.com/haagjjan/gym-track";
const REQUIRED_COMPONENTS = ["web-application", "api-and-database", "independent-status-page"];
const STATUS_PRIORITY = new Map([
  ["operational", 0], ["maintenance", 1], ["degraded", 2], ["downtime", 3], ["unknown", 4]
]);
const STATUS_LABELS = {
  operational: "answering", maintenance: "maintenance",
  degraded: "degraded", downtime: "not answering",
  unknown: "no reading"
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

/* ── dom helpers ──────────────────────────────────────────────────── */

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = value;
}

/* A value wipes left-to-right only when it actually changed, because a fade
   means appearing and a wipe means being written. */
function setValue(id, value) {
  const element = byId(id);
  if (!element || element.textContent === value) return;
  element.textContent = value;
  element.classList.remove("is-fresh");
  void element.offsetWidth;
  element.classList.add("is-fresh");
}

function setState(element, state) {
  if (element) element.dataset.state = state;
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

/* ── monitoring ───────────────────────────────────────────────────── */

async function refreshMonitoring() {
  let sourceUrl;

  try {
    const config = record(await fetchJson(STATUS_CONFIG_URL));
    sourceUrl = parseBetterStackStatusUrl(config.betterStackStatusUrl);
  } catch {
    renderNoReading("no external observer is configured for this page yet");
    return;
  }

  try {
    renderMonitoring(parseMonitoringFeed(await fetchJson(`${sourceUrl}/index.json`), sourceUrl));
  } catch {
    renderNoReading("the independent monitor did not answer");
  }
}

function renderMonitoring(view) {
  const answering = view.components.filter((component) => component.state === "operational").length;
  applyState(view.overallState);
  setValue("verdict-fraction", `${answering}/3 probes answering`);
  setValue("topbar-fraction", `${answering}/3`);
  setText("verdict-rail", `better stack · ${formatTime(view.updatedAt)}`);
  setText("polling-line", `checked ${formatTime(view.updatedAt)} · monitors probe every 3 min · this page refetches every 60s · better stack, outside this system`);
  byId("polling-line")?.classList.add("caret");

  for (const component of view.components) renderComponent(component);
  renderIncidents(view.activeIncidents.concat(view.resolvedIncidents));

  if (view.uptime === null) {
    setValue("uptime-value", "—");
    setText("uptime-note", "better stack: incomplete history");
  } else {
    setValue("uptime-value", `${view.uptime.toFixed(2)}%`);
    setText("uptime-note", `better stack · lowest of 3 · ${formatTime(view.updatedAt)}`);
  }
}

function renderNoReading(reason) {
  applyState("unknown");
  setValue("verdict-fraction", "no reading");
  setValue("topbar-fraction", "—");
  setText("verdict-rail", "better stack: no answer");
  setText("polling-line", `${reason} · this page is making no claim about whether the service is up or down`);
  byId("polling-line")?.classList.remove("caret");

  for (const key of REQUIRED_COMPONENTS) renderComponent({ key, state: "unknown" });
  renderIncidents(null);
  setValue("uptime-value", "—");
  setText("uptime-note", "better stack: not configured");
}

function applyState(state) {
  setState(byId("overall-band"), state);
  setState(byId("topbar-state"), state);
}

function renderComponent(component) {
  for (const element of document.querySelectorAll(`[data-component="${component.key}"]`)) {
    element.dataset.state = component.state;
    const label = element.querySelector(".probe-state");
    if (label) label.textContent = STATUS_LABELS[component.state] ?? STATUS_LABELS.unknown;
  }
}

function renderIncidents(incidents) {
  const target = byId("incidents");
  if (!target) return;
  target.replaceChildren();

  if (incidents === null) {
    target.append(line("empty", "the incident feed did not answer."));
    return;
  }
  if (incidents.length === 0) {
    target.append(line("empty", "no incidents in the public feed."));
    return;
  }
  for (const incident of incidents) target.append(incidentElement(incident));
}

function incidentElement(incident) {
  const article = document.createElement("article");
  article.className = incident.endsAt ? "incident" : "incident incident-open";
  article.dataset.state = incident.state;

  const when = document.createElement("time");
  when.className = "incident-date";
  when.dateTime = incident.endsAt ?? incident.startsAt;
  when.textContent = `${formatDay(incident.endsAt ?? incident.startsAt)} · ${incident.endsAt ? "resolved" : "open"}`;

  const body = document.createElement("p");
  body.className = "incident-body";
  body.textContent = `${incident.title}. ${incident.message}`;

  article.append(when, body);
  return article;
}

function line(className, text) {
  const element = document.createElement("p");
  element.className = className;
  element.textContent = text;
  return element;
}

/* ── live metrics and build evidence ──────────────────────────────── */

async function refreshMetrics() {
  try {
    renderMetrics(parsePublicMetrics(await fetchJson(METRICS_URL)));
  } catch {
    setValue("accounts-value", "—");
    setValue("workouts-value", "—");
    setText("accounts-note", "app.gymtrack.ch: no response");
    setText("workouts-note", "app.gymtrack.ch: no response");
  }
}

function renderMetrics(metrics) {
  const accounts = metrics.activeAccounts.kind === "exact"
    ? number(metrics.activeAccounts.value)
    : `under ${metrics.activeAccounts.threshold}`;
  setValue("accounts-value", accounts);
  setValue("workouts-value", number(metrics.workoutRecordsProcessed));
  setText("accounts-note", `app.gymtrack.ch · ${formatTime(metrics.generatedAt)}`);
  setText("workouts-note", `app.gymtrack.ch · ${formatTime(metrics.generatedAt)}`);
}

async function refreshQuality() {
  try {
    renderQuality(parseQualitySummary(await fetchJson(QUALITY_URL)));
  } catch {
    setValue("api-coverage", "—");
    setValue("web-coverage", "—");
    setText("coverage-note", "no verified build artifact on this deploy");
    setText("web-coverage-note", "no verified build artifact on this deploy");
    setText("build-note", "no verified build artifact on this deploy");
    renderCommit(null);
  }
}

function renderQuality(quality) {
  const fresh = qualityFreshness(quality.verifiedAt) === "verified";
  const shortSha = quality.commitSha.slice(0, 7);
  setValue("api-coverage", `${quality.apiLines.toFixed(1)}%`);
  setValue("web-coverage", `${quality.webLines.toFixed(1)}%`);
  setText("coverage-note", `c8 --all · ${shortSha}`);
  setText("web-coverage-note", `c8 --all · ${shortSha}`);
  setText("build-note", fresh
    ? `github actions · ${formatDay(quality.verifiedAt)}`
    : `github actions · ${formatDay(quality.verifiedAt)} · older than 14 days`);
  renderCommit(quality.commitSha);
  setText("tb-revision", `${shortSha} (verified build)`);
  setText("tb-issued", `${formatDay(quality.verifiedAt)} ${formatTime(quality.verifiedAt)}`);
}

function renderCommit(commitSha) {
  const link = byId("commit-link");
  if (!link) return;
  if (commitSha === null) {
    link.textContent = "—";
    link.removeAttribute("href");
    return;
  }
  link.textContent = commitSha.slice(0, 7);
  link.href = `${REPOSITORY_URL}/commit/${commitSha}`;
}

/* ── the counterfactual machine ───────────────────────────────────── */

/* Exported so ops/status/status-data.test.mjs can assert every quotation
   verbatim against docs/decisions/. The page claims this in its margin. */
export const COUNTERFACTUALS = {
  "0009": {
    quote: "It also must preserve the checked-in Render configuration until a separate cleanup decision is made.",
    cite: "docs/decisions/0009-private-home-server-deployment-target.md",
    say: "The road not taken is ADR 0005, which is still checked in. Under it, the monitoring stack, the backup design, the reverse tunnel and the staging environment are all answers to questions a platform had already answered — so most of the evidence on this page would not exist to publish."
  },
  "0011": {
    quote: "Fastify receives those internal BFF requests rather than the original browser or Cloudflare request, so treating Fastify as a public edge or trusting arbitrary forwarding headers would not improve security or client attribution.",
    cite: "docs/decisions/0011-secure-single-owner-external-access.md",
    say: "The readiness audit found exactly that class of bug in the BFF's own attribution code, which trusted a browser-supplied cf-connecting-ip header. Without the BFF there is no second boundary to catch it behind."
  },
  "0015": {
    quote: "This is accepted because the alternative — isolation on separate hardware — would sacrifice fidelity to the exact edge path where the known defects live, and because the spare Mac mini is reserved as a recovery host.",
    cite: "docs/decisions/0015-staging-environment.md",
    say: "Separate hardware genuinely improves isolation, and the failure-domain count above goes up to say so. What it costs is fidelity: three of the defects the audit found are edge-only and invisible to CI."
  },
  "0018": {
    quote: "An always-on second Mac mini or immutable object storage remains the preferred future availability improvement.",
    cite: "docs/decisions/0018-persistent-reverse-backup-tunnel.md",
    say: "The record is right and the built system is worse. A scheduled run on 2026-08-27 failed with the destination unreachable, because the laptop has to be awake. Flipping this removes a failure mode rather than adding one."
  },
  "0019": {
    quote: "Moving the canonical page into the application would make it unavailable during the outage it is supposed to explain.",
    cite: "docs/decisions/0019-public-status-evidence.md",
    say: "Under this flip, everything you are reading is served from the machine it describes."
  }
};

function flipped() {
  return (document.body.dataset.cf ?? "").split(/\s+/).filter(Boolean);
}

function applyFlips(ids) {
  document.body.dataset.cf = ids.join(" ");
  for (const toggle of document.querySelectorAll(".cf-toggle")) {
    toggle.setAttribute("aria-pressed", String(ids.includes(toggle.dataset.adr)));
  }
  renderConsequences(ids);
  renderMeter(ids);
  const hash = ids.length ? `#cf=${ids.join(",")}` : " ";
  window.history.replaceState(null, "", hash);
}

function toggleAdr(id) {
  const ids = flipped();
  const next = ids.includes(id) ? ids.filter((value) => value !== id) : ids.concat(id);
  applyFlips(next.sort());
}

function renderConsequences(ids) {
  const out = byId("cf-out");
  if (!out) return;
  out.replaceChildren();

  if (ids.length === 0) {
    out.append(line("cf-out-empty", "As drawn. Flip a switch to read what the rejected road would have cost, quoted from the record."));
    return;
  }
  for (const id of ids) out.append(consequenceElement(id));
}

function consequenceElement(id) {
  const entry = COUNTERFACTUALS[id];
  const wrap = document.createElement("div");
  const quote = document.createElement("blockquote");
  quote.className = "cf-quote";
  quote.textContent = `“${entry.quote}”`;
  const cite = document.createElement("cite");
  cite.className = "cf-cite";
  cite.textContent = entry.cite;
  wrap.append(quote, cite, line("cf-say", entry.say));
  return wrap;
}

/* getComputedStyle reports an element's own display even inside a hidden
   ancestor, so ask layout instead: a node in a dropped host group has no boxes. */
function visibleChainNodes() {
  return [...document.querySelectorAll(".cf-chain .cf-node")]
    .filter((node) => node.getClientRects().length > 0);
}

function renderMeter(ids) {
  const nodes = visibleChainNodes();
  const detached = [...document.querySelectorAll(".cf-detached .cf-node")]
    .filter((node) => node.getClientRects().length > 0);
  const hops = nodes.filter((node) => !node.classList.contains("cf-node-page"));
  const domains = new Set(nodes.concat(detached).map((node) => node.dataset.domain));
  const struck = [...document.querySelectorAll("[data-requires]")]
    .filter((element) => element.dataset.requires.split(/\s+/).some((token) => ids.includes(token)));
  setValue("cf-hops", String(hops.length));
  setValue("cf-domains", String(domains.size));
  setValue("cf-flipped", String(ids.length));
  setValue("cf-struck", String(struck.length));
}

function readHash() {
  const match = /#cf=([0-9,]+)/.exec(window.location.hash);
  if (!match) return [];
  return match[1].split(",").filter((id) => /^[0-9]{4}$/.test(id) && id in COUNTERFACTUALS);
}

function startExplorer() {
  for (const toggle of document.querySelectorAll(".cf-toggle")) {
    toggle.addEventListener("click", () => toggleAdr(toggle.dataset.adr));
  }
  document.querySelector("[data-adr-reset]")?.addEventListener("click", () => applyFlips([]));
  applyFlips(readHash().sort());
}

/* ── formatting ───────────────────────────────────────────────────── */

function formatTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false
  }).format(new Date(value)) + " utc";
}

function formatDay(value) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC"
  }).format(new Date(value));
}

function number(value) {
  return new Intl.NumberFormat("en").format(value);
}

/* Consolas is materially narrower than SF Mono, and -0.045em on a narrow face
   reads as cramped rather than tight. Measure once, then let CSS decide. */
function calibrateMono() {
  const probe = document.createElement("span");
  probe.className = "mono-probe";
  probe.textContent = "0".repeat(40);
  document.body.append(probe);
  const size = parseFloat(getComputedStyle(probe).fontSize);
  const advance = probe.getBoundingClientRect().width / 40 / size;
  probe.remove();
  document.documentElement.dataset.monoAdvance = advance < 0.58 ? "narrow" : "normal";
}

function start() {
  calibrateMono();
  startExplorer();
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
