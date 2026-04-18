-- Partner linked user support

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "linkedUserId" TEXT;

CREATE INDEX IF NOT EXISTS "Organization_linkedUserId_idx" ON "Organization"("linkedUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Organization_linkedUserId_fkey'
  ) THEN
    ALTER TABLE "Organization"
      ADD CONSTRAINT "Organization_linkedUserId_fkey"
      FOREIGN KEY ("linkedUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
