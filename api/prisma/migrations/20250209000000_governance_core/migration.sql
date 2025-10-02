-- Create enum for approval status
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- Add new governance relation columns
ALTER TABLE "Risk" ADD COLUMN "meetingId" TEXT;

-- Rename DecisionLog table and extend with governance metadata
ALTER TABLE "DecisionLog" RENAME TO "Decision";

ALTER TABLE "Decision" ADD COLUMN "committeeId" TEXT;
ALTER TABLE "Decision" ADD COLUMN "meetingId" TEXT;
ALTER TABLE "Decision" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Decision" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop old foreign key to recreate with new naming
ALTER TABLE "Decision" DROP CONSTRAINT IF EXISTS "DecisionLog_projectId_fkey";
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Governance tables
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

CREATE INDEX "Committee_projectId_idx" ON "Committee"("projectId");

ALTER TABLE "Committee" ADD CONSTRAINT "Committee_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

CREATE INDEX "Meeting_projectId_idx" ON "Meeting"("projectId");
CREATE INDEX "Meeting_committeeId_idx" ON "Meeting"("committeeId");

ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Minute" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Minute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Minute_meetingId_idx" ON "Minute"("meetingId");

ALTER TABLE "Minute" ADD CONSTRAINT "Minute_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Minute" ADD CONSTRAINT "Minute_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

CREATE UNIQUE INDEX "ApprovalWorkflow_resource_unique" ON "ApprovalWorkflow"("resourceType", "resourceId");
CREATE INDEX "ApprovalWorkflow_projectId_idx" ON "ApprovalWorkflow"("projectId");

ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

CREATE INDEX "ApprovalStep_workflowId_idx" ON "ApprovalStep"("workflowId");
CREATE INDEX "ApprovalStep_approverId_idx" ON "ApprovalStep"("approverId");

ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SlaTimer" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    CONSTRAINT "SlaTimer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SlaTimer_workflowId_idx" ON "SlaTimer"("workflowId");

ALTER TABLE "SlaTimer" ADD CONSTRAINT "SlaTimer_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

CREATE UNIQUE INDEX "ScopeChange_approvalWorkflowId_key" ON "ScopeChange"("approvalWorkflowId");
CREATE INDEX "ScopeChange_projectId_idx" ON "ScopeChange"("projectId");
CREATE INDEX "ScopeChange_meetingId_idx" ON "ScopeChange"("meetingId");

ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_approvalWorkflowId_fkey" FOREIGN KEY ("approvalWorkflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

CREATE INDEX "KpiSnapshot_projectId_date_idx" ON "KpiSnapshot"("projectId", "date");

ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- New indexes and foreign keys for Decision and Risk relations
CREATE INDEX "Decision_projectId_idx" ON "Decision"("projectId");
CREATE INDEX "Decision_committeeId_idx" ON "Decision"("committeeId");
CREATE INDEX "Decision_meetingId_idx" ON "Decision"("meetingId");

ALTER TABLE "Decision" ADD CONSTRAINT "Decision_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Risk_meetingId_idx" ON "Risk"("meetingId");
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
