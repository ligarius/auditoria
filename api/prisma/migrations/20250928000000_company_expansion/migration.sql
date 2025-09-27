-- AlterTable
ALTER TABLE "Company"
  ADD COLUMN     "taxId" TEXT,
  ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Project"
  ADD COLUMN     "ownerId" TEXT,
  ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Project"
SET "ownerId" = (
  SELECT "Membership"."userId"
  FROM "Membership"
  WHERE "Membership"."projectId" = "Project"."id"
  ORDER BY
    CASE
      WHEN "Membership"."role" IN ('Admin', 'ConsultorLider', 'owner') THEN 0
      ELSE 1
    END,
    "Membership"."userId"
  LIMIT 1
)
WHERE "ownerId" IS NULL;

ALTER TABLE "Project"
  ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
