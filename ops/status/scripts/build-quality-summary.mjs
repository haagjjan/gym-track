import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function buildQualitySummary(input) {
  const commitSha = String(input.commitSha ?? "");
  const verifiedAt = new Date(input.verifiedAt).toISOString();

  if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
    throw new Error("STATUS_QUALITY_COMMIT must be a full Git commit SHA.");
  }

  return {
    schemaVersion: 1,
    commitSha,
    verifiedAt,
    coverage: {
      apiLines: linePercentage(input.apiSummary, "API"),
      webLines: linePercentage(input.webSummary, "web")
    }
  };
}

async function main() {
  const apiPath = process.env.STATUS_API_COVERAGE ?? "coverage/api/coverage-summary.json";
  const webPath = process.env.STATUS_WEB_COVERAGE ?? "coverage/web/coverage-summary.json";
  const outputPath = process.env.STATUS_QUALITY_OUTPUT ?? "ops/status/public/quality.json";
  const [apiSummary, webSummary] = await Promise.all([
    readJson(apiPath),
    readJson(webPath)
  ]);
  const summary = buildQualitySummary({
    apiSummary,
    webSummary,
    commitSha: process.env.STATUS_QUALITY_COMMIT,
    verifiedAt: process.env.STATUS_QUALITY_VERIFIED_AT ?? new Date()
  });

  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function linePercentage(summary, label) {
  const percentage = summary?.total?.lines?.pct;

  if (typeof percentage !== "number" || percentage < 0 || percentage > 100) {
    throw new Error(`${label} coverage summary has no valid total line percentage.`);
  }

  return percentage;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
