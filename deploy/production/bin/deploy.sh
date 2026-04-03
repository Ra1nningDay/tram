#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[tram-pull] %s\n' "$*"
}

fail() {
  printf '[tram-pull] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

load_env_file() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

configure_git_ssh() {
  local ssh_opts

  [ -f "$DEPLOY_KEY_PATH" ] || fail "Deploy key not found at $DEPLOY_KEY_PATH"
  chmod 600 "$DEPLOY_KEY_PATH"

  ssh_opts="-i $DEPLOY_KEY_PATH -o IdentitiesOnly=yes"
  if [ -f "$GIT_SSH_KNOWN_HOSTS" ]; then
    ssh_opts="$ssh_opts -o UserKnownHostsFile=$GIT_SSH_KNOWN_HOSTS -o StrictHostKeyChecking=yes"
  else
    ssh_opts="$ssh_opts -o StrictHostKeyChecking=accept-new"
  fi

  export GIT_SSH_COMMAND="ssh $ssh_opts"
}

sync_control_repo() {
  if [ ! -d "$CONTROL_DIR/.git" ]; then
    git clone --branch "$DEPLOY_BRANCH" --depth 1 "$REPO_SSH_URL" "$CONTROL_DIR"
    return
  fi

  git -C "$CONTROL_DIR" remote set-url origin "$REPO_SSH_URL"
  git -C "$CONTROL_DIR" fetch --depth 1 origin "$DEPLOY_BRANCH"
  git -C "$CONTROL_DIR" checkout --force FETCH_HEAD
  git -C "$CONTROL_DIR" clean -fdx
}

write_compose_env() {
  local image_ref="$1"
  local output_file="$2"

  cp "$RUNTIME_ENV_FILE" "$output_file"
  {
    printf '\nAPP_ENV_FILE=%s\n' "$RUNTIME_ENV_FILE"
    printf 'IMAGE_REF=%s\n' "$image_ref"
  } >> "$output_file"
}

wait_for_app_health() {
  local deadline status

  deadline=$((SECONDS + APP_HEALTH_TIMEOUT))

  while [ "$SECONDS" -lt "$deadline" ]; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' tram-app 2>/dev/null || true)"
    case "$status" in
      healthy|running)
        return 0
        ;;
      unhealthy|exited|dead)
        return 1
        ;;
    esac
    sleep 5
  done

  return 1
}

rollback() {
  if [ -z "$PREVIOUS_CONTROL_REV" ] || [ -z "$CURRENT_IMAGE_REF" ]; then
    log "No rollback target available"
    return 1
  fi

  log "Rolling back to previous control revision and image"
  git -C "$CONTROL_DIR" reset --hard "$PREVIOUS_CONTROL_REV"
  git -C "$CONTROL_DIR" clean -fdx
  write_compose_env "$CURRENT_IMAGE_REF" "$COMPOSE_ENV_FILE"
  docker compose -f "$CONTROL_DIR/production/docker-compose.yml" --env-file "$COMPOSE_ENV_FILE" up -d --remove-orphans
  wait_for_app_health
}

