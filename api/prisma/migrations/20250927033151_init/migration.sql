-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("userId","projectId")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequestItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "format" TEXT,
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "fileId" TEXT,

    CONSTRAINT "DataRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "scaleMin" INTEGER,
    "scaleMax" INTEGER,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "respondent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "valueNumber" DOUBLE PRECISION,
    "valueText" TEXT,

    CONSTRAINT "SurveyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "role" TEXT,
    "area" TEXT,
    "date" TIMESTAMP(3),
    "transcript" TEXT,
    "audioFileId" TEXT,
    "notes" TEXT,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileId" TEXT,
    "url" TEXT,

    CONSTRAINT "ProcessAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemInventory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownerArea" TEXT,
    "usersActive" INTEGER,
    "criticality" TEXT,
    "objective" TEXT,
    "modulesUsed" TEXT,
    "hosting" TEXT,
    "vendor" TEXT,
    "version" TEXT,
    "supportActive" BOOLEAN,
    "goLive" TIMESTAMP(3),
    "lastUpdate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "SystemInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessCoverage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "subProcess" TEXT,
    "systemNameRef" TEXT,
    "coverage" INTEGER NOT NULL,
    "evidence" TEXT,
    "hasGap" BOOLEAN NOT NULL,
    "gapDesc" TEXT,
    "impact" TEXT,
    "frequency" TEXT,
    "owner" TEXT,

    CONSTRAINT "ProcessCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "periodicity" TEXT,
    "dailyVolume" INTEGER,
    "format" TEXT,
    "auth" TEXT,
    "stability" INTEGER,
    "errors30d" INTEGER,
    "sla" TEXT,
    "notes" TEXT,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataModelQuality" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "hasCriticalFields" BOOLEAN NOT NULL,
    "dataQuality" INTEGER NOT NULL,
    "hasBusinessRules" BOOLEAN NOT NULL,
    "historyYears" INTEGER,
    "traceability" BOOLEAN NOT NULL,
    "reports" TEXT,
    "inventoryAccuracyPct" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "DataModelQuality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityPosture" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "userLifecycle" TEXT,
    "rbac" TEXT,
    "mfa" BOOLEAN,
    "auditLogs" BOOLEAN,
    "backupsRPO" TEXT,
    "backupsRTO" TEXT,
    "tlsInTransit" BOOLEAN,
    "encryptionAtRest" BOOLEAN,
    "openVulns" TEXT,
    "compliance" TEXT,
    "notes" TEXT,

    CONSTRAINT "SecurityPosture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Performance" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "peakUsers" INTEGER,
    "latencyMs" INTEGER,
    "availabilityPct" DOUBLE PRECISION,
    "incidents90d" INTEGER,
    "topRootCause" TEXT,
    "capacityInfo" TEXT,
    "scalability" INTEGER,
    "notes" TEXT,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostLicensing" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "usersLicenses" INTEGER,
    "costAnnual" DOUBLE PRECISION,
    "implUSD" DOUBLE PRECISION,
    "infraUSD" DOUBLE PRECISION,
    "supportUSD" DOUBLE PRECISION,
    "otherUSD" DOUBLE PRECISION,

    CONSTRAINT "CostLicensing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "severity" INTEGER NOT NULL,
    "rag" TEXT NOT NULL,
    "mitigation" TEXT,
    "owner" TEXT,
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "evidence" TEXT,
    "impact" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "quickWin" BOOLEAN NOT NULL DEFAULT false,
    "effortDays" INTEGER,
    "responsibleR" TEXT,
    "accountableA" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Open',

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POCItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Pending',

    CONSTRAINT "POCItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "approverA" TEXT NOT NULL,

    CONSTRAINT "DecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reception" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "truckPlate" TEXT,
    "carrier" TEXT,
    "driverName" TEXT,
    "dock" TEXT,
    "tArriveGate" TIMESTAMP(3),
    "tArriveDock" TIMESTAMP(3),
    "tUnloadStart" TIMESTAMP(3),
    "tUnloadEnd" TIMESTAMP(3),
    "tExit" TIMESTAMP(3),
    "eppOk" BOOLEAN,
    "docsOk" BOOLEAN,
    "sealNumberDeclared" TEXT,
    "sealNumberObserved" TEXT,
    "tempAtOpen" DOUBLE PRECISION,
    "issues" TEXT,
    "inventoryMatchPct" DOUBLE PRECISION,
    "actions" TEXT,

    CONSTRAINT "Reception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPI" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequestItem" ADD CONSTRAINT "DataRequestItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequestItem" ADD CONSTRAINT "DataRequestItem_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAsset" ADD CONSTRAINT "ProcessAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAsset" ADD CONSTRAINT "ProcessAsset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemInventory" ADD CONSTRAINT "SystemInventory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessCoverage" ADD CONSTRAINT "ProcessCoverage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataModelQuality" ADD CONSTRAINT "DataModelQuality_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityPosture" ADD CONSTRAINT "SecurityPosture_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLicensing" ADD CONSTRAINT "CostLicensing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POCItem" ADD CONSTRAINT "POCItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPI" ADD CONSTRAINT "KPI_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
