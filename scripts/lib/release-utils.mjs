import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(scriptDir, "..", "..");
export const wellKnownDir = path.join(projectRoot, "public", ".well-known");
export const assetlinksOutputPath = path.join(wellKnownDir, "assetlinks.json");

export function parseBoolean(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

export function parseList(value) {
  return (value ?? "")
    .split(/[,\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeFingerprints(value) {
  return parseList(value).map((item) => item.toUpperCase());
}

export function readAndroidFingerprintsFromEnv() {
  return normalizeFingerprints(
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS ??
      process.env.ANDROID_SHA256_CERT_FINGERPRINT ??
      "",
  );
}

export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  return value;
}

export function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isLocalhostUrl(value) {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

export function isValidAndroidApplicationId(value) {
  return /^([A-Za-z][A-Za-z0-9_]*)(\.([A-Za-z][A-Za-z0-9_]*))+$/u.test(value);
}

export function resolveProjectPath(value) {
  if (!value) {
    return value;
  }

  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
}

export function resolveWebManifestUrl(appUrl) {
  const explicitWebManifestUrl = process.env.ANDROID_WEB_MANIFEST_URL?.trim();
  return new URL(explicitWebManifestUrl || "/manifest.webmanifest", appUrl).toString();
}

export function buildAssetLinksPayload({ packageName, fingerprints }) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
