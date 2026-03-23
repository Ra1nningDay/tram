# PWA Production and TWA Prep

This project already has the phase 1 PWA shell. Phase 2 makes production deployment predictable and prepares the inputs required for a Trusted Web Activity in phase 3.

## Required production env

Set these before a real deployment:

```env
NEXT_PUBLIC_APP_URL=https://tram-murex.vercel.app
BETTER_AUTH_URL=https://tram-murex.vercel.app
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB_NAME?sslmode=verify-full
DIRECT_URL=postgresql://USER:PASSWORD@HOST/DB_NAME?sslmode=verify-full
```

Optional:

```env
NEXT_PUBLIC_API_BASE_URL=
ANDROID_APPLICATION_ID=com.example.tram
ANDROID_SHA256_CERT_FINGERPRINTS=AA:BB:CC:DD:EE:FF
```

Notes:

- Leave `NEXT_PUBLIC_API_BASE_URL` blank when the app should use same-origin `/api/*` routes.
- Set `NEXT_PUBLIC_API_BASE_URL` only when the frontend must call a separate HTTPS API origin.
- In production, `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_API_BASE_URL` must not point to `localhost`.
- If you later move from `https://tram-murex.vercel.app` to another domain, rerun the asset links and TWA release flow because Android trust is bound to the final origin.

## Asset links

Once the Android package name and signing certificate fingerprint are known, generate Digital Asset Links:

```bash
pnpm run generate:assetlinks
```

That writes:

```text
public/.well-known/assetlinks.json
```

The generated file must be deployed at:

```text
https://your-domain/.well-known/assetlinks.json
```

## Build and verify

Local repo checks:

```bash
pnpm run check:pwa
pnpm run build
```

Strict production checks after env is set:

```bash
node scripts/check-pwa-readiness.mjs --strict
```

Post-deploy checks:

```bash
node scripts/check-pwa-readiness.mjs --base-url=https://your-domain --strict
```

## Android QA checklist

- Open the deployed site in Chrome on Android and verify the install prompt appears.
- Install the app and verify it launches in standalone mode.
- Confirm `/manifest.webmanifest`, `/sw.js`, and `/.well-known/assetlinks.json` are reachable on the deployed domain.
- Turn airplane mode on after first load and confirm the app shell or offline fallback still opens.
- Verify live route/stop data recovers after reconnect.
- Test location permission flow and confirm tracking still works after reopening the installed app.
- Test notification permission flow and confirm tapping a notification returns to the app.
- Verify login and admin flows on the production origin.

## Inputs needed for phase 3

Before creating the Bubblewrap/TWA wrapper, lock these values down:

- Production HTTPS domain
- Android application ID
- Signing certificate SHA256 fingerprint
- Final app name, launcher icon, and Play Store listing assets
