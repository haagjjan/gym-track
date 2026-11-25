import { createActivityRenderer } from "./status-activity.js";
import { STATUS_LABELS, buildTimelineDays, formatAvailability, historySummary, windowAvailability } from "./status-data.js";
import { monitoringPresentation, qualityPresentation, REPOSITORY_URL } from "./status-state.js";

const SERVICE_NAMES = {
  "web-application": "Web application", "api-and-database": "Public metrics endpoint",
  "independent-status-page": "Independent status page"
};

function formatDayDate(day) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${day}T00:00:00Z`));
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0 min";
  if (seconds < 60) return `${seconds} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function dayDetailText(entry) {
  if (entry.state === "nodata") return "No monitoring data recorded for this day.";
  const parts = [];
  if (typeof entry.downtimeDuration === "number") {
    const pct = Math.max(0, Math.min(1, 1 - entry.downtimeDuration / 86_400));
    parts.push(`${(pct * 100).toFixed(2)}% uptime`);
    parts.push(entry.downtimeDuration > 0 ? `Downtime: ${formatDuration(entry.downtimeDuration)}` : "No downtime recorded");
  }
  if (typeof entry.maintenanceDuration === "number" && entry.maintenanceDuration > 0) {
    parts.push(`Maintenance: ${formatDuration(entry.maintenanceDuration)}`);
  }
  return parts.join(" · ") || "No downtime recorded";
}

function dayStatusLabel(state) {
  return state === "nodata" ? "No data" : STATUS_LABELS[state] ?? state;
}

export function absoluteTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "UTC", hour12: false
  }).format(new Date(value)) + " UTC";
}

