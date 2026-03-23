# TWA Release Guide

Phase 3 adds a scriptable Bubblewrap/Trusted Web Activity scaffold. It does not make the app instantly Play Store-ready by itself; you still need real release inputs and an Android toolchain.

## What is still required before Play upload

- A deployed HTTPS production origin
- Final Android application ID
- A real signing keystore and alias
- JDK 17
- Android command-line tools / SDK
- A valid Digital Asset Links file deployed on the production domain
- Play Console access, listing assets, and optionally a service account JSON for automated publishing

This machine currently does not have `java`, `gradle`, `adb`, or Android SDK config, so Bubblewrap build cannot produce an `.aab` yet.

## Finish lines

- `repo-ready`: `assetlinks.json`, `twa-manifest.json`, and `.twa/android/` can be generated from env without manual edits.
- `build-ready`: the current machine also has JDK 17, `keytool`, Android SDK/`adb`, and a real keystore, so it can produce a signed `.aab`.
- `store-ready`: the `.aab` is uploaded to Play Console with listing assets, privacy policy, and release metadata.

This repo can now be pushed to `repo-ready`. It only reaches `build-ready` after the missing release inputs and Android toolchain exist on the machine that runs the build.

## Repo workflow

Use `pnpm` only:

```bash
pnpm install
pnpm run twa:check
pnpm run twa:setup:windows
pnpm run twa:keygen
pnpm run twa:fingerprint
pnpm run twa:prepare -- --force
pnpm run twa:check:strict
pnpm run twa:doctor
pnpm run twa:build
pnpm run twa:publish:internal
```

## Environment values

At minimum, set:

```env
NEXT_PUBLIC_APP_URL=https://tram-murex.vercel.app
ANDROID_APPLICATION_ID=com.example.tram
ANDROID_KEYSTORE_PATH=.twa/keys/upload-key.jks
ANDROID_KEY_ALIAS=upload
ANDROID_KEY_DNAME_CN=BU Tram Tracker
ANDROID_KEY_DNAME_OU=Engineering
ANDROID_KEY_DNAME_O=BU Tram
ANDROID_KEY_DNAME_C=TH
ANDROID_VERSION_NAME=0.1.0
ANDROID_VERSION_CODE=1
```

Recommended:

```env
ANDROID_APP_NAME=BU Tram Tracker
ANDROID_LAUNCHER_NAME=BU Tram
ANDROID_SHA256_CERT_FINGERPRINTS=AA:BB:CC:DD:EE:FF
ANDROID_PLAY_TRACK=internal
ANDROID_ENABLE_LOCATION_DELEGATION=true
ANDROID_ENABLE_NOTIFICATIONS=false
ANDROID_SERVICE_ACCOUNT_JSON=/absolute/path/to/service-account.json
BUBBLEWRAP_KEYSTORE_PASSWORD=replace-with-a-secret
BUBBLEWRAP_KEY_PASSWORD=replace-with-a-secret
```

## Generated output

`pnpm run twa:prepare -- --force` writes:

```text
public/.well-known/assetlinks.json
.twa/android/
```

Important files:

- `public/.well-known/assetlinks.json`
- `.twa/android/twa-manifest.json`
- `.twa/android/app-release-bundle.aab` after a successful Bubblewrap build
- `.twa/keys/upload-key.jks` if you keep the keystore in the recommended location

`.twa/` is ignored by git because it contains machine-specific and secret material.

## Suggested release flow

1. Deploy the web app to its final HTTPS domain.
2. Set the real Android env values, including keystore passwords and Play track.
3. Run `pnpm run twa:keygen` once to create the upload keystore.
4. Run `pnpm run twa:fingerprint` and keep the printed SHA-256 value.
5. Run `pnpm run twa:prepare -- --force`.
6. Deploy `public/.well-known/assetlinks.json` with the web app.
7. Install JDK 17 and Android command-line tools.
8. Run `pnpm run twa:check:strict`.
9. Run `pnpm run twa:doctor` and fix any SDK/JDK path issues.
10. Run `pnpm run twa:build`.
11. Run `pnpm run twa:publish:internal` or upload the generated `.aab` manually to Play Console.

## Notes

- `pnpm run twa:prepare -- --force` fetches the deployed web manifest, writes `assetlinks.json`, and regenerates the Android project from the repo env values.
- `pnpm run twa:check:strict` is the build-ready gate. It fails if the keystore, JDK tools, Android tools, or release values are still missing.
- `pnpm run twa:keygen` uses `keytool` plus the `BUBBLEWRAP_KEYSTORE_PASSWORD` / `BUBBLEWRAP_KEY_PASSWORD` env vars to create the upload keystore locally.
- `pnpm run twa:fingerprint` prints the real SHA-256 certificate fingerprint from that keystore; `pnpm run generate:assetlinks` also falls back to the keystore fingerprint if the env fingerprint is blank.
- `pnpm run twa:setup:windows` installs JDK 17 if needed, downloads the official Android command-line tools, installs `platform-tools`, `build-tools;34.0.0`, `platforms;android-36`, and writes the Bubblewrap config file.
- `pnpm run twa:build` now runs Bubblewrap inside `.twa/android`, which is the correct project directory for generating `app-release-bundle.aab`.
- `pnpm run twa:publish:internal` publishes the signed bundle to the Play internal track when `ANDROID_SERVICE_ACCOUNT_JSON` is available.
- If you change the web manifest or Android metadata later, rerun `pnpm run twa:prepare -- --force`.
- If you change the production origin later, you must redeploy `assetlinks.json`, regenerate the TWA project, rebuild the `.aab`, and publish an app update because the trusted web origin changed.
