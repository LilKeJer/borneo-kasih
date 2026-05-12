ALTER TABLE "Users"
ADD COLUMN IF NOT EXISTS "email" varchar(100);

UPDATE "Users"
SET "email" = "AdminDetails"."email"
FROM "AdminDetails"
WHERE "Users"."id" = "AdminDetails"."user_id"
  AND "Users"."email" IS NULL;

UPDATE "Users"
SET "email" = "DoctorDetails"."email"
FROM "DoctorDetails"
WHERE "Users"."id" = "DoctorDetails"."user_id"
  AND "Users"."email" IS NULL;

UPDATE "Users"
SET "email" = "NurseDetails"."email"
FROM "NurseDetails"
WHERE "Users"."id" = "NurseDetails"."user_id"
  AND "Users"."email" IS NULL;

UPDATE "Users"
SET "email" = "ReceptionistDetails"."email"
FROM "ReceptionistDetails"
WHERE "Users"."id" = "ReceptionistDetails"."user_id"
  AND "Users"."email" IS NULL;

UPDATE "Users"
SET "email" = "PharmacistDetails"."email"
FROM "PharmacistDetails"
WHERE "Users"."id" = "PharmacistDetails"."user_id"
  AND "Users"."email" IS NULL;

UPDATE "Users"
SET "email" = "PatientDetails"."email"
FROM "PatientDetails"
WHERE "Users"."id" = "PatientDetails"."user_id"
  AND "Users"."email" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Users" WHERE "email" IS NULL) THEN
    RAISE EXCEPTION 'Migration stopped: some Users rows still have NULL email values.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT "email"
    FROM "Users"
    GROUP BY "email"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration stopped: duplicate email values found across Users.';
  END IF;
END $$;

ALTER TABLE "Users"
ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "Users"
DROP CONSTRAINT IF EXISTS "Users_username_unique";

DROP INDEX IF EXISTS "idx_username";

ALTER TABLE "Users"
ADD CONSTRAINT "Users_email_unique" UNIQUE ("email");

CREATE INDEX IF NOT EXISTS "idx_user_email" ON "Users" ("email");

ALTER TABLE "Users"
DROP COLUMN IF EXISTS "username";
