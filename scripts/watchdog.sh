#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RuFlo Watchdog — проверяет доступность сайта и перезапускает упавшие контейнеры
# Запускается как systemd-сервис (ruflo-watchdog.service)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Определяем директорию проекта автоматически (папка выше папки scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SITE_URL="https://alemhub.sbs/api/health/readiness"
CHECK_INTERVAL=60          # секунды между проверками
FAILURE_THRESHOLD=3        # сколько провалов подряд до перезапуска
LOG_FILE="/var/log/ruflo-watchdog.log"

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"
}

restart_stack() {
  log "⚠️  Перезапуск traefik..."
  cd "$PROJECT_DIR"
  docker compose restart traefik 2>&1 | tee -a "$LOG_FILE" || true
  sleep 15
  if ! docker compose ps traefik | grep -q "Up"; then
    log "🔴 traefik не поднялся — перезапускаем весь стек..."
    docker compose up -d --remove-orphans 2>&1 | tee -a "$LOG_FILE" || true
  fi
  log "✅ Перезапуск выполнен"
}

check_site() {
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 --retry 0 \
    "$SITE_URL" 2>/dev/null || echo "000")
  echo "$http_code"
}

log "🚀 RuFlo Watchdog запущен. Проект: $PROJECT_DIR. Проверка каждые ${CHECK_INTERVAL}с"

failure_count=0

while true; do
  # 1. Проверяем traefik как локальный origin для внешнего cloudflared
  if ! docker compose ps traefik 2>/dev/null | grep -q "Up"; then
    log "🔴 traefik не запущен!"
    failure_count=$((failure_count + 1))
  fi

  # 2. Проверяем HTTP-ответ сайта
  http_code=$(check_site)
  if [[ "$http_code" == "200" || "$http_code" == "301" || "$http_code" == "302" ]]; then
    if [[ $failure_count -gt 0 ]]; then
      log "✅ Сайт восстановился (HTTP $http_code). Сброс счётчика ошибок."
    fi
    failure_count=0
  else
    failure_count=$((failure_count + 1))
    log "⚠️  Сайт недоступен (HTTP $http_code). Ошибок подряд: $failure_count/$FAILURE_THRESHOLD"
  fi

  # 3. Если ошибок накопилось достаточно — перезапускаем
  if [[ $failure_count -ge $FAILURE_THRESHOLD ]]; then
    log "🚨 Порог ошибок ($FAILURE_THRESHOLD) достигнут — запускаю восстановление"
    restart_stack
    failure_count=0
  fi

  sleep "$CHECK_INTERVAL"
done
