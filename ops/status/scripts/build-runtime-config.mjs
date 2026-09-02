import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function buildRuntimeConfig(value) {
  const candidate = typeof value === "string" ? value.trim() : "";

  if (!candidate) return { betterStackStatusUrl: null };

  try {
    const url = new URL(candidate);
    const trusted = url.hostname.endsWith(".betteruptime.com")
      || url.hostname.endsWith(".betterstack.com")
      || url.hostname === "uptime.betterstack.com";

    if (url.protocol !== "https:" || !trusted || url.username || url.password) {
      return { betterStackStatusUrl: null };
    }

    url.search = "";
    url.hash = "";
    return { betterStackStatusUrl: url.toString().replace(/\/$/, "") };
  } catch {
    return { betterStackStatusUrl: null };
  }
}

async function main() {
  const outputPath = process.env.STATUS_CONFIG_OUTPUT ?? "ops/status/public/config.json";
  const config = buildRuntimeConfig(process.env.BETTER_STACK_STATUS_URL);
  await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  if (config.betterStackStatusUrl === null) {
    console.warn("Better Stack status URL is missing or invalid; live monitoring will show unavailable.");
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
