import { access } from "node:fs/promises";

import { runCommand, resolvePnpmCommand } from "./lib/command-utils.mjs";
import { twaProjectDir } from "./lib/twa-config.mjs";

try {
  await access(twaProjectDir);
} catch {
  throw new Error(
    `TWA project not found at ${twaProjectDir}. Run \`pnpm run twa:prepare -- --force\` first.`,
  );
}

const passthroughArgs = process.argv.slice(2);

await runCommand(resolvePnpmCommand(), ["exec", "bubblewrap", "doctor", ...passthroughArgs], {
  cwd: twaProjectDir,
  env: process.env,
});
