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

function start() {
  const controller = createStatusController({ fetchJson, onChange: createStatusRenderer(document) });
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
