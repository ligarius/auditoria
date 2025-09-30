-- Crea tablas para encuestas del proyecto si aún no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Survey') THEN
    CREATE TABLE "Survey" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Survey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Survey_projectId_idx" ON "Survey"("projectId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SurveyQuestion') THEN
    CREATE TABLE "SurveyQuestion" (
      "id" TEXT PRIMARY KEY,
      "surveyId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "scaleMin" INTEGER,
      "scaleMax" INTEGER,
      "required" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SurveyQuestion_surveyId_idx" ON "SurveyQuestion"("surveyId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SurveyResponse') THEN
    CREATE TABLE "SurveyResponse" (
      "id" TEXT PRIMARY KEY,
      "surveyId" TEXT NOT NULL,
      "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SurveyResponse_surveyId_idx" ON "SurveyResponse"("surveyId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SurveyAnswer') THEN
    CREATE TABLE "SurveyAnswer" (
      "id" TEXT PRIMARY KEY,
      "responseId" TEXT NOT NULL,
      "questionId" TEXT NOT NULL,
      "value" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SurveyAnswer_responseId_idx" ON "SurveyAnswer"("responseId");
CREATE INDEX IF NOT EXISTS "SurveyAnswer_questionId_idx" ON "SurveyAnswer"("questionId");
