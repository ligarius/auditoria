DO $$
BEGIN
    CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "meetingId" TEXT;

DO $$
BEGIN
    IF to_regclass('"DecisionLog"') IS NOT NULL THEN
        ALTER TABLE "DecisionLog" RENAME TO "Decision";
        ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "committeeId" TEXT;
        ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "meetingId" TEXT;
        ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ELSIF to_regclass('"Decision"') IS NOT NULL THEN
        ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "committeeId" TEXT;
        ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "meetingId" TEXT;
        ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE "Decision" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Drop old foreign key to recreate with new naming
ALTER TABLE "Decision" DROP CONSTRAINT IF EXISTS "DecisionLog_projectId_fkey";
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Decision_projectId_fkey'
    ) THEN
        ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Governance tables
DO $$
BEGIN
    IF to_regclass('"Committee"') IS NULL THEN
        CREATE TABLE "Committee" (
            "id" TEXT NOT NULL,
            "projectId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "description" TEXT,
            "ownerId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Committee"') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "Committee_projectId_idx" ON "Committee"("projectId");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Committee"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Committee_projectId_fkey'
        ) THEN
        ALTER TABLE "Committee" ADD CONSTRAINT "Committee_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"Committee"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Committee_ownerId_fkey'
        ) THEN
        ALTER TABLE "Committee" ADD CONSTRAINT "Committee_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Meeting"') IS NULL THEN
        CREATE TABLE "Meeting" (
            "id" TEXT NOT NULL,
            "projectId" TEXT NOT NULL,
            "committeeId" TEXT,
            "title" TEXT NOT NULL,
            "agenda" TEXT,
            "scheduledAt" TIMESTAMP(3) NOT NULL,
            "location" TEXT,
            "status" TEXT NOT NULL DEFAULT 'scheduled',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Meeting"') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "Meeting_projectId_idx" ON "Meeting"("projectId");
        CREATE INDEX IF NOT EXISTS "Meeting_committeeId_idx" ON "Meeting"("committeeId");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Meeting"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_projectId_fkey'
        ) THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"Meeting"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_committeeId_fkey'
        ) THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Minute"') IS NULL THEN
        CREATE TABLE "Minute" (
            "id" TEXT NOT NULL,
            "meetingId" TEXT NOT NULL,
            "authorId" TEXT,
            "content" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Minute_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Minute"') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "Minute_meetingId_idx" ON "Minute"("meetingId");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Minute"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Minute_meetingId_fkey'
        ) THEN
        ALTER TABLE "Minute" ADD CONSTRAINT "Minute_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"Minute"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Minute_authorId_fkey'
        ) THEN
        ALTER TABLE "Minute" ADD CONSTRAINT "Minute_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ApprovalWorkflow"') IS NULL THEN
        CREATE TABLE "ApprovalWorkflow" (
            "id" TEXT NOT NULL,
            "projectId" TEXT NOT NULL,
            "resourceType" TEXT NOT NULL,
            "resourceId" TEXT NOT NULL,
            "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
            "dueAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ApprovalWorkflow"') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalWorkflow_resource_unique" ON "ApprovalWorkflow"("resourceType", "resourceId");
        CREATE INDEX IF NOT EXISTS "ApprovalWorkflow_projectId_idx" ON "ApprovalWorkflow"("projectId");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ApprovalWorkflow"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ApprovalWorkflow_projectId_fkey'
        ) THEN
        ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ApprovalStep"') IS NULL THEN
        CREATE TABLE "ApprovalStep" (
            "id" TEXT NOT NULL,
            "workflowId" TEXT NOT NULL,
            "order" INTEGER NOT NULL,
            "approverId" TEXT,
            "approverRole" TEXT,
            "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
            "decidedAt" TIMESTAMP(3),
            "comments" TEXT,
            CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ApprovalStep"') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "ApprovalStep_workflowId_idx" ON "ApprovalStep"("workflowId");
        CREATE INDEX IF NOT EXISTS "ApprovalStep_approverId_idx" ON "ApprovalStep"("approverId");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ApprovalStep"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ApprovalStep_workflowId_fkey'
        ) THEN
        ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"ApprovalStep"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ApprovalStep_approverId_fkey'
        ) THEN
        ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"SlaTimer"') IS NULL THEN
        CREATE TABLE "SlaTimer" (
            "id" TEXT NOT NULL,
            "workflowId" TEXT NOT NULL,
            "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "dueAt" TIMESTAMP(3),
            "stoppedAt" TIMESTAMP(3),
            "status" TEXT NOT NULL DEFAULT 'running',
            CONSTRAINT "SlaTimer_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"SlaTimer"') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "SlaTimer_workflowId_idx" ON "SlaTimer"("workflowId");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"SlaTimer"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'SlaTimer_workflowId_fkey'
        ) THEN
        ALTER TABLE "SlaTimer" ADD CONSTRAINT "SlaTimer_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ScopeChange"') IS NULL THEN
        CREATE TABLE "ScopeChange" (
            "id" TEXT NOT NULL,
            "projectId" TEXT NOT NULL,
            "meetingId" TEXT,
            "title" TEXT NOT NULL,
            "description" TEXT,
            "impact" TEXT,
            "status" TEXT NOT NULL DEFAULT 'proposed',
            "requestedBy" TEXT,
            "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "decidedAt" TIMESTAMP(3),
            "decision" TEXT,
            "approvalWorkflowId" TEXT,
            CONSTRAINT "ScopeChange_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ScopeChange"') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS "ScopeChange_approvalWorkflowId_key" ON "ScopeChange"("approvalWorkflowId");
        CREATE INDEX IF NOT EXISTS "ScopeChange_projectId_idx" ON "ScopeChange"("projectId");
        CREATE INDEX IF NOT EXISTS "ScopeChange_meetingId_idx" ON "ScopeChange"("meetingId");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"ScopeChange"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ScopeChange_projectId_fkey'
        ) THEN
        ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"ScopeChange"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ScopeChange_meetingId_fkey'
        ) THEN
        ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"ScopeChange"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ScopeChange_approvalWorkflowId_fkey'
        ) THEN
        ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_approvalWorkflowId_fkey" FOREIGN KEY ("approvalWorkflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"KpiSnapshot"') IS NULL THEN
        CREATE TABLE "KpiSnapshot" (
            "id" TEXT NOT NULL,
            "projectId" TEXT NOT NULL,
            "date" TIMESTAMP(3) NOT NULL,
            "otif" DOUBLE PRECISION,
            "pickPerHour" DOUBLE PRECISION,
            "inventoryAccuracy" DOUBLE PRECISION,
            "occupancyPct" DOUBLE PRECISION,
            "costPerOrder" DOUBLE PRECISION,
            "kmPerDrop" DOUBLE PRECISION,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"KpiSnapshot"') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "KpiSnapshot_projectId_date_idx" ON "KpiSnapshot"("projectId", "date");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"KpiSnapshot"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'KpiSnapshot_projectId_fkey'
        ) THEN
        ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- New indexes and foreign keys for Decision and Risk relations
DO $$
BEGIN
    IF to_regclass('"Decision"') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "Decision_projectId_idx" ON "Decision"("projectId");
        CREATE INDEX IF NOT EXISTS "Decision_committeeId_idx" ON "Decision"("committeeId");
        CREATE INDEX IF NOT EXISTS "Decision_meetingId_idx" ON "Decision"("meetingId");
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Decision"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Decision_committeeId_fkey'
        ) THEN
        ALTER TABLE "Decision" ADD CONSTRAINT "Decision_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"Decision"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Decision_meetingId_fkey'
        ) THEN
        ALTER TABLE "Decision" ADD CONSTRAINT "Decision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('"Risk"') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "Risk_meetingId_idx" ON "Risk"("meetingId");
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"Risk"') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Risk_meetingId_fkey'
        ) THEN
        ALTER TABLE "Risk" ADD CONSTRAINT "Risk_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
