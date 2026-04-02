# VM deployment

This repo can be deployed to separate preview and production Linux VMs with Docker by using these workflows:

- `.github/workflows/deploy-preview-vm.yml`: runs on pushes to the `preview` branch
- `.github/workflows/deploy-production-vm.yml`: runs on pushes to the `main` or `master` branch

## GitHub environments

Create two GitHub Environments:

- `preview`
- `production`

Each environment should define the same secret names, but with environment-specific values:

- `VM_HOST`: VM hostname or public IP
- `VM_PORT`: SSH port, usually `22`
- `VM_USER`: SSH user on the VM
- `VM_SSH_KEY`: private SSH key used by GitHub Actions
- `VM_SSH_KNOWN_HOSTS`: optional `known_hosts` entry; if empty the workflow uses `ssh-keyscan`
- `VM_DEPLOY_PATH`: optional remote directory, defaults to `/opt/tram`
- `GHCR_USERNAME`: GitHub username that can pull the package on the VM
- `GHCR_TOKEN`: GitHub token or PAT with `read:packages`
- `APP_ENV_FILE`: multiline `.env` contents for the app and bundled Postgres container

Preview and production should use different hostnames, deploy paths, auth secrets, and database credentials.

## Runtime env example

Use `APP_ENV_FILE` to store the same values you would normally place in `.env`, for example:

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

## Image tags

- Preview builds publish `preview-<commit_sha>` and `preview-latest`
- Production builds publish `<commit_sha>` and `latest`

## What the workflows do

1. Build the Docker image from `Dockerfile`
2. Push the image to GHCR with environment-specific tags
3. Copy `docker-compose.yml` and the runtime `.env` to the target VM
4. Pull the new image on the VM and restart the compose stack, including the bundled `postgres` service

The provided compose file binds the app to `127.0.0.1:3000` and Postgres to `127.0.0.1:5432` by default. If you want to expose either container directly from the VM, change the bind addresses in `docker-compose.yml` or the matching env values.
