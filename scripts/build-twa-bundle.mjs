import { access } from "node:fs/promises";

import { runCommand, resolvePnpmCommand } from "./lib/command-utils.mjs";
import { twaManifestPath, twaProjectDir } from "./lib/twa-config.mjs";

try {
  await access(twaManifestPath);
} catch {
  throw new Error(
    `TWA manifest not found at ${twaManifestPath}. Run \`pnpm run twa:prepare -- --force\` first.`,
  );
}

const passthroughArgs = process.argv.slice(2);

await runCommand(
  resolvePnpmCommand(),
  ["exec", "bubblewrap", "build", "--manifest=./twa-manifest.json", ...passthroughArgs],
  {
    cwd: twaProjectDir,
    env: process.env,
  },
);