main() {
  DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/tram}"
  CONTROL_DIR="${CONTROL_DIR:-$DEPLOY_ROOT/control}"
  RUNTIME_DIR="${RUNTIME_DIR:-$DEPLOY_ROOT/runtime}"
  STATE_DIR="${STATE_DIR:-$DEPLOY_ROOT/state}"
  SECRETS_DIR="${SECRETS_DIR:-$DEPLOY_ROOT/secrets}"
  PULL_ENV_FILE="${PULL_ENV_FILE:-$SECRETS_DIR/pull.env}"
  RUNTIME_ENV_FILE="${RUNTIME_ENV_FILE:-$RUNTIME_DIR/.env}"
  DEPLOY_BRANCH="${DEPLOY_BRANCH:-deploy-state}"
  DEPLOY_KEY_PATH="${DEPLOY_KEY_PATH:-$SECRETS_DIR/deploy_key}"
  GIT_SSH_KNOWN_HOSTS="${GIT_SSH_KNOWN_HOSTS:-$SECRETS_DIR/known_hosts}"
  APP_HEALTH_TIMEOUT="${APP_HEALTH_TIMEOUT:-180}"
  COMPOSE_ENV_FILE="$STATE_DIR/compose.env"
  CURRENT_STATE_FILE="$STATE_DIR/current.env"
  PREVIOUS_CONTROL_REV=""
  CURRENT_IMAGE_REF=""
  DESIRED_IMAGE_REF=""
  DESIRED_SOURCE_SHA=""
  DESIRED_UPDATED_AT=""

  require_command git
  require_command docker
  require_command date

  load_env_file "$PULL_ENV_FILE"

  DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/tram}"
  CONTROL_DIR="${CONTROL_DIR:-$DEPLOY_ROOT/control}"
  RUNTIME_DIR="${RUNTIME_DIR:-$DEPLOY_ROOT/runtime}"
  STATE_DIR="${STATE_DIR:-$DEPLOY_ROOT/state}"
  SECRETS_DIR="${SECRETS_DIR:-$DEPLOY_ROOT/secrets}"
  RUNTIME_ENV_FILE="${RUNTIME_ENV_FILE:-$RUNTIME_DIR/.env}"
  DEPLOY_BRANCH="${DEPLOY_BRANCH:-deploy-state}"
  DEPLOY_KEY_PATH="${DEPLOY_KEY_PATH:-$SECRETS_DIR/deploy_key}"
  GIT_SSH_KNOWN_HOSTS="${GIT_SSH_KNOWN_HOSTS:-$SECRETS_DIR/known_hosts}"
  APP_HEALTH_TIMEOUT="${APP_HEALTH_TIMEOUT:-180}"

  : "${REPO_SSH_URL:?REPO_SSH_URL must be set in $PULL_ENV_FILE}"

  [ -f "$RUNTIME_ENV_FILE" ] || fail "Runtime env file not found at $RUNTIME_ENV_FILE"

  mkdir -p "$CONTROL_DIR" "$STATE_DIR"
  configure_git_ssh

  if [ -d "$CONTROL_DIR/.git" ]; then
    PREVIOUS_CONTROL_REV="$(git -C "$CONTROL_DIR" rev-parse HEAD 2>/dev/null || true)"
  fi

  if [ -f "$CURRENT_STATE_FILE" ]; then
    # shellcheck disable=SC1090
    . "$CURRENT_STATE_FILE"
    CURRENT_IMAGE_REF="${IMAGE_REF:-}"
  fi

  log "Syncing control repo from $DEPLOY_BRANCH"
  sync_control_repo

  MANIFEST_FILE="$CONTROL_DIR/production/manifest.env"
  COMPOSE_FILE="$CONTROL_DIR/production/docker-compose.yml"

  [ -f "$MANIFEST_FILE" ] || fail "Missing manifest file at $MANIFEST_FILE"
  [ -f "$COMPOSE_FILE" ] || fail "Missing compose file at $COMPOSE_FILE"

  unset IMAGE_REF SOURCE_SHA UPDATED_AT
  # shellcheck disable=SC1090
  . "$MANIFEST_FILE"
  DESIRED_IMAGE_REF="${IMAGE_REF:-}"
  DESIRED_SOURCE_SHA="${SOURCE_SHA:-}"
  DESIRED_UPDATED_AT="${UPDATED_AT:-}"

  [ -n "$DESIRED_IMAGE_REF" ] || fail "manifest.env is missing IMAGE_REF"

  if [ "$DESIRED_IMAGE_REF" = "$CURRENT_IMAGE_REF" ]; then
    log "No new image to deploy"
    return 0
  fi

  log "Deploying $DESIRED_IMAGE_REF"
  write_compose_env "$DESIRED_IMAGE_REF" "$COMPOSE_ENV_FILE"
  if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
    log "Logging in to ghcr.io with configured credentials"
    printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
  else
    log "No GHCR credentials configured, assuming the package is public"
  fi

  if ! docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV_FILE" pull; then
    fail "docker compose pull failed"
  fi

  if ! docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV_FILE" up -d --remove-orphans; then
    rollback || true
    fail "docker compose up failed"
  fi

  if ! wait_for_app_health; then
    rollback || true
    fail "tram-app did not become healthy"
  fi

  {
    printf 'IMAGE_REF=%s\n' "$DESIRED_IMAGE_REF"
    printf 'SOURCE_SHA=%s\n' "$DESIRED_SOURCE_SHA"
    printf 'UPDATED_AT=%s\n' "$DESIRED_UPDATED_AT"
    printf 'DEPLOYED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$CURRENT_STATE_FILE"

  log "Deployment completed successfully"
}

main "$@"
