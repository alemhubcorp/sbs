# Project Structure

## Apps
- `apps/api`: NestJS API and modular monolith entrypoint
- `apps/web`: client-facing Next.js app
- `apps/admin`: admin control center Next.js app
- `apps/worker`: BullMQ and async processors
- `apps/ai-worker`: AI and agent runtime workers

## Packages
- `packages/contracts`: DTOs, API shapes, event contracts
- `packages/domain`: pure domain types, enums, policies
- `packages/config`: shared config loaders and schemas
- `packages/database`: Prisma schema, migrations, generated client target
- `packages/sql`: SQL-first queries, repositories, migrations for critical paths
- `packages/ui`: shared React UI primitives

## Infra
- `infra/compose`: compose overrides if needed later
- `infra/traefik`: reverse proxy config
- `infra/observability`: Prometheus, Loki, Tempo, Grafana provisioning
- `infra/keycloak`: realm bootstrap placeholders
- `infra/scripts`: local bootstrap placeholders
- `infra/data`: bind-mounted local persistent volumes
