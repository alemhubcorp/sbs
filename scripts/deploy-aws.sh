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

# ── Ensure admin user exists in Keycloak ─────────────────────────────────────
# Reads credentials from .env and creates/verifies the platform-admin user directly
# so that login works even if the API bootstrap did not run.
log "ensuring platform-admin user exists in Keycloak"

KC_INTERNAL="http://localhost:8080/auth"
KC_REALM="${KEYCLOAK_REALM:-ruflo}"
KC_ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
KC_ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
ADMIN_EMAIL="${KEYCLOAK_BOOTSTRAP_ADMIN_EMAIL:-admin@ruflo.local}"
ADMIN_PASSWORD="${KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD:-change-me-admin}"

# Load values from .env (override vars set above)
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(KEYCLOAK_REALM|KEYCLOAK_ADMIN|KEYCLOAK_ADMIN_PASSWORD|KEYCLOAK_BOOTSTRAP_ADMIN_EMAIL|KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD)=' .env || true)
  set +a
  KC_REALM="${KEYCLOAK_REALM:-ruflo}"
  KC_ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
  KC_ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
  ADMIN_EMAIL="${KEYCLOAK_BOOTSTRAP_ADMIN_EMAIL:-admin@ruflo.local}"
  ADMIN_PASSWORD="${KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD:-change-me-admin}"
fi

# Wait for Keycloak to be reachable (up to 60s)
KC_READY=false
for i in $(seq 1 12); do
  if docker compose exec -T keycloak curl -fs "http://localhost:8080/auth/realms/master" >/dev/null 2>&1; then
    KC_READY=true
    break
  fi
  log "waiting for Keycloak... ($i/12)"
  sleep 5
done

if [[ "$KC_READY" == "false" ]]; then
  log "Keycloak not reachable; skipping admin user ensure step"
else
  # Get master admin token
  TOKEN=$(docker compose exec -T keycloak curl -fs -X POST \
    "http://localhost:8080/auth/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=admin-cli&username=${KC_ADMIN_USER}&password=${KC_ADMIN_PASS}" \
    | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4 || true)

  if [[ -z "$TOKEN" ]]; then
    log "could not obtain Keycloak admin token; skipping admin user ensure step"
  else
    log "got Keycloak admin token; checking realm and user"

    # Ensure ruflo realm exists
    REALM_STATUS=$(docker compose exec -T keycloak curl -fs -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer ${TOKEN}" \
      "http://localhost:8080/auth/admin/realms/${KC_REALM}" || echo "000")

    if [[ "$REALM_STATUS" == "404" ]]; then
      log "creating realm ${KC_REALM}"
      docker compose exec -T keycloak curl -fs -X POST \
        "http://localhost:8080/auth/admin/realms" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"realm\":\"${KC_REALM}\",\"enabled\":true,\"loginWithEmailAllowed\":true,\"registrationAllowed\":false,\"resetPasswordAllowed\":true,\"duplicateEmailsAllowed\":false}" \
        >/dev/null || log "realm creation returned error (may already exist)"
    fi

    # Check if platform-admin user exists
    USER_COUNT=$(docker compose exec -T keycloak curl -fs \
      -H "Authorization: Bearer ${TOKEN}" \
      "http://localhost:8080/auth/admin/realms/${KC_REALM}/users?username=platform-admin&exact=true" \
      | grep -o '"id"' | wc -l || echo "0")

    if [[ "$USER_COUNT" -eq "0" ]]; then
      log "creating platform-admin user (${ADMIN_EMAIL})"
      docker compose exec -T keycloak curl -fs -X POST \
        "http://localhost:8080/auth/admin/realms/${KC_REALM}/users" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"platform-admin\",\"email\":\"${ADMIN_EMAIL}\",\"firstName\":\"Platform\",\"lastName\":\"Admin\",\"enabled\":true,\"emailVerified\":true,\"credentials\":[{\"type\":\"password\",\"value\":\"${ADMIN_PASSWORD}\",\"temporary\":false}]}" \
        >/dev/null && log "platform-admin user created" || log "user creation failed (may already exist)"
    else
      log "platform-admin user already exists"
    fi
  fi
fi
