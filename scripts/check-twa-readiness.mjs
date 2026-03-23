import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  assetlinksOutputPath,
  buildAssetLinksPayload,
  isHttpUrl,
  isHttpsUrl,
  isValidAndroidApplicationId,
  projectRoot,
  readAndroidFingerprintsFromEnv,
  resolveProjectPath,
  resolveWebManifestUrl,
} from "./lib/release-utils.mjs";
import {
  bubblewrapConfigPath,
  hasFile,
  readBubblewrapConfig,
  resolveAndroidBinary,
  resolveJdkBinary,
} from "./lib/bubblewrap-config.mjs";
import { readKeystoreFingerprint } from "./lib/keystore.mjs";
import { defaultKeystorePath } from "./lib/twa-config.mjs";

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const remoteOriginArg = [...args].find((arg) => arg.startsWith("--remote-origin="));
const remoteOrigin = remoteOriginArg
  ? remoteOriginArg.slice("--remote-origin=".length).replace(/\/+$/, "")
  : undefined;

const results = [];

function addResult(level, message) {
  results.push({ level, message });
  const prefix = level === "pass" ? "PASS" : level === "warn" ? "WARN" : "FAIL";
  const writer = level === "fail" ? console.error : console.log;
  writer(`[${prefix}] ${message}`);
}

function requireHttps(name, value, required = true) {
  if (!value) {
    addResult(required && strict ? "fail" : "warn", `${name} is not set`);
    return;
  }

  try {
    const url = new URL(value);
    if (strict && url.protocol !== "https:") {
      addResult("fail", `${name} must use https in strict mode`);
      return;
    }

    addResult("pass", `${name} looks valid`);
  } catch {
    addResult("fail", `${name} is not a valid URL`);
  }
}

async function ensureFile(relativePath, required = true) {
  const absolutePath = path.join(projectRoot, relativePath);

  try {
    await access(absolutePath);
    addResult("pass", `Found ${relativePath}`);
  } catch {
    addResult(required ? "fail" : strict ? "fail" : "warn", `Missing ${relativePath}`);
  }
}

function checkPackageManager(packageJson) {
  if (packageJson.packageManager?.startsWith("pnpm@")) {
    addResult("pass", `packageManager is ${packageJson.packageManager}`);
  } else {
    addResult("fail", "package.json must declare pnpm as the package manager");
  }
}

function checkScripts(packageJson) {
  const scripts = packageJson.scripts ?? {};
  for (const name of [
    "twa:check",
    "twa:check:strict",
    "twa:keygen",
    "twa:fingerprint",
    "twa:manifest",
    "twa:prepare",
    "twa:scaffold",
    "twa:doctor",
    "twa:build",
    "twa:publish:internal",
  ]) {
    if (scripts[name]) {
      addResult("pass", `package.json includes "${name}"`);
    } else {
      addResult("fail", `package.json is missing "${name}"`);
    }
  }
}

async function checkCommand(command, commandArgs = []) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      shell: false,
      stdio: "ignore",
    });

    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function checkJdkAvailability() {
  const bubblewrapConfig = await readBubblewrapConfig();
  const javaAvailable = await checkCommand("java", ["-version"]);
  if (javaAvailable) {
    addResult("pass", "java is available");
  } else if (await hasFile(resolveJdkBinary(bubblewrapConfig?.jdkPath, "java"))) {
    addResult("pass", "java is available via Bubblewrap config");
  } else {
    addResult(strict ? "fail" : "warn", "java is not available");
  }

  const keytoolAvailable = await checkCommand("keytool", ["-help"]);
  if (keytoolAvailable) {
    addResult("pass", "keytool is available");
  } else if (await hasFile(resolveJdkBinary(bubblewrapConfig?.jdkPath, "keytool"))) {
    addResult("pass", "keytool is available via Bubblewrap config");
  } else {
    addResult(strict ? "fail" : "warn", "keytool is not available");
  }
}

async function checkAndroidSdkAvailability() {
  const bubblewrapConfig = await readBubblewrapConfig();
  const adbAvailable = await checkCommand("adb", ["version"]);
  if (adbAvailable) {
    addResult("pass", "adb is available");
  } else if (
    await hasFile(resolveAndroidBinary(bubblewrapConfig?.androidSdkPath, "platform-tools/adb"))
  ) {
    addResult("pass", "adb is available via Bubblewrap config");
  } else {
    addResult(strict ? "fail" : "warn", "adb is not available");
  }

  if (bubblewrapConfig?.jdkPath && bubblewrapConfig?.androidSdkPath) {
    addResult("pass", `Bubblewrap config is present at ${bubblewrapConfigPath}`);
  } else {
    addResult(strict ? "fail" : "warn", "Bubblewrap config is missing or incomplete");
  }
}

