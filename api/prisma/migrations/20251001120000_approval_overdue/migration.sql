ALTER TABLE "ApprovalWorkflow" ADD COLUMN "overdue" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Minute" ADD COLUMN "agreements" JSONB NOT NULL DEFAULT '[]'::jsonb;
