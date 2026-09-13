import {
  freshness, MONITORING_MAX_AGE, METRICS_MAX_AGE, QUALITY_MAX_AGE,
  parseBetterStackStatusUrl, parseMonitoringFeed, parsePublicMetrics, parseQualitySummary
} from "./status-data.js";

export const REPOSITORY_URL = "https://github.com/haagjjan/gym-track";
export const METRICS_URL = "https://app.gymtrack.ch/api/public-status";
const CONDITIONS = {
  operational: ["GymTrack is operational", "The three monitored service checks are operational."],
  degraded: ["GymTrack is degraded", "The monitoring source reports reduced service. Review the services and incident updates below."],
  downtime: ["GymTrack is experiencing an outage", "The monitoring source reports a service outage. Review the services and incident updates below."],
  maintenance: ["Maintenance in progress", "The monitoring source reports maintenance. Review the services and incident updates below."],
  incomplete: ["Status information incomplete", "A required service check or the overall result could not be verified."],
  stale: ["Status information is out of date", "The last successful retrieval is over five minutes old. Current service health could not be verified."],
  checking: ["Checking service status", "Waiting for the monitoring source."]
};
const FAILURES = {
  unconfigured: "Live monitoring is not configured.",
  configuration: "Monitoring information could not be loaded.",
  provider: "The monitoring source could not be reached.",
  malformed: "The monitoring source returned information we could not verify.",
  invalid: "The retrieval time could not be verified."
};

export function monitoringPresentation(channel, now) {
  const age = channel.data ? freshness(channel.retrievedAt, MONITORING_MAX_AGE, now) : null;
  let state = channel.data?.overallState ?? "checking";
  if (state === "unknown") state = "incomplete";
  if (channel.error) state = "unavailable";
  if (age === "stale") state = "stale";
  if (age === "invalid") state = "unavailable";
  const [title, description] = CONDITIONS[state] ?? ["Live status unavailable", FAILURES[age === "invalid" ? "invalid" : channel.error]];
  return { state, title, description, confirmed: !channel.error && age === "fresh" };
}

export function evidenceState(channel, dateKey, maxAge, now) {
  if (channel.error) return "unavailable";
  if (!channel.data) return "checking";
  return freshness(channel.data[dateKey], maxAge, now);
}

// Fetch and clock are the external boundaries. Each channel owns its own request generation.
export function createStatusController({ fetchJson, now = Date.now, onChange }) {
  const state = { monitoring: {}, metrics: {}, quality: {} };
  const generation = { monitoring: 0, metrics: 0, quality: 0 };
  const notify = () => onChange(state, now());

  async function refreshMonitoring() {
    const request = ++generation.monitoring;
    notify(); // Expire old evidence before a resumed tab starts waiting for a response.
    let sourceUrl;
    let error = "configuration";
    try {
      const config = await fetchJson("./config.json");
      if (request !== generation.monitoring) return;
      error = "unconfigured";
      sourceUrl = parseBetterStackStatusUrl(config?.betterStackStatusUrl);
      error = "provider";
      const payload = await fetchJson(`${sourceUrl}/index.json`);
      if (request !== generation.monitoring) return;
      error = "malformed";
      const data = parseMonitoringFeed(payload, sourceUrl, now());
      state.monitoring = { data, sourceUrl, retrievedAt: now(), error: null };
    } catch (failure) {
      if (request !== generation.monitoring) return;
      if (error === "provider" && failure?.kind === "malformed") error = "malformed";
      state.monitoring = { ...state.monitoring, sourceUrl: sourceUrl ?? state.monitoring.sourceUrl, error };
    }
    notify();
  }

  async function refreshEvidence(key, url, parse) {
    const request = ++generation[key];
    notify();
    try {
      const data = parse(await fetchJson(url));
      if (request !== generation[key]) return;
      state[key] = { data, error: null };
    } catch {
      if (request !== generation[key]) return;
      state[key] = { error: "unavailable" };
    }
    notify();
  }

  return {
    refreshMonitoring,
    refreshMetrics: () => refreshEvidence("metrics", METRICS_URL, parsePublicMetrics),
    refreshQuality: () => refreshEvidence("quality", "./quality.json", parseQualitySummary),
    tick: notify
  };
}

export function activityPresentation(channel, now) {
  const state = evidenceState(channel, "generatedAt", METRICS_MAX_AGE, now);
  const messages = {
    checking: "Loading project activity…", unavailable: "Project activity is unavailable.",
    stale: "Project activity is out of date. Counts are not shown as current.",
    invalid: "Project activity has an invalid or future generation time."
  };
  return { state, message: messages[state] ?? "" };
}

export function qualityPresentation(channel, now) {
  const state = evidenceState(channel, "verifiedAt", QUALITY_MAX_AGE, now);
  const messages = {
    checking: "Loading build evidence…", unavailable: "Build evidence is unavailable.",
    stale: "Out of date — this evidence was generated over 14 days ago.",
    invalid: "Build evidence has an invalid or future generation time."
  };
  return { state, message: messages[state] ?? "" };
}
