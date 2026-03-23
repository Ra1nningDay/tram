import { access } from "node:fs/promises";
import path from "node:path";

import { runCommand, resolvePnpmCommand } from "./lib/command-utils.mjs";
import { resolveProjectPath } from "./lib/release-utils.mjs";
import { twaProjectDir } from "./lib/twa-config.mjs";

const serviceAccountFile = process.env.ANDROID_SERVICE_ACCOUNT_JSON?.trim();
if (!serviceAccountFile) {
  throw new Error("ANDROID_SERVICE_ACCOUNT_JSON must be set to publish to Google Play.");
}

const resolvedServiceAccountFile = resolveProjectPath(serviceAccountFile);
try {
  await access(resolvedServiceAccountFile);
} catch {
  throw new Error(`Service account JSON not found: ${resolvedServiceAccountFile}`);
}

const appBundleLocation = resolveProjectPath(
  process.env.ANDROID_APP_BUNDLE_PATH?.trim() || path.join(twaProjectDir, "app-release-bundle.aab"),
);
try {
  await access(appBundleLocation);
} catch {
  throw new Error(
    `App Bundle not found: ${appBundleLocation}. Run \`pnpm run twa:build\` first.`,
  );
}

const track = process.env.ANDROID_PLAY_TRACK?.trim() || "internal";
const passthroughArgs = process.argv.slice(2);

await runCommand(
  resolvePnpmCommand(),
  [
    "exec",
    "bubblewrap",
    "play",
    "publish",
    "--manifest=./twa-manifest.json",
    `--track=${track}`,
    `--appBundleLocation=${appBundleLocation}`,
    `--serviceAccountFile=${resolvedServiceAccountFile}`,
    ...passthroughArgs,
  ],
  {
    cwd: twaProjectDir,
    env: process.env,
  },
);
