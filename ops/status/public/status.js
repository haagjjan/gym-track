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
const PREVIEW_READY_TYPE = "gymtrack:demo-ready";
const PREVIEW_PING_TYPE = "gymtrack:demo-ping";
const PREVIEW_LOAD_GRACE_MS = 1_500;
const PREVIEW_TIMEOUT_MS = 6_000;
const PREVIEW_FALLBACKS = {
  "/demo": { src: "./images/workout.webp", alt: "GymTrack workout screen static preview" },
  "/demo/progress": { src: "./images/progress.webp", alt: "GymTrack progress screen static preview" },
  "/demo/volume": { src: "./images/volume.webp", alt: "GymTrack muscle volume screen static preview" },
  "/demo/history": { src: "./images/workout.webp", alt: "GymTrack workout history static preview" }
};

function initPreviewControls() {
  const screen = document.getElementById("phone-screen");
  const frame = document.getElementById("app-preview-frame");
  const openLink = document.getElementById("preview-open-link");
  const fallback = document.getElementById("preview-fallback");
  const fallbackImage = document.getElementById("preview-fallback-image");
  const fallbackStatus = document.getElementById("preview-fallback-status");
  const retryButton = document.getElementById("preview-retry");
  const buttons = [...document.querySelectorAll(".preview-tab[data-preview-path]")];
  if (!frame || !buttons.length) return;

  let currentPath = "/demo";
  let state = "static";
  let fallbackTimer = null;

  const clearFallbackTimer = () => {
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  };

  const setState = (nextState) => {
    state = nextState;
    if (screen) screen.dataset.previewState = nextState;
    if (fallback) fallback.hidden = nextState === "live";
    if (retryButton) retryButton.hidden = nextState !== "fallback";
    if (fallbackStatus) {
      if (nextState === "loading") fallbackStatus.textContent = "Loading interactive preview…";
      else if (nextState === "fallback") fallbackStatus.textContent = "Interactive preview unavailable. Showing static preview.";
    }
  };

  const scheduleFallback = (delayMs) => {
    clearFallbackTimer();
    if (state === "live") return;
    fallbackTimer = setTimeout(() => {
      if (state !== "live") setState("fallback");
    }, delayMs);
  };

  const syncSelection = (path) => {
    const normalized = path.startsWith("/demo/progress")
      ? "/demo/progress"
      : path.startsWith("/demo/volume")
        ? "/demo/volume"
        : path.startsWith("/demo/history")
          ? "/demo/history"
          : "/demo";
    currentPath = normalized;
    const asset = PREVIEW_FALLBACKS[normalized] ?? PREVIEW_FALLBACKS["/demo"];
    if (fallbackImage) {
      if (fallbackImage.getAttribute("src") !== asset.src) fallbackImage.setAttribute("src", asset.src);
      fallbackImage.alt = asset.alt;
    }
    if (openLink) openLink.href = `${APP_ORIGIN}${normalized}`;
    for (const item of buttons) {
      item.setAttribute("aria-pressed", String(item.dataset.previewPath === normalized));
    }
  };

  const loadPreview = (path, { forceReload = false } = {}) => {
    syncSelection(path);
    const target = `${APP_ORIGIN}${currentPath}`;
    if (state !== "live") {
      setState("loading");
      scheduleFallback(PREVIEW_TIMEOUT_MS);
    }
    if (forceReload || frame.getAttribute("src") !== target) {
      frame.setAttribute("src", target);
    }
  };

  const pingFrame = () => {
    try {
      frame.contentWindow?.postMessage({ type: PREVIEW_PING_TYPE }, APP_ORIGIN);
    } catch {
      // Cross-origin frame not ready yet.
    }
  };

  setState("loading");
  if (typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        if (state === "loading") {
          pingFrame();
          scheduleFallback(PREVIEW_TIMEOUT_MS);
        }
      }
    }, { rootMargin: "200px" });
    observer.observe(frame);
  } else {
    scheduleFallback(PREVIEW_TIMEOUT_MS);
  }

  frame.addEventListener("load", () => {
    if (state !== "live") {
      pingFrame();
      scheduleFallback(PREVIEW_LOAD_GRACE_MS);
    }
  });
  frame.addEventListener("error", () => {
    clearFallbackTimer();
    setState("fallback");
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== APP_ORIGIN || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== "object" || data.type !== PREVIEW_READY_TYPE) return;
    clearFallbackTimer();
    setState("live");
    if (typeof data.path === "string" && data.path.startsWith("/demo")) {
      syncSelection(data.path);
    }
  });

  pingFrame();

  if (retryButton) {
    retryButton.addEventListener("click", () => {
      setState("loading");
      scheduleFallback(PREVIEW_TIMEOUT_MS);
      frame.setAttribute("src", `${APP_ORIGIN}${currentPath}`);
    });
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const path = button.dataset.previewPath;
      if (!path || !path.startsWith("/demo")) return;
      loadPreview(path);
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
