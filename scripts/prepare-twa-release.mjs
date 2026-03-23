import { access, rm } from "node:fs/promises";

import { ConsoleLog, TwaGenerator } from "@bubblewrap/core";

import { writeAssetLinksFile } from "./lib/assetlinks.mjs";
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

const assetLinks = await writeAssetLinksFile();
console.log(`[prepare] Wrote ${assetLinks.outputPath}`);

const manifest = await writeConfiguredTwaManifest({ allowHttp });
console.log(`[prepare] Wrote ${twaManifestPath}`);

const generator = new TwaGenerator();
const log = new ConsoleLog("tram-twa", true);

await generator.createTwaProject(twaProjectDir, manifest, log);

console.log(`[prepare] Scaffolded Android project at ${twaProjectDir}`);
console.log("[prepare] Next: deploy the updated assetlinks.json, then run `pnpm run twa:check:strict`, `pnpm run twa:doctor`, and `pnpm run twa:build` on a machine with JDK 17 + Android SDK.");
