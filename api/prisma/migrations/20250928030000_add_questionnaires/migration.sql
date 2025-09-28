-- Drop legacy survey infrastructure
DROP TABLE IF EXISTS "SurveyAnswer" CASCADE;
DROP TABLE IF EXISTS "SurveyResponse" CASCADE;
DROP TABLE IF EXISTS "SurveyQuestion" CASCADE;
DROP TABLE IF EXISTS "Survey" CASCADE;

-- Drop legacy interview table so it can be recreated with the new structure
DROP TABLE IF EXISTS "Interview" CASCADE;

-- Questionnaire templates
CREATE TABLE "QuestionnaireTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionnaireTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuestionnaireTemplate_companyId_idx" ON "QuestionnaireTemplate"("companyId");

ALTER TABLE "QuestionnaireTemplate"
    ADD CONSTRAINT "QuestionnaireTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireTemplate"
    ADD CONSTRAINT "QuestionnaireTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Questionnaire versions
CREATE TABLE "QuestionnaireVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "formJson" JSONB NOT NULL,
    "scoringJson" JSONB,
    "skipLogicJson" JSONB,
    "status" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionnaireVersion_templateId_version_key" ON "QuestionnaireVersion"("templateId", "version");

ALTER TABLE "QuestionnaireVersion"
    ADD CONSTRAINT "QuestionnaireVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuestionnaireTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Survey links
CREATE TABLE "SurveyLink" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxResponses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SurveyLink_token_key" ON "SurveyLink"("token");
CREATE INDEX "SurveyLink_projectId_idx" ON "SurveyLink"("projectId");

ALTER TABLE "SurveyLink"
    ADD CONSTRAINT "SurveyLink_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SurveyLink"
    ADD CONSTRAINT "SurveyLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SurveyLink"
    ADD CONSTRAINT "SurveyLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Respondents
CREATE TABLE "Respondent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT,
    "department" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Respondent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Respondent_companyId_idx" ON "Respondent"("companyId");
CREATE INDEX "Respondent_email_idx" ON "Respondent"("email");
CREATE INDEX "Respondent_externalId_idx" ON "Respondent"("externalId");

ALTER TABLE "Respondent"
    ADD CONSTRAINT "Respondent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Interviews tied to questionnaire versions
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "respondentId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "audioKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Interview_projectId_idx" ON "Interview"("projectId");
CREATE INDEX "Interview_versionId_idx" ON "Interview"("versionId");

ALTER TABLE "Interview"
    ADD CONSTRAINT "Interview_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview"
    ADD CONSTRAINT "Interview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview"
    ADD CONSTRAINT "Interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview"
    ADD CONSTRAINT "Interview_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Questionnaire responses
CREATE TABLE "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "respondentId" TEXT,
    "surveyLinkId" TEXT,
    "answersJson" JSONB NOT NULL,
    "scoreTotal" DOUBLE PRECISION,
    "scoreDetailJson" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuestionnaireResponse_projectId_idx" ON "QuestionnaireResponse"("projectId");
CREATE INDEX "QuestionnaireResponse_versionId_idx" ON "QuestionnaireResponse"("versionId");
CREATE INDEX "QuestionnaireResponse_respondentId_idx" ON "QuestionnaireResponse"("respondentId");

ALTER TABLE "QuestionnaireResponse"
    ADD CONSTRAINT "QuestionnaireResponse_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireResponse"
    ADD CONSTRAINT "QuestionnaireResponse_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireResponse"
    ADD CONSTRAINT "QuestionnaireResponse_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireResponse"
    ADD CONSTRAINT "QuestionnaireResponse_surveyLinkId_fkey" FOREIGN KEY ("surveyLinkId") REFERENCES "SurveyLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
