-- Reconcile SyllabusRequirement with the current Prisma schema.
-- The existing record is populated with its known Standard before
-- the column is made required.

ALTER TABLE "SyllabusRequirement"
ADD COLUMN IF NOT EXISTS "standardId" TEXT;

UPDATE "SyllabusRequirement"
SET "standardId" = 'cmuhjdfzm0000mwun2g8wce97'
WHERE "id" = 'cmusqwt5a0000kwun904dra5w';

ALTER TABLE "SyllabusRequirement"
ALTER COLUMN "standardId" SET NOT NULL;

DROP INDEX IF EXISTS "SyllabusRequirement_schoolId_subjectId_topicId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "SyllabusRequirement_schoolId_standardId_subjectId_topicId_key"
ON "SyllabusRequirement"("schoolId", "standardId", "subjectId", "topicId");

CREATE INDEX IF NOT EXISTS "SyllabusRequirement_schoolId_idx"
ON "SyllabusRequirement"("schoolId");

CREATE INDEX IF NOT EXISTS "SyllabusRequirement_standardId_idx"
ON "SyllabusRequirement"("standardId");

CREATE INDEX IF NOT EXISTS "SyllabusRequirement_subjectId_idx"
ON "SyllabusRequirement"("subjectId");

CREATE INDEX IF NOT EXISTS "SyllabusRequirement_topicId_idx"
ON "SyllabusRequirement"("topicId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SyllabusRequirement_standardId_fkey'
  ) THEN
    ALTER TABLE "SyllabusRequirement"
    ADD CONSTRAINT "SyllabusRequirement_standardId_fkey"
    FOREIGN KEY ("standardId")
    REFERENCES "Standard"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$$;

-- Add the original-image and crop-state fields required by Synaptix
-- Institute Settings.

ALTER TABLE "Institute"
ADD COLUMN IF NOT EXISTS "logoOriginalUrl" TEXT,
ADD COLUMN IF NOT EXISTS "logoCropState" JSONB,
ADD COLUMN IF NOT EXISTS "bannerOriginalUrl" TEXT,
ADD COLUMN IF NOT EXISTS "bannerCropState" JSONB;
