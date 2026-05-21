const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";

export function getApiBaseUrl(): string {
  const configuredUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

  return configuredUrl.replace(/\/+$/, "");
}
