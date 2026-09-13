import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import { SCENARIOS, PROVIDER, scenarioFixture } from "../status-fixtures.mjs";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const port = Number(process.env.STATUS_PREVIEW_PORT ?? 4173);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2" };

createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  const fixture = url.searchParams.get("fixture");
  response.setHeader("Cache-Control", "no-store");
  try {
    if (url.pathname === "/__fixture.js" && SCENARIOS.includes(fixture)) {
      response.setHeader("Content-Type", "text/javascript");
      response.end(fixtureScript(fixture));
      return;
    }
    const path = resolve(root, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error("Invalid path");
    let content = await readFile(path);
    if (extname(path) === ".html" && SCENARIOS.includes(fixture)) {
      content = content.toString().replace('<script type="module"', `<script src="./__fixture.js?fixture=${fixture}"></script>\n  <script type="module"`)
        .replace("<title>", `<title>LOCAL FIXTURE: ${fixture} — `);
    }
    response.setHeader("Content-Type", types[extname(path)] ?? "application/octet-stream");
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Status preview: http://127.0.0.1:${port}`);
  console.log(`Test-only scenarios: ?fixture=${SCENARIOS.join(", ")}`);
});

function fixtureScript(scenario) {
  const values = scenarioFixture(scenario);
  // Intercept only the existing data requests; page assets and runtime are unchanged.
  return `
const scenario = ${JSON.stringify(scenario)};
const values = ${JSON.stringify(values)};
const nativeFetch = window.fetch.bind(window);
let monitoringRequests = 0;
const nativeNow = Date.now;
let offset = 0;
Date.now = () => nativeNow() + offset;
window.fetch = async (input, options) => {
  const url = new URL(input, location.href);
  if (url.pathname.endsWith('/config.json')) return Response.json({ betterStackStatusUrl: scenario === 'unconfigured' ? null : ${JSON.stringify(PROVIDER)} });
  if (url.href === ${JSON.stringify(PROVIDER + "/index.json")}) {
    monitoringRequests++;
    if (scenario === 'stale' && monitoringRequests > 1) {
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Fixture timeout')), { once: true }));
    }
    if (scenario === 'unavailable') throw new Error('Fixture provider failure');
    if (scenario === 'malformed') return new Response('{invalid');
    if (scenario === 'stale') setTimeout(() => {
      offset = 6 * 60_000;
      document.dispatchEvent(new Event('visibilitychange'));
    }, 100);
    return Response.json(values.monitoring);
  }
  if (url.pathname.endsWith('/quality.json')) return scenario === 'build-missing' ? new Response('', { status: 404 }) : Response.json(values.quality);
  if (url.href === 'https://app.gymtrack.ch/api/public-status') return scenario === 'metrics-unavailable' ? new Response('', { status: 404 }) : Response.json(values.metrics);
  return nativeFetch(input, options);
};`;
}
