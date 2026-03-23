import { createUploadKeystore } from "./lib/keystore.mjs";

const args = new Set(process.argv.slice(2));
const force = args.has("--force");

const config = await createUploadKeystore({ force });

console.log(`[keystore] Wrote ${config.path}`);
console.log(`[keystore] Alias: ${config.alias}`);
