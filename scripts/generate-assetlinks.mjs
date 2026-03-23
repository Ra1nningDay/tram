import { writeAssetLinksFile } from "./lib/assetlinks.mjs";

const args = new Set(process.argv.slice(2));
const allowMissing = args.has("--allow-missing");

try {
  const result = await writeAssetLinksFile();
  console.log(`[assetlinks] Wrote ${result.outputPath}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (allowMissing) {
    console.log(`[assetlinks] Skipped: ${message}`);
    process.exit(0);
  }

  console.error(`[assetlinks] ${message}`);
  process.exit(1);
}
