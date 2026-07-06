ALTER TABLE "ServiceCatalog"
ADD COLUMN IF NOT EXISTS "doctor_id" integer;

ALTER TABLE "ServiceCatalog"
ADD COLUMN IF NOT EXISTS "is_doctor_default" boolean DEFAULT false;

UPDATE "ServiceCatalog"
SET "is_doctor_default" = false
WHERE "is_doctor_default" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ServiceCatalog_doctor_id_Users_id_fk'
  ) THEN
    ALTER TABLE "ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_doctor_id_Users_id_fk"
    FOREIGN KEY ("doctor_id")
    REFERENCES "Users"("id")
    ON DELETE no action
    ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_doctor_default_service'
  ) THEN
    ALTER TABLE "ServiceCatalog"
    ADD CONSTRAINT "check_doctor_default_service"
    CHECK (
      "is_doctor_default" = false
      OR ("doctor_id" IS NOT NULL AND "category" = 'Konsultasi')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_service_doctor"
ON "ServiceCatalog" ("doctor_id");

CREATE INDEX IF NOT EXISTS "idx_service_doctor_default"
ON "ServiceCatalog" ("doctor_id", "is_doctor_default");

CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_default_service_per_doctor"
ON "ServiceCatalog" ("doctor_id")
WHERE "is_doctor_default" = true
  AND "is_active" = true
  AND "deleted_at" IS NULL;
