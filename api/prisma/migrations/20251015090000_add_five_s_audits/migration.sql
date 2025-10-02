CREATE TABLE "FiveS_Audit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FiveS_Audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FiveS_Audit_projectId_idx" ON "FiveS_Audit"("projectId");
CREATE INDEX "FiveS_Audit_auditDate_idx" ON "FiveS_Audit"("auditDate");

ALTER TABLE "FiveS_Audit" ADD CONSTRAINT "FiveS_Audit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FiveS_Audit" ADD CONSTRAINT "FiveS_Audit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
