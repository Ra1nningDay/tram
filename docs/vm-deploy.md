# VM deployment

This repo supports two deployment models today:

- `.github/workflows/deploy-preview-vm.yml`: runs on pushes to the `preview` branch
- `.github/workflows/deploy-production-vm.yml`: builds the production image, then publishes a pull bundle to the `deploy-state` branch

## GitHub environments

Create two GitHub Environments:

- `preview`
- `production`

Each environment should define the same secret names, but with environment-specific values:

- Preview keeps using the push-based VM secrets below:
  - `VM_HOST`
  - `VM_PORT`
  - `VM_USER`
  - `VM_SSH_KEY`
  - `VM_SSH_KNOWN_HOSTS`
  - `VM_DEPLOY_PATH`
  - `GHCR_USERNAME`
  - `GHCR_TOKEN`
  - `APP_ENV_FILE`
- Production no longer needs VM or runtime secrets in GitHub Actions. You can keep the `production` environment for protection rules only.

Preview and production should use different hostnames, deploy paths, auth secrets, and database credentials.

## Production pull model

Production now uses:

1. GitHub Actions builds and pushes the app image to GHCR
2. GitHub Actions publishes `production/manifest.env` plus the runtime bundle to the `deploy-state` branch
3. The VM uses a deploy key to `git pull` the `deploy-state` branch and pulls the desired image digest from GHCR
4. A `systemd` timer runs the pull script every two minutes

The runtime bundle is generated under `production/` on the `deploy-state` branch and contains:

- `production/manifest.env`
- `production/docker-compose.yml`
- `production/bin/deploy.sh`
- `production/bin/bootstrap.sh`
- `production/systemd/tram-pull.service`
- `production/systemd/tram-pull.timer`

The bundle uses `IMAGE_REF=ghcr.io/<owner>/<repo>@sha256:<digest>` as the app image contract.

## Runtime env example

Store the app runtime env on the VM at `/opt/tram/runtime/.env`, for example:

```env
NEXT_PUBLIC_APP_URL=https://tram.example.com
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_MAPTILER_API_KEY=
PORT=3000
APP_BIND_ADDRESS=127.0.0.1
POSTGRES_DB=tram
POSTGRES_USER=tram
POSTGRES_PASSWORD=replace-this-db-password
POSTGRES_PORT=5432
POSTGRES_BIND_ADDRESS=127.0.0.1
DATABASE_URL=postgresql://tram:replace-this-db-password@postgres:5432/tram?schema=public
DIRECT_URL=postgresql://tram:replace-this-db-password@postgres:5432/tram?schema=public
BETTER_AUTH_SECRET=replace-this
BETTER_AUTH_URL=https://tram.example.com
RUN_DB_MIGRATIONS=true
```

If you prefer a managed Postgres instance, set `DATABASE_URL` and `DIRECT_URL` to that database instead. The bundled `postgres` service can remain unused or be removed from `docker-compose.yml`.

If you prefer to manage the control-plane credentials yourself, `/opt/tram/secrets/pull.env` should look like this:

```env
REPO_SSH_URL=git@github.com:OWNER/REPO.git
DEPLOY_BRANCH=deploy-state
DEPLOY_KEY_PATH=/opt/tram/secrets/deploy_key
GIT_SSH_KNOWN_HOSTS=/opt/tram/secrets/known_hosts
```

If the GHCR package is private, also add:

```env
GHCR_USERNAME=OWNER
GHCR_TOKEN=github_pat_with_read_packages
```

`deploy_key` should be a read-only GitHub deploy key for this repo. The VM needs outbound HTTPS to `github.com` and `ghcr.io`.

## Bootstrap on the VM

1. Place the runtime env at `/opt/tram/runtime/.env`
2. Place the deploy key at `/opt/tram/secrets/deploy_key`
3. Clone this repo on any branch once, or copy the bootstrap script from `deploy/production/bin/bootstrap.sh`
4. Run the bootstrap script. It will write `/opt/tram/secrets/pull.env`, clone the `deploy-state` branch into `/opt/tram/control`, and install the systemd timer:

```bash
sudo REPO_SSH_URL=git@github.com:OWNER/REPO.git \
  bash deploy/production/bin/bootstrap.sh
```

If the GHCR package is private, include:

```bash
sudo GHCR_USERNAME=OWNER \
  GHCR_TOKEN=github_pat_with_read_packages \
  REPO_SSH_URL=git@github.com:OWNER/REPO.git \
  bash deploy/production/bin/bootstrap.sh
```

5. Trigger an immediate deploy:

```bash
sudo systemctl start tram-pull.service
```

Useful commands:

```bash
sudo systemctl status tram-pull.timer
sudo systemctl status tram-pull.service
sudo journalctl -u tram-pull.service -n 200 --no-pager
```

The timer polls every two minutes with a randomized delay and only deploys when `production/manifest.env` points to a new image digest.

## Image tags and digests

- Preview builds publish `preview-<commit_sha>` and `preview-latest`
- Production builds publish `<commit_sha>` and `latest`, but the VM deploys by immutable digest from `production/manifest.env`

## What the workflows do

Preview workflow:

1. Build the Docker image from `Dockerfile`
2. Push the image to GHCR with preview tags
3. Copy `docker-compose.yml` and the runtime `.env` to the target VM
4. Pull the new image on the VM and restart the compose stack

Production workflow:

1. Build the Docker image from `Dockerfile`
2. Push the image to GHCR with production tags
3. Publish the production runtime bundle and desired image digest to the `deploy-state` branch
4. Let the VM pull and apply that desired state on its next timer run

The production runtime compose file still binds the app to `127.0.0.1:3000` and Postgres to `127.0.0.1:5432` by default. If you want to expose either container directly from the VM, change the bind addresses in the runtime bundle compose file or the matching env values.
