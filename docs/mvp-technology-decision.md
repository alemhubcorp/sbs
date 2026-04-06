# MVP Technology Decision

## Final Stack
- Backend: NestJS + TypeScript
- Frontend: Next.js + TypeScript
- Database: PostgreSQL
- Cache/Jobs: Redis + BullMQ
- Storage: MinIO
- Search: Meilisearch
- Auth: Keycloak
- Edge/Proxy: Traefik
- Observability: Prometheus, Grafana, Loki, Tempo, OpenTelemetry Collector
- Deployment: Docker Compose

## Data Access Rule
- Prisma-first for standard module CRUD and schema evolution.
- SQL-first for:
  - payments and ledger posting
  - escrow/release execution
  - audit/event timelines
  - outbox/inbox
  - reconciliation/reporting-critical queries

## Architecture Rule
- Strict modular monolith.
- No cross-module DB access without explicit internal contracts.
- No provider-specific logic in domain modules.
