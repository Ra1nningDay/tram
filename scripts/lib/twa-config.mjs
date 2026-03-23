import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { TwaManifest } from "@bubblewrap/core";
import {
  isHttpsUrl,
  parseBoolean,
  parseList,
  projectRoot,
  readAndroidFingerprintsFromEnv,
  requireEnv,
  resolveProjectPath,
  resolveWebManifestUrl,
} from "./release-utils.mjs";

export const twaRoot = path.join(projectRoot, ".twa");
export const twaProjectDir = path.join(twaRoot, "android");
export const twaManifestPath = path.join(twaProjectDir, "twa-manifest.json");
export const defaultKeystorePath = path.join(twaRoot, "keys", "upload-key.jks");

async function readPackageVersion() {
  const packageJson = JSON.parse(
    await readFile(path.join(projectRoot, "package.json"), "utf8"),
  );
  return packageJson.version || "0.1.0";
}

export async function createConfiguredTwaManifest({ allowHttp = false } = {}) {
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  if (!allowHttp && !isHttpsUrl(appUrl)) {
    throw new Error("NEXT_PUBLIC_APP_URL must use https for TWA/Play Store builds.");
  }

  const applicationId = requireEnv("ANDROID_APPLICATION_ID");
  const versionName = process.env.ANDROID_VERSION_NAME?.trim() || (await readPackageVersion());
  const rawVersionCode = process.env.ANDROID_VERSION_CODE?.trim() || "1";
  const versionCode = Number.parseInt(rawVersionCode, 10);

  if (!Number.isInteger(versionCode) || versionCode < 1) {
    throw new Error("ANDROID_VERSION_CODE must be a positive integer.");
  }

  const webManifestUrl = resolveWebManifestUrl(appUrl);
  const manifest = await TwaManifest.fromWebManifest(webManifestUrl);

  manifest.packageId = applicationId;
  manifest.name = process.env.ANDROID_APP_NAME?.trim() || manifest.name;
  manifest.launcherName =
    process.env.ANDROID_LAUNCHER_NAME?.trim() || manifest.launcherName || manifest.name;
  manifest.signingKey = {
    path: resolveProjectPath(process.env.ANDROID_KEYSTORE_PATH?.trim() || defaultKeystorePath),
    alias: process.env.ANDROID_KEY_ALIAS?.trim() || "upload",
  };
  manifest.appVersionName = versionName;
  manifest.appVersionCode = versionCode;
  manifest.enableNotifications = parseBoolean(
    process.env.ANDROID_ENABLE_NOTIFICATIONS,
    false,
  );
  manifest.enableSiteSettingsShortcut = parseBoolean(
    process.env.ANDROID_ENABLE_SITE_SETTINGS_SHORTCUT,
    true,
  );
  manifest.fallbackType =
    process.env.ANDROID_FALLBACK_TYPE?.trim() === "webview" ? "webview" : "customtabs";
  manifest.orientation = process.env.ANDROID_ORIENTATION?.trim() || manifest.orientation;
  manifest.generatorApp = "tram-phase-3";
  manifest.additionalTrustedOrigins = parseList(
    process.env.ANDROID_ADDITIONAL_TRUSTED_ORIGINS,
  );

  const serviceAccountJson = process.env.ANDROID_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountJson) {
    manifest.serviceAccountJsonFile = resolveProjectPath(serviceAccountJson);
  }

  manifest.features = {};
  if (parseBoolean(process.env.ANDROID_ENABLE_LOCATION_DELEGATION, true)) {
    manifest.features.locationDelegation = { enabled: true };
  }

  const fingerprints = readAndroidFingerprintsFromEnv();
  manifest.fingerprints = fingerprints.map((value) => ({
    name: applicationId,
    value: value.toUpperCase(),
  }));

  const validationError = manifest.validate();
  if (validationError) {
    throw new Error(`Generated twa-manifest is invalid: ${validationError}`);
  }

  return manifest;
}

export async function writeConfiguredTwaManifest(options) {
  const manifest = await createConfiguredTwaManifest(options);
  await mkdir(twaProjectDir, { recursive: true });
  await manifest.saveToFile(twaManifestPath);
  return manifest;
}
