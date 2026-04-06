# Module Rules

- Each module owns its application services, controllers, policies, and persistence adapters.
- Cross-module access goes through exported contracts only.
- No module reads another module's tables directly.
- SQL-first modules are isolated under `packages/sql`.
- Prisma-managed tables are accessed through `packages/database`.
