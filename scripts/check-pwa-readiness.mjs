import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readKeystoreFingerprint } from "./lib/keystore.mjs";
import { readAndroidFingerprintsFromEnv } from "./lib/release-utils.mjs";

const args = new Set(process.argv.slice(2));
const baseUrlArg = [...args].find((arg) => arg.startsWith("--base-url="));
const baseUrl = baseUrlArg ? baseUrlArg.slice("--base-url=".length).replace(/\/+$/, "") : undefined;
const strict = args.has("--strict");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const results = [];

function addResult(level, message) {
  results.push({ level, message });
  const prefix = level === "pass" ? "PASS" : level === "warn" ? "WARN" : "FAIL";
  const writer = level === "fail" ? console.error : console.log;
  writer(`[${prefix}] ${message}`);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalhostUrl(value) {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

async function ensureFile(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);

  try {
    await access(absolutePath);
    addResult("pass", `Found ${relativePath}`);
  } catch {
    addResult("fail", `Missing ${relativePath}`);
  }
}

function checkUrlEnv(name, value, { required = false, allowBlank = false } = {}) {
  if (!value) {
    if (required) {
      addResult(strict ? "fail" : "warn", `${name} is not set`);
      return;
    }

    if (!allowBlank) {
      addResult("warn", `${name} is not set`);
    }
    return;
  }

  if (!isHttpUrl(value)) {
    addResult("fail", `${name} must be a valid http(s) URL`);
    return;
  }

  if (strict && !isHttpsUrl(value)) {
    addResult("fail", `${name} must use https in strict mode`);
    return;
  }

  if (strict && isLocalhostUrl(value)) {
    addResult("fail", `${name} cannot point to localhost in strict mode`);
    return;
  }

  addResult("pass", `${name} looks valid`);
}

async function checkPackageScripts() {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const scripts = packageJson.scripts ?? {};

  for (const scriptName of ["check:pwa", "generate:assetlinks"]) {
    if (scripts[scriptName]) {
      addResult("pass", `package.json includes "${scriptName}"`);
    } else {
      addResult("fail", `package.json is missing "${scriptName}"`);
    }
  }
}

async function checkRemotePath(relativePath, expectedContentType) {
  if (!baseUrl) {
    return;
  }

  const url = `${baseUrl}${relativePath}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      addResult("fail", `${url} returned ${response.status}`);
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
    addResult("fail", `${url} could not be fetched: ${message}`);
  }
}

async function resolveAndroidFingerprints() {
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
  await Promise.all([
    ensureFile("public/sw.js"),
    ensureFile("public/offline.html"),
    ensureFile("public/icon-192x192.png"),
    ensureFile("public/icon-512x512.png"),
    ensureFile("public/maskable-icon-512x512.png"),
    ensureFile("src/app/manifest.ts"),
  ]);

  await checkPackageScripts();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const authUrl = process.env.BETTER_AUTH_URL?.trim();
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const androidPackage = process.env.ANDROID_APPLICATION_ID?.trim();
  const { source: androidFingerprintSource, fingerprints: androidFingerprints } =
    await resolveAndroidFingerprints();

  checkUrlEnv("NEXT_PUBLIC_APP_URL", appUrl, { required: strict });
  checkUrlEnv("BETTER_AUTH_URL", authUrl, { required: strict });
  checkUrlEnv("NEXT_PUBLIC_API_BASE_URL", apiUrl, { allowBlank: true });

  if (appUrl && authUrl) {
    if (appUrl === authUrl) {
      addResult("pass", "BETTER_AUTH_URL matches NEXT_PUBLIC_APP_URL");
    } else {
      addResult(
        strict ? "fail" : "warn",
        "BETTER_AUTH_URL differs from NEXT_PUBLIC_APP_URL; verify auth origin and cookies carefully",
      );
    }
  }

  if (androidPackage && androidFingerprints.length > 0) {
    addResult(
      "pass",
      androidFingerprintSource === "keystore"
        ? "Android package is set and the certificate fingerprint can be derived from the keystore"
        : "Android package and certificate fingerprints are available",
    );
  } else {
    addResult(
      strict ? "fail" : "warn",
      "Android package/certificate env vars are missing; assetlinks.json cannot be generated yet",
    );
  }

  const localAssetLinksPath = path.join(projectRoot, "public", ".well-known", "assetlinks.json");
  try {
    await access(localAssetLinksPath);
    addResult("pass", "Found public/.well-known/assetlinks.json");
  } catch {
    addResult(
      strict ? "fail" : "warn",
      "public/.well-known/assetlinks.json is missing; run pnpm run generate:assetlinks once Android values are ready",
    );
  }

  if (baseUrl) {
    checkUrlEnv("baseUrl", baseUrl, { required: true });

    await Promise.all([
      checkRemotePath("/manifest.webmanifest", "json"),
      checkRemotePath("/sw.js", "javascript"),
      checkRemotePath("/offline.html", "text/html"),
      checkRemotePath("/.well-known/assetlinks.json", "json"),
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
