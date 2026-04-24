# RuFlo MVP Foundation

Production-grade MVP scaffold for a self-hosted B2B2C marketplace-fintech platform built as a strict modular monolith.

## Stack
- Backend: NestJS + TypeScript
- Frontend: Next.js + TypeScript
- Database: PostgreSQL
- Cache/Jobs: Redis + BullMQ
- Storage: MinIO
- Search: Meilisearch
- Auth: Keycloak
- Edge: Traefik
- Observability: Prometheus, Grafana, Loki, Tempo
- Deployment: Docker Compose

## Workspace
- `apps/api`: NestJS modular monolith API
- `apps/web`: Next.js client surface
- `apps/admin`: Next.js admin control center
- `apps/worker`: BullMQ workers
- `apps/ai-worker`: AI and agent job workers
- `packages/contracts`: shared contracts and DTOs
- `packages/domain`: pure domain types and policies
- `packages/config`: shared config schemas
- `packages/database`: Prisma schema and migrations
- `packages/sql`: SQL-first queries for payments, audit, outbox/inbox
- `packages/ui`: shared frontend design system package
- `infra`: Docker, observability, reverse proxy, auth, and local data layout
- `docs`: architecture and technology decision records

## Run Commands
- Install dependencies: `npm install --script-shell=/bin/bash`
- Generate Prisma client: `HOME=/tmp XDG_CACHE_HOME=/tmp PRISMA_ENGINES_CACHE_DIR=/tmp/prisma-engines npm run prisma:generate`
- Build everything: `HOME=/tmp XDG_CACHE_HOME=/tmp PRISMA_ENGINES_CACHE_DIR=/tmp/prisma-engines npm run build`
- Start API: `npm run start -w @ruflo/api`
- Start web app: `npm run start -w @ruflo/web`
- Start admin app: `npm run start -w @ruflo/admin`
- Start worker: `npm run start -w @ruflo/worker`
- Start AI worker: `npm run start -w @ruflo/ai-worker`
- Start infrastructure with Docker Compose: `docker compose up -d`

## Local Docker Runtime
- Local override file: `docker-compose.local.yml`
- Local env template: `.env.local.example`
- Build local runtime images: `npm run local:build`
- Start full local stack: `npm run local:up`
- Check local health and redirects: `npm run local:check`
- Rebuild only local admin runtime cleanly: `npm run local:rebuild:admin`
- Stop local stack: `npm run local:down`

## Boundary Rules
- Retail and wholesale transaction logic stay separate.
- Payments, audit, and outbox/inbox are SQL-first.
- Documents are stored in MinIO, metadata in PostgreSQL.
- Provider integrations go through the integration hub module.
- AI policy and agent runtime are placeholders in MVP, not autonomous systems.
