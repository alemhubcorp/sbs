#!/usr/bin/env bash
set -euo pipefail

COMPOSE=(docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml)

echo "== docker compose ps =="
"${COMPOSE[@]}" ps

echo
echo "== api health =="
curl -sS http://localhost:3000/api/health

echo
echo
echo "== web =="
curl -sS -I http://localhost:3001

echo
echo "== admin =="
curl -sS -I http://localhost:3002/admin

echo
echo "== keycloak =="
curl -sS -I http://localhost:8080/auth

echo
echo "== keycloak realm =="
curl -sS http://localhost:8080/auth/realms/ruflo
