import { access, rm } from "node:fs/promises";

import { ConsoleLog, TwaGenerator } from "@bubblewrap/core";

import {
  twaManifestPath,
  twaProjectDir,
  writeConfiguredTwaManifest,
} from "./lib/twa-config.mjs";

const args = new Set(process.argv.slice(2));
const allowHttp = args.has("--allow-http");
const force = args.has("--force");

try {
  await access(twaProjectDir);
  if (!force) {
    throw new Error(
      `TWA project already exists at ${twaProjectDir}. Re-run with --force to regenerate it.`,
    );
  }

  await rm(twaProjectDir, { recursive: true, force: true });
} catch (error) {
  if (error instanceof Error && !error.message.includes("already exists")) {
    // Ignore access errors; the project directory does not exist yet.
  } else if (error instanceof Error) {
    throw error;
  }
}

const manifest = await writeConfiguredTwaManifest({ allowHttp });
const generator = new TwaGenerator();
const log = new ConsoleLog("tram-twa", true);

await generator.createTwaProject(twaProjectDir, manifest, log);

console.log(`[twa] Scaffolded Android project at ${twaProjectDir}`);
console.log("[twa] Next steps: install JDK 17 + Android SDK, then run `pnpm run twa:doctor` and `pnpm run twa:build`.");
