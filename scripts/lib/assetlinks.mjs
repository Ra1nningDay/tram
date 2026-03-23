import { mkdir, writeFile } from "node:fs/promises";

import {
  assetlinksOutputPath,
  buildAssetLinksPayload,
  readAndroidFingerprintsFromEnv,
  wellKnownDir,
} from "./release-utils.mjs";
import { readKeystoreFingerprint } from "./keystore.mjs";

export async function createAssetLinksPayloadFromEnv() {
  const packageName = process.env.ANDROID_APPLICATION_ID?.trim();
  let fingerprints = readAndroidFingerprintsFromEnv();

  if (fingerprints.length === 0) {
    try {
      const fingerprint = await readKeystoreFingerprint();
      fingerprints = [fingerprint.sha256];
    } catch {
      // Fall through to the final validation error with the standard guidance.
    }
  }

  if (!packageName || fingerprints.length === 0) {
    throw new Error(
      "ANDROID_APPLICATION_ID and a SHA-256 fingerprint must be available to generate assetlinks.json.",
    );
  }

  return {
    outputPath: assetlinksOutputPath,
    packageName,
    fingerprints,
    payload: buildAssetLinksPayload({ packageName, fingerprints }),
  };
}

export async function writeAssetLinksFile() {
  const result = await createAssetLinksPayloadFromEnv();
  await mkdir(wellKnownDir, { recursive: true });
  await writeFile(result.outputPath, `${JSON.stringify(result.payload, null, 2)}\n`, "utf8");
  return result;
}
