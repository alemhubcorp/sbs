# Infrastructure

- `traefik`: reverse proxy and entrypoint
- external `cloudflared` on production EC2 forwards public traffic into local Traefik
- `observability`: metrics, logs, traces, dashboards
- `keycloak`: auth bootstrap placeholders
- `scripts`: local environment helpers
- `data`: local persistent volumes for Docker Compose
