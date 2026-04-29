#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$HOME/sbs}"
BRANCH="${BRANCH:-main}"

log() {
  printf '[deploy] %s\n' "$*"
}

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  log "project repo not found: $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

log "syncing repository to origin/$BRANCH"

# Build artifacts in the deployment clone must never block pull/sync.
find apps packages -name 'tsconfig.tsbuildinfo' -type f -delete 2>/dev/null || true

git fetch --prune origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

if [[ ! -f .env ]]; then
  log ".env is missing in $PROJECT_DIR"
  exit 1
fi

# Ensure Keycloak bootstrap runs on every deploy so seeded users always exist in Keycloak.
if grep -q "^KEYCLOAK_BOOTSTRAP_ON_STARTUP=false" .env; then
  sed -i 's/^KEYCLOAK_BOOTSTRAP_ON_STARTUP=false/KEYCLOAK_BOOTSTRAP_ON_STARTUP=true/' .env
  log "updated KEYCLOAK_BOOTSTRAP_ON_STARTUP to true in .env"
elif ! grep -q "^KEYCLOAK_BOOTSTRAP_ON_STARTUP" .env; then
  echo "KEYCLOAK_BOOTSTRAP_ON_STARTUP=true" >> .env
  log "added KEYCLOAK_BOOTSTRAP_ON_STARTUP=true to .env"
fi

log "validating docker compose configuration"
docker compose config -q

log "building production images"
docker compose build node-prod-base keycloak

log "starting updated stack"
docker compose up -d --remove-orphans

log "deployment finished"
docker compose ps
