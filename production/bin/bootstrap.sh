#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[tram-bootstrap] %s\n' "$*"
}

fail() {
  printf '[tram-bootstrap] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

main() {
  local script_dir source_repo_dir origin_url control_repo_dir unit_dir service_template service_file timer_file
  local deploy_root control_dir runtime_dir state_dir secrets_dir pull_env_file runtime_env_file
  local deploy_branch deploy_key_path known_hosts_file

  [ "$(id -u)" -eq 0 ] || fail "Run bootstrap as root"

  require_command git
  require_command systemctl
  require_command ssh-keyscan

  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source_repo_dir="$(cd "$script_dir/../../.." && pwd)"
  origin_url="$(git -C "$source_repo_dir" remote get-url origin 2>/dev/null || true)"

  deploy_root="${DEPLOY_ROOT:-/opt/tram}"
  control_dir="${CONTROL_DIR:-$deploy_root/control}"
  runtime_dir="${RUNTIME_DIR:-$deploy_root/runtime}"
  state_dir="${STATE_DIR:-$deploy_root/state}"
  secrets_dir="${SECRETS_DIR:-$deploy_root/secrets}"
  pull_env_file="${PULL_ENV_FILE:-$secrets_dir/pull.env}"
  runtime_env_file="${RUNTIME_ENV_FILE:-$runtime_dir/.env}"
  deploy_branch="${DEPLOY_BRANCH:-deploy-state}"
  deploy_key_path="${DEPLOY_KEY_PATH:-$secrets_dir/deploy_key}"
  known_hosts_file="${GIT_SSH_KNOWN_HOSTS:-$secrets_dir/known_hosts}"
  REPO_SSH_URL="${REPO_SSH_URL:-$origin_url}"

  : "${REPO_SSH_URL:?REPO_SSH_URL must be set}"
  : "${GHCR_USERNAME:?GHCR_USERNAME must be set}"
  : "${GHCR_TOKEN:?GHCR_TOKEN must be set}"

  [ -f "$deploy_key_path" ] || fail "Deploy key not found at $deploy_key_path"
  [ -f "$runtime_env_file" ] || fail "Runtime env file not found at $runtime_env_file"

  mkdir -p "$control_dir" "$runtime_dir" "$state_dir" "$secrets_dir"
  chmod 700 "$secrets_dir"
  chmod 600 "$deploy_key_path"

  if [ ! -f "$known_hosts_file" ]; then
    ssh-keyscan github.com > "$known_hosts_file"
    chmod 644 "$known_hosts_file"
  fi

  cat > "$pull_env_file" <<EOF
DEPLOY_ROOT=$deploy_root
CONTROL_DIR=$control_dir
RUNTIME_DIR=$runtime_dir
STATE_DIR=$state_dir
SECRETS_DIR=$secrets_dir
RUNTIME_ENV_FILE=$runtime_env_file
REPO_SSH_URL=$REPO_SSH_URL
DEPLOY_BRANCH=$deploy_branch
DEPLOY_KEY_PATH=$deploy_key_path
GIT_SSH_KNOWN_HOSTS=$known_hosts_file
GHCR_USERNAME=$GHCR_USERNAME
GHCR_TOKEN=$GHCR_TOKEN
EOF
  chmod 600 "$pull_env_file"

  export GIT_SSH_COMMAND="ssh -i $deploy_key_path -o IdentitiesOnly=yes -o UserKnownHostsFile=$known_hosts_file -o StrictHostKeyChecking=yes"

  control_repo_dir="$(mktemp -d)"
  git clone --branch "$deploy_branch" --depth 1 "$REPO_SSH_URL" "$control_repo_dir"
  rm -rf "$control_dir"
  mv "$control_repo_dir" "$control_dir"

  chmod +x "$control_dir/production/bin/deploy.sh"

  unit_dir="/etc/systemd/system"
  service_template="$control_dir/production/systemd/tram-pull.service"
  service_file="$unit_dir/tram-pull.service"
  timer_file="$unit_dir/tram-pull.timer"

  sed "s|__DEPLOY_ROOT__|$deploy_root|g" "$service_template" > "$service_file"
  cp "$control_dir/production/systemd/tram-pull.timer" "$timer_file"

  systemctl daemon-reload
  systemctl enable --now tram-pull.timer

  log "Bootstrap complete"
  log "Run: systemctl start tram-pull.service"
}

main "$@"
