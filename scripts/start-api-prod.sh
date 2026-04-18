#!/bin/sh

set -eu

SCHEMA_PATH="packages/database/prisma/schema.prisma"
FAILED_MIGRATION="20260409003000_phase16_supplier_profiles"

# Recover from the known partial-apply state where the columns already exist,
# but Prisma left the migration recorded as failed.
./node_modules/.bin/prisma migrate resolve --rolled-back "$FAILED_MIGRATION" --schema "$SCHEMA_PATH" >/dev/null 2>&1 || true
./node_modules/.bin/prisma migrate deploy --schema "$SCHEMA_PATH"

exec node apps/api/dist/main.js
