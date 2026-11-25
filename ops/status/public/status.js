import { createStatusController } from "./status-state.js";
import { createStatusRenderer } from "./status-view.js";

export async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      cache: "no-store", credentials: "omit", headers: { accept: "application/json" }, signal: controller.signal
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    try { return await response.json(); }
    catch { throw Object.assign(new Error("Invalid JSON"), { kind: "malformed" }); }
  } finally { clearTimeout(timeout); }
}

const APP_ORIGIN = "https://app.gymtrack.ch";

function initPreviewControls() {
  const frame = document.getElementById("app-preview-frame");
  const openLink = document.getElementById("preview-open-link");
  const buttons = [...document.querySelectorAll(".preview-tab[data-preview-path]")];
  if (!frame || !buttons.length) return;

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const path = button.dataset.previewPath;
      if (!path || !path.startsWith("/demo")) return;
      const target = `${APP_ORIGIN}${path}`;
      if (frame.getAttribute("src") !== target) frame.setAttribute("src", target);
      if (openLink) openLink.href = target;
      for (const item of buttons) {
        item.setAttribute("aria-pressed", String(item === button));
      }
    });
  }
}

function initRangeControls(renderer) {
  const buttons = [...document.querySelectorAll(".range-btn[data-timeline-range]")];
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const days = Number(button.dataset.timelineRange);
      if (![7, 30, 90].includes(days)) return;
      for (const item of buttons) {
        item.setAttribute("aria-pressed", String(item === button));
      }
      renderer.setRange(days);
    });
  }
}

function start() {
  initPreviewControls();
  const renderer = createStatusRenderer(document);
  initRangeControls(renderer);
  const controller = createStatusController({ fetchJson, onChange: renderer });
  const refresh = () => {
    controller.tick();
    void controller.refreshMonitoring();
    void controller.refreshMetrics();
    void controller.refreshQuality();
  };
  refresh();
  setInterval(() => { controller.tick(); void controller.refreshMonitoring(); }, 60_000);
  setInterval(() => { void controller.refreshMetrics(); }, 5 * 60_000);
  setInterval(controller.tick, 15_000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
}

if (typeof document !== "undefined") start();
