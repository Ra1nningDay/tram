# Frontend

BU Tram tracker frontend with PWA install support.

Use `pnpm` for dependency and script commands in this repo.

Production deployment, Digital Asset Links, and Android QA steps live in [docs/pwa-production.md](docs/pwa-production.md).
Bubblewrap/TWA scaffold and release steps live in [docs/twa-release.md](docs/twa-release.md).
Use `pnpm run twa:prepare -- --force` once the production URL and Android release env values are real.
Use `pnpm run twa:keygen`, `pnpm run twa:fingerprint`, and `pnpm run twa:publish:internal` for the Android release path.
On Windows, use `pnpm run twa:setup:windows` to install/configure the Bubblewrap toolchain.
