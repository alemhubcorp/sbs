#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RuFlo Production Setup — устанавливает автозапуск стека и watchdog на AWS
# Запускать ОДИН РАЗ на production-сервере от root или sudo
#
# Использование (запускать из директории проекта):
#   cd ~/sbs
#   sudo bash scripts/setup-production.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Определяем директорию проекта из расположения скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SYSTEMD_DIR="/etc/systemd/system"

echo "=== RuFlo Production Setup ==="
echo "→ Директория проекта: $PROJECT_DIR"

# ── 1. Проверяем .env ────────────────────────────────────────────────────────
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo ""
  echo "❌ Файл .env не найден!"
  echo "   Создай его: cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env"
  echo "   Затем отредактируй: nano $PROJECT_DIR/.env"
  exit 1
fi

if ! grep -q "CLOUDFLARE_TUNNEL_TOKEN=.\+" "$PROJECT_DIR/.env" 2>/dev/null; then
  echo ""
  echo "⚠️  CLOUDFLARE_TUNNEL_TOKEN не задан в .env!"
  echo "   Получи токен: Cloudflare Zero Trust → Access → Tunnels → [твой туннель] → Configure → Token"
  echo "   Добавь в $PROJECT_DIR/.env:"
  echo "   CLOUDFLARE_TUNNEL_TOKEN=eyJhbGciO..."
  echo ""
  echo "   Продолжаю установку, но cloudflared не запустится без токена!"
fi

# ── 2. Делаем скрипты исполняемыми ──────────────────────────────────────────
chmod +x "$PROJECT_DIR/scripts/watchdog.sh"
chmod +x "$PROJECT_DIR/scripts/setup-production.sh"
chmod +x "$PROJECT_DIR/scripts/start-api-prod.sh"

# ── 3. Создаём лог-файл для watchdog ────────────────────────────────────────
touch /var/log/ruflo-watchdog.log
chmod 644 /var/log/ruflo-watchdog.log

# ── 4. Генерируем systemd-юниты с правильными путями ─────────────────────────
echo ""
echo "→ Генерируем systemd-юниты для $PROJECT_DIR..."

cat > "$SYSTEMD_DIR/ruflo.service" <<EOF
[Unit]
Description=RuFlo Production Stack (Docker Compose)
Documentation=https://alemhub.sbs
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR

ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down --timeout 30
ExecReload=/usr/bin/docker compose up -d --remove-orphans

TimeoutStartSec=300
TimeoutStopSec=60

Restart=on-failure
RestartSec=30s

[Install]
WantedBy=multi-user.target
EOF

cat > "$SYSTEMD_DIR/ruflo-watchdog.service" <<EOF
[Unit]
Description=RuFlo Watchdog — auto-heals 502 errors
After=ruflo.service
Requires=ruflo.service

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/scripts/watchdog.sh
Restart=always
RestartSec=60s

[Install]
WantedBy=multi-user.target
EOF

echo "   ✅ /etc/systemd/system/ruflo.service"
echo "   ✅ /etc/systemd/system/ruflo-watchdog.service"

# ── 5. Активируем и запускаем ────────────────────────────────────────────────
echo ""
echo "→ Перезагружаем systemd daemon..."
systemctl daemon-reload

echo "→ Включаем автозапуск при старте сервера..."
systemctl enable ruflo.service
systemctl enable ruflo-watchdog.service

echo "→ Запускаем ruflo.service..."
systemctl start ruflo.service

echo "→ Запускаем ruflo-watchdog.service..."
systemctl start ruflo-watchdog.service

# ── 6. Итоговый статус ───────────────────────────────────────────────────────
echo ""
echo "=== Статус ==="
systemctl is-active ruflo.service && echo "✅ ruflo: активен" || echo "❌ ruflo: не активен"
systemctl is-active ruflo-watchdog.service && echo "✅ watchdog: активен" || echo "❌ watchdog: не активен"

echo ""
echo "✅ Готово! Теперь стек автоматически:"
echo "   • Стартует при перезагрузке сервера"
echo "   • Поднимает cloudflared (больше нет 502)"
echo "   • Watchdog проверяет сайт каждые 60 сек и перезапускает при сбоях"
echo ""
echo "Полезные команды:"
echo "  sudo systemctl status ruflo             # статус стека"
echo "  sudo systemctl restart ruflo            # перезапуск стека"
echo "  sudo journalctl -u ruflo -f             # логи стека"
echo "  sudo journalctl -u ruflo-watchdog -f    # логи watchdog"
echo "  tail -f /var/log/ruflo-watchdog.log     # логи watchdog (файл)"
echo "  cd $PROJECT_DIR && docker compose ps   # статус контейнеров"
