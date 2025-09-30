-- AlterTable
ALTER TABLE "Interview"
  ADD COLUMN "personName" TEXT DEFAULT 'Entrevista pendiente',
  ADD COLUMN "role" TEXT,
  ADD COLUMN "area" TEXT,
  ADD COLUMN "date" TIMESTAMP(3),
  ADD COLUMN "transcript" TEXT,
  ADD COLUMN "audioFileId" TEXT,
  ALTER COLUMN "versionId" DROP NOT NULL,
  ALTER COLUMN "status" DROP NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'draft';

-- Backfill mandatory values for the new personName column
UPDATE "Interview"
SET "personName" = COALESCE("personName", 'Entrevista pendiente');

-- Ensure the column is required going forward
ALTER TABLE "Interview"
  ALTER COLUMN "personName" SET NOT NULL,
  ALTER COLUMN "personName" DROP DEFAULT;

-- Add foreign key for optional audio file attachments
ALTER TABLE "Interview"
  ADD CONSTRAINT "Interview_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
