import { activityPresentation } from "./status-state.js";

const number = (value) => new Intl.NumberFormat("en").format(value);
const date = (value) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value));
const disclosure = (value) => value.kind === "exact" ? number(value.value) : `under ${value.threshold}`;

export function createActivityRenderer(document) {
  const byId = (id) => document.getElementById(id);
  const text = (id, value) => { if (byId(id).textContent !== value) byId(id).textContent = value; };
  let previous = "";
  return (channel, now) => {
    const presentation = activityPresentation(channel, now);
    const current = presentation.state === "fresh";
    const data = channel.data;
    text("activity-notice", presentation.message);
    byId("activity-notice").hidden = !presentation.message;
    const accounts = data?.activeAccounts ?? data?.activeBetaAccounts;
    const legacy = Boolean(data && !data.activeAccounts);
    text("accounts-label", legacy ? "Enabled beta accounts" : "Enabled accounts");
    text("accounts-scope", legacy ? "Excludes administrators; total including admin is unavailable." : "Includes the owner/admin account.");
    text("accounts-value", current ? disclosure(accounts) : "—");
    text("workouts-value", current ? number(data.workoutRecordsProcessed) : "—");
    const recent = current ? data.completedWorkoutsLast30Days : null;
    text("recent-value", recent === null ? "—" : number(recent));
    const weeks = current ? data.completedWorkoutsByWeek : null;
    text("activity-breakdown-notice", current && (recent === null || weeks === null)
      ? "The additional activity breakdown is unavailable. Existing totals are shown above." : "");
    const signature = JSON.stringify(weeks);
    if (signature !== previous) {
      previous = signature;
      byId("weekly-chart").replaceChildren(...(weeks ? [weeklyChart(document, weeks)] : []));
      byId("weekly-rows").replaceChildren(...(weeks ? weeklyRows(document, weeks) : []));
    }
    byId("weekly-activity").hidden = !weeks;
    text("weekly-summary", weeks?.every((week) => week.count === 0)
      ? "No completed workouts in these eight weeks." : "Completed workouts by week. The current week is partial.");
  };
}

function weeklyRows(document, weeks) {
  return weeks.map((week, index) => {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = `${week.weekStart}${index === 7 ? " (partial)" : ""}`;
    const value = document.createElement("td");
    value.textContent = number(week.count);
    row.append(label, value);
    return row;
  });
}

function weeklyChart(document, weeks) {
  const svg = (tag, attributes, content) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (content !== undefined) node.textContent = content;
    return node;
  };
  const chart = svg("svg", { viewBox: "0 0 800 190", "aria-hidden": "true", focusable: "false" });
  const maximum = Math.max(1, ...weeks.map((week) => week.count));
  chart.append(svg("line", { x1: 8, y1: 140, x2: 792, y2: 140, class: "chart-baseline" }));
  weeks.forEach((week, index) => {
    const x = index * 100 + 20;
    const height = week.count / maximum * 105;
    chart.append(svg("rect", { x, y: 140 - height, width: 60, height,
      class: index === 7 ? "chart-bar chart-partial" : "chart-bar", "data-count": week.count }));
    chart.append(svg("text", { x: x + 30, y: 130 - height, "text-anchor": "middle", class: "chart-count" }, number(week.count)));
    chart.append(svg("text", { x: x + 30, y: 163, "text-anchor": "middle", class: "chart-date" }, date(week.weekStart)));
    if (index === 7) chart.append(svg("text", { x: x + 30, y: 182, "text-anchor": "middle", class: "chart-date" }, "Partial"));
  });
  return chart;
}
