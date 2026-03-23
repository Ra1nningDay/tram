import { writeConfiguredTwaManifest, twaManifestPath } from "./lib/twa-config.mjs";

const args = new Set(process.argv.slice(2));
const allowHttp = args.has("--allow-http");

const manifest = await writeConfiguredTwaManifest({ allowHttp });

console.log(`[twa] Wrote ${twaManifestPath}`);
console.log(`[twa] Host: ${manifest.host}`);
console.log(`[twa] Package ID: ${manifest.packageId}`);
