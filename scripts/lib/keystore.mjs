import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { captureCommand, runCommand } from "./command-utils.mjs";
import { defaultKeystorePath } from "./twa-config.mjs";
import { resolveProjectPath } from "./release-utils.mjs";

function parsePositiveInteger(name, value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function requirePassword(name, value) {
  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  if (value.length < 6) {
    throw new Error(`${name} must be at least 6 characters long.`);
  }

  return value;
}

function getDnValue(name, fallback) {
  const value = process.env[name]?.trim() || fallback;
  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  return value;
}

export function getKeystoreConfig() {
  const keystorePath = resolveProjectPath(
    process.env.ANDROID_KEYSTORE_PATH?.trim() || defaultKeystorePath,
  );
  const alias = process.env.ANDROID_KEY_ALIAS?.trim() || "upload";
  const storePassword = requirePassword(
    "BUBBLEWRAP_KEYSTORE_PASSWORD",
    process.env.BUBBLEWRAP_KEYSTORE_PASSWORD,
  );
  const keyPassword = requirePassword(
    "BUBBLEWRAP_KEY_PASSWORD",
    process.env.BUBBLEWRAP_KEY_PASSWORD,
  );
  const validityDays = parsePositiveInteger(
    "ANDROID_KEY_VALIDITY_DAYS",
    process.env.ANDROID_KEY_VALIDITY_DAYS?.trim(),
    20000,
  );

  const commonName = getDnValue(
    "ANDROID_KEY_DNAME_CN",
    process.env.ANDROID_APP_NAME?.trim() || process.env.ANDROID_APPLICATION_ID?.trim(),
  );
  const organizationalUnit = getDnValue("ANDROID_KEY_DNAME_OU", "Engineering");
  const organization = getDnValue(
    "ANDROID_KEY_DNAME_O",
    process.env.ANDROID_APP_NAME?.trim() || "BU Tram",
  );
  const country = getDnValue("ANDROID_KEY_DNAME_C", "TH").toUpperCase();

  return {
    path: keystorePath,
    alias,
    storePassword,
    keyPassword,
    validityDays,
    dname: `CN=${commonName}, OU=${organizationalUnit}, O=${organization}, C=${country}`,
  };
}

export async function assertKeystoreExists(keystorePath) {
  try {
    await access(keystorePath);
  } catch {
    throw new Error(`Keystore file does not exist yet: ${keystorePath}`);
  }
}

export async function createUploadKeystore({ force = false } = {}) {
  const config = getKeystoreConfig();

  await mkdir(path.dirname(config.path), { recursive: true });

  if (!force) {
    try {
      await access(config.path);
      throw new Error(
        `Keystore already exists at ${config.path}. Re-run with --force to replace it.`,
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        throw error;
      }
    }
  }

  if (force) {
    try {
      await access(config.path);
      await rm(config.path, { force: true });
    } catch {
      // File does not exist yet.
    }
  }

  await runCommand("keytool", [
    "-genkeypair",
    "-v",
    "-storetype",
    "PKCS12",
    "-keystore",
    config.path,
    "-alias",
    config.alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    `${config.validityDays}`,
    "-storepass",
    config.storePassword,
    "-keypass",
    config.keyPassword,
    "-dname",
    config.dname,
    "-noprompt",
  ]);

  return config;
}

export async function readKeystoreFingerprint() {
  const config = getKeystoreConfig();
  await assertKeystoreExists(config.path);

  const { stdout } = await captureCommand("keytool", [
    "-J-Duser.language=en",
    "-list",
    "-v",
    "-keystore",
    config.path,
    "-alias",
    config.alias,
    "-storepass",
    config.storePassword,
    "-keypass",
    config.keyPassword,
  ]);

  const match = stdout.match(/^\s*SHA256:\s*(.+)$/m);
  if (!match) {
    throw new Error("Could not extract SHA256 fingerprint from keytool output.");
  }

  return {
    ...config,
    sha256: match[1].trim().toUpperCase(),
  };
}
