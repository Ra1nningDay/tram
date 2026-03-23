import { readKeystoreFingerprint } from "./lib/keystore.mjs";

const fingerprint = await readKeystoreFingerprint();

console.log(`[fingerprint] Keystore: ${fingerprint.path}`);
console.log(`[fingerprint] Alias: ${fingerprint.alias}`);
console.log(`[fingerprint] SHA256: ${fingerprint.sha256}`);
console.log(`ANDROID_SHA256_CERT_FINGERPRINTS=${fingerprint.sha256}`);