function checkOptionalUrl(name, value) {
  if (!value) {
    return;
  }

  if (!isHttpUrl(value)) {
    addResult("fail", `${name} is not a valid URL`);
    return;
  }

  if (strict && !isHttpsUrl(value)) {
    addResult("fail", `${name} must use https in strict mode`);
    return;
  }

  addResult("pass", `${name} looks valid`);
}

function checkApplicationId(value) {
  if (!value) {
    addResult(strict ? "fail" : "warn", "ANDROID_APPLICATION_ID is not set");
    return false;
  }

  if (!isValidAndroidApplicationId(value)) {
    addResult("fail", "ANDROID_APPLICATION_ID is not a valid Android application ID");
    return false;
  }

  addResult("pass", "ANDROID_APPLICATION_ID is set");
  return true;
}

async function checkRemoteUrl(url, expectedContentType) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      addResult(strict ? "fail" : "warn", `${url} returned ${response.status}`);
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (expectedContentType && !contentType.includes(expectedContentType)) {
      addResult(
        strict ? "fail" : "warn",
        `${url} returned unexpected content-type "${contentType}"`,
      );
      return;
    }

    addResult("pass", `${url} is reachable`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addResult(strict ? "fail" : "warn", `${url} could not be fetched: ${message}`);
  }
}

async function checkLocalAssetLinks(packageName, fingerprints) {
  try {
    const content = await readFile(assetlinksOutputPath, "utf8");
    const parsed = JSON.parse(content);
    const expected = buildAssetLinksPayload({ packageName, fingerprints });

    addResult("pass", "Found public/.well-known/assetlinks.json");

    if (JSON.stringify(parsed) === JSON.stringify(expected)) {
      addResult("pass", "public/.well-known/assetlinks.json matches the Android release env values");
    } else {
      addResult(
        strict ? "fail" : "warn",
        "public/.well-known/assetlinks.json does not match ANDROID_APPLICATION_ID / ANDROID_SHA256_CERT_FINGERPRINTS",
      );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      addResult("fail", "public/.well-known/assetlinks.json is not valid JSON");
      return;
    }

    addResult(
      strict ? "fail" : "warn",
      "public/.well-known/assetlinks.json is missing; run pnpm run generate:assetlinks once Android values are ready",
    );
  }
}

async function checkKeystorePath() {
  const rawKeystorePath = process.env.ANDROID_KEYSTORE_PATH?.trim();
  const keystorePath = rawKeystorePath || defaultKeystorePath;

  if (rawKeystorePath) {
    addResult("pass", "ANDROID_KEYSTORE_PATH is set");
  } else {
    addResult("pass", `ANDROID_KEYSTORE_PATH is not set; default path will be used (${defaultKeystorePath})`);
  }

  try {
    await access(resolveProjectPath(keystorePath));
    addResult("pass", "ANDROID keystore file exists");
  } catch {
    addResult(strict ? "fail" : "warn", "ANDROID keystore file does not exist yet");
  }
}

async function resolveFingerprints() {
  const envFingerprints = readAndroidFingerprintsFromEnv();
  if (envFingerprints.length > 0) {
    return {
      source: "env",
      fingerprints: envFingerprints,
    };
  }

  try {
    const fingerprint = await readKeystoreFingerprint();
    return {
      source: "keystore",
      fingerprints: [fingerprint.sha256],
    };
  } catch {
    return {
      source: "missing",
      fingerprints: [],
    };
  }
}

