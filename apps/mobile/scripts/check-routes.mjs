// Fails when a web route has no page in the app bundle, or the other way round
// (ADR 0024: two page trees, one checklist).
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const webApp = new URL("../../web/src/app/", import.meta.url).pathname;
const mobileApp = new URL("../src/app/", import.meta.url).pathname;

/** Web routes that are not part of the app, with the reason. */
const WEB_ONLY = new Map([
  ["/admin", "administrators use the web"]
]);
/** Web routes whose app page has another path (static export has no user-data params). */
const RENAMED = new Map([
  ["/workouts/[workoutId]", "/workouts/session"]
]);
/** App pages without a web route. */
const APP_ONLY = new Set(["/update"]);

function routes(root, dir = root) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) {
      return name === "api" && dir === root ? [] : routes(root, path);
    }

    return name === "page.tsx" ? [`/${relative(root, dir)}`.replace(/\/$/, "") || "/"] : [];
  });
}

const web = routes(webApp);
const mobile = new Set(routes(mobileApp));
const problems = [];

for (const route of web) {
  if (WEB_ONLY.has(route)) continue;
  const expected = RENAMED.get(route) ?? route;
  if (!mobile.has(expected)) problems.push(`Web route ${route} has no app page (${expected}).`);
  mobile.delete(expected);
}

for (const route of mobile) {
  if (!APP_ONLY.has(route)) problems.push(`App page ${route} has no web route.`);
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`Route check passed: ${web.length} web routes, ${WEB_ONLY.size} web-only.`);
