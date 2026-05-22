const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";
const DEFAULT_API_BASE_PATH = "/api/v1";

export function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const internalHostport = process.env.API_INTERNAL_HOSTPORT;

  if (internalHostport) {
    const basePath = process.env.API_BASE_PATH ?? DEFAULT_API_BASE_PATH;

    return `http://${internalHostport}${basePath}`.replace(/\/+$/, "");
  }

  return DEFAULT_API_BASE_URL;
}