async function main() {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));

  checkPackageManager(packageJson);
  checkScripts(packageJson);

  await Promise.all([
    ensureFile("pnpm-lock.yaml"),
    ensureFile("docs/twa-release.md"),
    ensureFile("scripts/generate-upload-keystore.mjs"),
    ensureFile("scripts/print-keystore-fingerprint.mjs"),
    ensureFile("scripts/generate-twa-manifest.mjs"),
    ensureFile("scripts/prepare-twa-release.mjs"),
    ensureFile("scripts/run-bubblewrap-doctor.mjs"),
    ensureFile("scripts/build-twa-bundle.mjs"),
    ensureFile("scripts/publish-twa-bundle.mjs"),
    ensureFile("scripts/scaffold-twa.mjs"),
    ensureFile("scripts/check-twa-readiness.mjs"),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const authUrl = process.env.BETTER_AUTH_URL?.trim();
  const applicationId = process.env.ANDROID_APPLICATION_ID?.trim();
  const { source: fingerprintSource, fingerprints } = await resolveFingerprints();

  requireHttps("NEXT_PUBLIC_APP_URL", appUrl);
  checkOptionalUrl("BETTER_AUTH_URL", authUrl);
  checkOptionalUrl("ANDROID_WEB_MANIFEST_URL", process.env.ANDROID_WEB_MANIFEST_URL?.trim());

  const hasApplicationId = checkApplicationId(applicationId);

  if (appUrl && authUrl) {
    if (new URL(appUrl).origin === new URL(authUrl).origin) {
      addResult("pass", "BETTER_AUTH_URL shares the same origin as NEXT_PUBLIC_APP_URL");
    } else {
      addResult(
        strict ? "fail" : "warn",
        "BETTER_AUTH_URL differs from NEXT_PUBLIC_APP_URL; verify auth origin and cookies carefully",
      );
    }
  }

  if (process.env.ANDROID_KEY_ALIAS?.trim()) {
    addResult("pass", "ANDROID_KEY_ALIAS is set");
  } else {
    addResult("pass", 'ANDROID_KEY_ALIAS is not set; default alias "upload" will be used');
  }

  await checkKeystorePath();

  if (fingerprints.length > 0) {
    addResult(
      "pass",
      fingerprintSource === "keystore"
        ? "A SHA-256 fingerprint can be derived from the keystore"
        : "ANDROID_SHA256_CERT_FINGERPRINTS is set",
    );
  } else {
    addResult(strict ? "fail" : "warn", "ANDROID_SHA256_CERT_FINGERPRINTS is not set");
  }

  if (appUrl && process.env.ANDROID_WEB_MANIFEST_URL?.trim()) {
    const manifestUrl = resolveWebManifestUrl(appUrl);
    if (new URL(manifestUrl).origin === new URL(appUrl).origin) {
      addResult("pass", "ANDROID_WEB_MANIFEST_URL resolves to the same origin as NEXT_PUBLIC_APP_URL");
    } else {
      addResult(
        strict ? "fail" : "warn",
        "ANDROID_WEB_MANIFEST_URL resolves to a different origin than NEXT_PUBLIC_APP_URL",
      );
    }
  }

  await checkJdkAvailability();
  await checkAndroidSdkAvailability();

  const bubblewrapBinary = path.join(
    projectRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "bubblewrap.cmd" : "bubblewrap",
  );

  let bubblewrapAvailable = true;
  try {
    await access(bubblewrapBinary);
  } catch {
    bubblewrapAvailable = false;
  }

  addResult(
    bubblewrapAvailable ? "pass" : "fail",
    bubblewrapAvailable ? "Bubblewrap CLI is available" : "Bubblewrap CLI is not available",
  );

  if (hasApplicationId && fingerprints.length > 0) {
    await checkLocalAssetLinks(applicationId, fingerprints);
  } else {
    await checkLocalAssetLinks("", []);
  }

  const effectiveRemoteOrigin = remoteOrigin || appUrl?.replace(/\/+$/, "");
  if (effectiveRemoteOrigin && isHttpUrl(effectiveRemoteOrigin)) {
    const manifestUrl = appUrl
      ? resolveWebManifestUrl(appUrl)
      : new URL("/manifest.webmanifest", effectiveRemoteOrigin).toString();

    await Promise.all([
      checkRemoteUrl(manifestUrl, "json"),
      checkRemoteUrl(new URL("/.well-known/assetlinks.json", effectiveRemoteOrigin).toString(), "json"),
    ]);
  }

  const failCount = results.filter((result) => result.level === "fail").length;
  const warnCount = results.filter((result) => result.level === "warn").length;

  console.log(
    `\nSummary: ${results.length} checks, ${failCount} failure(s), ${warnCount} warning(s)${
      strict ? " [strict]" : ""
    }.`,
  );

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

await main();