export function relativeTime(value, now) {
  const seconds = Math.max(0, Math.floor((now - Number(new Date(value))) / 1_000));
  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} hr ago`;
  return `${Math.floor(seconds / 86_400)} days ago`;
}

export function createStatusRenderer(document) {
  const byId = (id) => document.getElementById(id);
  const text = (id, value) => { if (byId(id).textContent !== value) byId(id).textContent = value; };
  const show = (id, visible) => { byId(id).hidden = !visible; };
  const signatures = new Map();
  const pinnedDays = new Map();
  let announced = "";
  let rangeDays = 30;
  let lastState = null;
  let lastNow = Date.now();
  const renderActivity = createActivityRenderer(document);

  function render(state, now) {
    lastState = state;
    lastNow = now;
    const monitoring = monitoringPresentation(state.monitoring, now);
    byId("overall").dataset.state = monitoring.state;
    text("overall-title", monitoring.title);
    text("overall-description", monitoring.description);
    const announcement = `${monitoring.title}. ${monitoring.description}`;
    if (monitoring.state !== "checking" && announcement !== announced) {
      text("status-announcement", announcement);
      announced = announcement;
    }
    renderRetrieval(state.monitoring, now);
    renderServices(state.monitoring, monitoring, now);
    renderIncidents(state.monitoring, monitoring);
    renderHistory(state.monitoring, monitoring);
    renderActivity(state.metrics, now);
    renderActivityTime(state.metrics, now);
    renderQuality(state.quality, now);
    for (const link of document.querySelectorAll("[data-monitoring-source]")) {
      link.hidden = !state.monitoring.sourceUrl;
      if (state.monitoring.sourceUrl) link.href = state.monitoring.sourceUrl;
      else link.removeAttribute("href");
    }
  }

  function showInspector(wrap, entry) {
    const inspector = wrap.querySelector(".timeline-inspector");
    if (!inspector) return;
    if (!entry) {
      inspector.hidden = true;
      return;
    }
    inspector.hidden = false;
    inspector.dataset.dayState = entry.state;
    inspector.querySelector(".inspector-date").textContent = formatDayDate(entry.day);
    inspector.querySelector(".inspector-status").textContent = dayStatusLabel(entry.state);
    inspector.querySelector(".inspector-detail").textContent = dayDetailText(entry);
  }

  function renderServices(channel, presentation, now) {
    const list = byId("service-list");
    if (list) list.dataset.range = String(rangeDays);
    for (const row of document.querySelectorAll("[data-component]")) {
      const key = row.dataset.component;
      const component = channel.data?.components.find((item) => item.key === key);
      const state = presentation.confirmed ? component?.state ?? "unknown"
        : presentation.state === "checking" ? "checking" : presentation.state === "stale" ? "stale" : "unavailable";
      row.dataset.state = state;
      row.querySelector(".service-state").textContent = STATUS_LABELS[state];

      const days = presentation.confirmed && component ? buildTimelineDays(component.history, rangeDays, now) : null;
      const uptime = days ? formatAvailability(windowAvailability(days, component.availability)) : null;

      const uptimeEl = row.querySelector(".service-uptime");
      if (uptimeEl) {
        uptimeEl.hidden = !uptime;
        uptimeEl.textContent = uptime ?? "";
      }

      const wrap = row.querySelector(".service-timeline-wrap");
      if (!wrap) continue;
      wrap.hidden = !days;
      if (!days) continue;

      const sigKey = `timeline:${key}`;
      const signature = JSON.stringify([rangeDays, days]);
      if (signatures.get(sigKey) === signature) continue;
      signatures.set(sigKey, signature);

      const bar = wrap.querySelector(".service-timeline");
      const pinned = pinnedDays.get(key) ?? null;
      let pinnedEntry = null;
      const buttons = days.map((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "timeline-day";
        button.dataset.day = entry.day;
        button.dataset.dayState = entry.state;
        const isPinned = pinned === entry.day;
        if (isPinned) pinnedEntry = entry;
        button.setAttribute("aria-pressed", String(isPinned));
        button.setAttribute("aria-label", `${formatDayDate(entry.day)}: ${dayStatusLabel(entry.state)}. ${dayDetailText(entry)}`);
        button.addEventListener("mouseenter", () => showInspector(wrap, entry));
        button.addEventListener("focus", () => showInspector(wrap, entry));
        button.addEventListener("click", () => {
          const nextPinned = pinnedDays.get(key) === entry.day ? null : entry.day;
          if (nextPinned) pinnedDays.set(key, nextPinned);
          else pinnedDays.delete(key);
          for (const item of bar.querySelectorAll(".timeline-day")) {
            item.setAttribute("aria-pressed", String(item.dataset.day === nextPinned));
          }
          showInspector(wrap, nextPinned ? entry : null);
        });
        return button;
      });
      bar.replaceChildren(...buttons);
      bar.onmouseleave = () => {
        const currentPinned = pinnedDays.get(key);
        const match = currentPinned ? days.find((entry) => entry.day === currentPinned) : null;
        showInspector(wrap, match ?? null);
      };
      wrap.querySelector(".timeline-from").textContent = `${rangeDays} days ago`;
      wrap.querySelector(".timeline-to").textContent = "Today";
      showInspector(wrap, pinnedEntry);
    }
  }

  function renderRetrieval(channel, now) {
    show("retrieval", Number.isFinite(channel.retrievedAt));
    if (!Number.isFinite(channel.retrievedAt)) return;
    const prefix = channel.error ? "Last retrieved" : "Retrieved";
    text("retrieval-age", `${prefix} ${relativeTime(channel.retrievedAt, now)}`);
    const time = byId("retrieval-time");
    time.dateTime = new Date(channel.retrievedAt).toISOString();
    time.textContent = absoluteTime(channel.retrievedAt);
  }

  function replace(id, value, build) {
    const signature = JSON.stringify(value);
    if (signatures.get(id) === signature) return;
    signatures.set(id, signature);
    byId(id).replaceChildren(...build());
  }

  function renderIncidents(channel, presentation) {
    const data = channel.data;
    const active = data?.activeIncidents ?? [];
    const incomplete = data?.incidentsIncomplete;
    const unconfirmed = !presentation.confirmed;
    show("active-incidents", active.length > 0 || incomplete || unconfirmed);
    show("active-title", active.length > 0);
    text("active-title", unconfirmed ? "Last received incident (current state unconfirmed)" : "Active incidents");
    const notice = unconfirmed ? presentation.state === "checking"
      ? "Checking incident information…" : "Current incident information is unavailable."
      : incomplete ? "Some incident information could not be verified. Check the monitoring source." : "";
    text("incident-notice", notice);
    show("incident-notice", Boolean(notice));
    replace("active-list", [active, unconfirmed, channel.sourceUrl], () =>
      active.map((incident) => incidentElement(incident, channel.sourceUrl, unconfirmed)));
  }

  function incidentElement(incident, sourceUrl, unconfirmed) {
    const article = document.createElement("article");
    article.className = incident.resolved ? "incident resolved" : "incident";
    article.dataset.state = unconfirmed ? "unavailable" : incident.state;
    article.append(element("h3", "", incident.title));
    const state = incident.resolved ? "Resolved" : STATUS_LABELS[incident.state] ?? "State not reported";
    const date = incident.resolvedAt ?? incident.updatedAt ?? incident.startsAt;
    const label = incident.resolved ? "Resolved" : incident.updatedAt ? "Updated" : "Started";
    const metadata = element("p", "metadata", incident.resolved ? "" : `${state} · `);
    const time = element("time", "", `${label} ${absoluteTime(date)}`);
    time.dateTime = date;
    metadata.append(time);
    article.append(metadata, element("p", "incident-message", incident.message));
    if (sourceUrl) {
      const link = element("a", "incident-source", "View monitoring source");
      link.href = sourceUrl;
      article.append(link);
    }
    return article;
  }

  function renderHistory(channel, presentation) {
    const summaries = channel.data ? historySummary(channel.data.components) : [];
    const resolved = channel.data?.resolvedIncidents ?? [];
    const confirmed = presentation.confirmed;
    const from = summaries.map((item) => item.from).sort()[0];
    const to = summaries.map((item) => item.to).sort().at(-1);
    const prefix = confirmed ? "Provider entries" : "Last received entries (current feed unconfirmed)";
    text("history-summary", summaries.length ? `${prefix}: ${from}–${to}, for ${summaries.length} of 3 monitors.`
      : confirmed ? "No daily history is available in the current feed." : "Reliability information is unavailable.");
    show("history-details", summaries.length > 0);
    replace("history-records", summaries, () => summaries.map((summary) => {
      const row = document.createElement("div");
      row.append(element("dt", "", SERVICE_NAMES[summary.key]), element("dd", "",
        `${summary.from}–${summary.to}: ${summary.count} daily entries; ${summary.nonOperationalDays} reported non-operational.`));
      return row;
    }));
    show("resolved-title", resolved.length > 0);
    text("resolved-title", confirmed ? "Recently resolved" : "Previously reported as resolved");
    text("resolved-empty", confirmed ? channel.data.incidentsIncomplete
      ? "Incident history is incomplete." : "No resolved incidents in the available feed." : "Incident history is unavailable.");
    show("resolved-empty", resolved.length === 0);
    replace("resolved-list", [resolved, confirmed, channel.sourceUrl], () =>
      resolved.map((incident) => incidentElement(incident, channel.sourceUrl, !confirmed)));
  }

  function renderActivityTime(channel, now) {
    const data = channel.data;
    const valid = data && Date.parse(data.generatedAt) <= now;
    show("activity-time", Boolean(valid));
    if (valid) {
      text("activity-time", `Generated ${relativeTime(data.generatedAt, now)} · ${absoluteTime(data.generatedAt)}`);
      byId("activity-time").dateTime = data.generatedAt;
    }
  }

  function renderQuality(channel, now) {
    const presentation = qualityPresentation(channel, now);
    const valid = ["fresh", "stale"].includes(presentation.state);
    const data = channel.data;
    byId("build-evidence").dataset.freshness = presentation.state;
    text("build-notice", presentation.message);
    show("build-notice", Boolean(presentation.message));
    show("build-record", valid);
    show("verification-scope", valid);
    show("coverage-method", valid);
    if (!valid) return;
    text("commit-link", data.commitSha.slice(0, 7));
    byId("commit-link").href = `${REPOSITORY_URL}/commit/${data.commitSha}`;
    byId("commit-link").setAttribute("aria-label", `View verified commit ${data.commitSha} on GitHub`);
    text("build-time", absoluteTime(data.verifiedAt));
    byId("build-time").dateTime = data.verifiedAt;
    text("api-coverage", `${data.apiLines.toFixed(1)}%`);
    text("web-coverage", `${data.webLines.toFixed(1)}%`);
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = content;
    return node;
  }
  render.setRange = (days) => {
    if (![7, 30, 90].includes(days) || days === rangeDays) return;
    rangeDays = days;
    if (lastState) render(lastState, lastNow);
  };
  return render;
}
