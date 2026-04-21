#!/bin/sh

set -eu

SCHEMA_PATH="packages/database/prisma/schema.prisma"
FAILED_MIGRATIONS="
20260409003000_phase16_supplier_profiles
20260411120000_phase22_compliance_notifications
"

# Recover from known partial-apply states where the database objects already
# exist, but Prisma left the migration marked as failed.
for FAILED_MIGRATION in $FAILED_MIGRATIONS; do
  ./node_modules/.bin/prisma migrate resolve --rolled-back "$FAILED_MIGRATION" --schema "$SCHEMA_PATH" >/dev/null 2>&1 || true
done
./node_modules/.bin/prisma migrate deploy --schema "$SCHEMA_PATH"

exec node apps/api/dist/main.js
