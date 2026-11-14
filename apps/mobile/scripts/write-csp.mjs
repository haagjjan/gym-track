// Writes a Content-Security-Policy meta tag into every exported HTML file (ADR 0024).
// A Next.js export has inline bootstrap scripts, so each page gets the hashes of its
// own inline scripts. The build fails if a page ends up without a policy.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../out/", import.meta.url).pathname;
const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000";
const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    return statSync(path).isDirectory() ? htmlFiles(path) : name.endsWith(".html") ? [path] : [];
  });
}

let written = 0;

for (const file of htmlFiles(outDir)) {
  const html = readFileSync(file, "utf8");
  const hashes = new Set();

  for (const match of html.matchAll(inlineScript)) {
    if (match[1]) {
      hashes.add(`'sha256-${createHash("sha256").update(match[1]).digest("base64")}'`);
    }
  }

  const policy = [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' ${[...hashes].join(" ")}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' data: blob: ${apiOrigin}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'"
  ].join("; ");
  const tag = `<meta http-equiv="Content-Security-Policy" content="${policy}"/>`;

  if (!html.includes("<head>")) {
    throw new Error(`No <head> in ${file}`);
  }

  writeFileSync(file, html.replace("<head>", `<head>${tag}`));
  written += 1;
}

if (written === 0) {
  throw new Error("No exported HTML files found; run next build first.");
}

console.log(`CSP written to ${written} HTML files (connect-src ${apiOrigin}).`);
