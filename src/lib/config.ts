export const LOCAL_APP_URL = "http://localhost:3000";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function normalizeUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimTrailingSlash(trimmed);
}

export function isLocalhostUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

function sanitizePublicOrigin(value?: string): string {
  if (process.env.NODE_ENV === "production" && value && isLocalhostUrl(value)) {
    return "";
  }

  return value ?? "";
}

const appUrl = sanitizePublicOrigin(
  normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    (process.env.NODE_ENV !== "production" ? LOCAL_APP_URL : ""),
);
const apiBaseUrl = sanitizePublicOrigin(normalizeUrl(process.env.NEXT_PUBLIC_API_BASE_URL));

export const config = {
  mapTilerApiKey: process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "",
  appUrl,
  apiBaseUrl,
};

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return config.apiBaseUrl ? `${config.apiBaseUrl}${path}` : path;
}

export function getMetadataBase(): URL | undefined {
  if (!config.appUrl) {
    return undefined;
  }

  return new URL(config.appUrl);
}
