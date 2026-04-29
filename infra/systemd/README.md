# Systemd-сервисы RuFlo

Systemd-юниты **генерируются автоматически** скриптом `scripts/setup-production.sh`
с правильными путями для конкретного сервера.

## Установка на production-сервер (один раз)

```bash
cd ~/sbs
sudo bash scripts/setup-production.sh
```

Скрипт создаст и активирует:
- `/etc/systemd/system/ruflo.service` — автозапуск Docker Compose при старте сервера
- `/etc/systemd/system/ruflo-watchdog.service` — watchdog, который следит за сайтом и перезапускает при 502

## Полезные команды после установки

```bash
sudo systemctl status ruflo             # статус стека
sudo systemctl restart ruflo            # перезапуск
sudo journalctl -u ruflo -f             # логи
sudo journalctl -u ruflo-watchdog -f    # логи watchdog
tail -f /var/log/ruflo-watchdog.log     # файл логов watchdog
```
