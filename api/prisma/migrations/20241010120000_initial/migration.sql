-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('PLANIFICACION', 'TRABAJO_CAMPO', 'INFORME', 'RECOMENDACIONES', 'CIERRE');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('AS_IS', 'TO_BE');

-- CreateEnum
CREATE TYPE "SopStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('open', 'in_progress', 'completed', 'signed');

-- CreateEnum
CREATE TYPE "ActionCategory" AS ENUM ('quick_win', 'capex', 'opex');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('todo', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "BarcodeLabelType" AS ENUM ('SKU', 'LOCATION');

-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM ('planned', 'running', 'closed');

-- CreateEnum
CREATE TYPE "HSECheckType" AS ENUM ('induccion', 'checklist', 'inspeccion');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RoutePlanStatus" AS ENUM ('draft', 'optimizing', 'completed');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EstadoProyecto" NOT NULL DEFAULT 'PLANIFICACION',
    "ownerId" TEXT,
    "settings" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "workflowDefinition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HSE_Check" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "HSECheckType" NOT NULL,
    "title" TEXT NOT NULL,
    "conductedBy" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HSE_Check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PPE_Assign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "role" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredBy" TEXT,
    "notes" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PPE_Assign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'baja',
    "description" TEXT,
    "reportedBy" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "immediateActions" TEXT,
    "correctiveActions" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiveS_Audit_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "DataRequestCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRequestCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "role" TEXT,
    "area" TEXT,
    "date" TIMESTAMP(3),
    "transcript" TEXT,
    "notes" TEXT,
    "audioFileId" TEXT,
    "versionId" TEXT,
    "interviewerId" TEXT NOT NULL,
    "respondentId" TEXT,
    "status" TEXT DEFAULT 'draft',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "audioKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProcessType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sop" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "SopStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopStep" (
    "id" TEXT NOT NULL,
    "sopId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "kpi" JSONB,

    CONSTRAINT "SopStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "sopId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'open',
    "signedById" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Planificado',
    "progress" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
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
    "meetingId" TEXT,

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
    "severity" TEXT NOT NULL DEFAULT 'media',
    "area" TEXT,
    "costEstimate" DOUBLE PRECISION,
    "isQuickWin" BOOLEAN NOT NULL DEFAULT false,
    "effortDays" INTEGER,
    "responsibleR" TEXT,
    "accountableA" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "findingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "dueDate" TIMESTAMP(3),
    "category" "ActionCategory" NOT NULL DEFAULT 'quick_win',
    "status" "ActionStatus" NOT NULL DEFAULT 'todo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "committeeId" TEXT,
    "meetingId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "approverA" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Committee" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Minute" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "agreements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Minute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeChange" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "meetingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "impact" TEXT,
    "scheduleImpact" TEXT NOT NULL DEFAULT '',
    "costImpact" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decision" TEXT,
    "approvalWorkflowId" TEXT,

    CONSTRAINT "ScopeChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "dueAt" TIMESTAMP(3),
    "overdue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "SlaTimer" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',

    CONSTRAINT "SlaTimer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "WarehouseZone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rack" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "rackId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "pos" INTEGER NOT NULL,
    "codeZRNP" TEXT NOT NULL,
    "skuId" TEXT,
    "expectedQty" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityCalc" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "rackType" TEXT NOT NULL,
    "aisles" INTEGER NOT NULL,
    "pp" INTEGER NOT NULL,
    "memo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacityCalc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sku" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'planned',
    "tolerancePct" DOUBLE PRECISION,
    "plannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTask" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "blind" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryScan" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "skuId" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,

    CONSTRAINT "InventoryScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryRecount" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "qty2" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryRecount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryVariance" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "skuId" TEXT,
    "expectedQty" DOUBLE PRECISION NOT NULL,
    "foundQty" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryVariance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarcodeLabel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "BarcodeLabelType" NOT NULL,
    "code" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'CODE128',
    "printedAt" TIMESTAMP(3),
    "installedAt" TIMESTAMP(3),
    "installedById" TEXT,
    "skuId" TEXT,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodeLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuDupCandidate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "skuAId" TEXT NOT NULL,
    "skuBId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuDupCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "carrierId" TEXT,
    "scenario" TEXT NOT NULL,
    "status" "RoutePlanStatus" NOT NULL DEFAULT 'draft',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "carrierId" TEXT,
    "name" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "costKm" DOUBLE PRECISION NOT NULL,
    "fixed" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "carrierId" TEXT,
    "fromClient" TEXT NOT NULL,
    "toClient" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "demandVol" DOUBLE PRECISION,
    "demandKg" DOUBLE PRECISION,
    "sequence" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_companyId_name_key" ON "Project"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "HSE_Check_projectId_idx" ON "HSE_Check"("projectId");

-- CreateIndex
CREATE INDEX "PPE_Assign_projectId_idx" ON "PPE_Assign"("projectId");

-- CreateIndex
CREATE INDEX "Incident_projectId_idx" ON "Incident"("projectId");

-- CreateIndex
CREATE INDEX "FiveS_Audit_projectId_idx" ON "FiveS_Audit"("projectId");

-- CreateIndex
CREATE INDEX "FiveS_Audit_auditDate_idx" ON "FiveS_Audit"("auditDate");

-- CreateIndex
CREATE UNIQUE INDEX "DataRequestCategory_name_key" ON "DataRequestCategory"("name");

-- CreateIndex
CREATE INDEX "QuestionnaireTemplate_companyId_idx" ON "QuestionnaireTemplate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireVersion_templateId_version_key" ON "QuestionnaireVersion"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyLink_token_key" ON "SurveyLink"("token");

-- CreateIndex
CREATE INDEX "SurveyLink_projectId_idx" ON "SurveyLink"("projectId");

-- CreateIndex
CREATE INDEX "Survey_projectId_idx" ON "Survey"("projectId");

-- CreateIndex
CREATE INDEX "SurveyQuestion_surveyId_idx" ON "SurveyQuestion"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyResponse_surveyId_idx" ON "SurveyResponse"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyAnswer_responseId_idx" ON "SurveyAnswer"("responseId");

-- CreateIndex
CREATE INDEX "SurveyAnswer_questionId_idx" ON "SurveyAnswer"("questionId");

-- CreateIndex
CREATE INDEX "Respondent_companyId_idx" ON "Respondent"("companyId");

-- CreateIndex
CREATE INDEX "Respondent_email_idx" ON "Respondent"("email");

-- CreateIndex
CREATE INDEX "Respondent_externalId_idx" ON "Respondent"("externalId");

-- CreateIndex
CREATE INDEX "Interview_projectId_idx" ON "Interview"("projectId");

-- CreateIndex
CREATE INDEX "Interview_versionId_idx" ON "Interview"("versionId");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_projectId_idx" ON "QuestionnaireResponse"("projectId");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_versionId_idx" ON "QuestionnaireResponse"("versionId");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_respondentId_idx" ON "QuestionnaireResponse"("respondentId");

-- CreateIndex
CREATE INDEX "Process_projectId_idx" ON "Process"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Process_projectId_name_type_version_key" ON "Process"("projectId", "name", "type", "version");

-- CreateIndex
CREATE INDEX "Sop_processId_idx" ON "Sop"("processId");

-- CreateIndex
CREATE INDEX "SopStep_sopId_idx" ON "SopStep"("sopId");

-- CreateIndex
CREATE UNIQUE INDEX "SopStep_sopId_order_key" ON "SopStep"("sopId", "order");

-- CreateIndex
CREATE INDEX "Checklist_sopId_idx" ON "Checklist"("sopId");

-- CreateIndex
CREATE INDEX "Checklist_assigneeId_idx" ON "Checklist"("assigneeId");

-- CreateIndex
CREATE INDEX "Checklist_signedById_idx" ON "Checklist"("signedById");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_idx" ON "ChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "ProjectTask_projectId_idx" ON "ProjectTask"("projectId");

-- CreateIndex
CREATE INDEX "ProjectTask_parentId_idx" ON "ProjectTask"("parentId");

-- CreateIndex
CREATE INDEX "Risk_meetingId_idx" ON "Risk"("meetingId");

-- CreateIndex
CREATE INDEX "ActionItem_projectId_idx" ON "ActionItem"("projectId");

-- CreateIndex
CREATE INDEX "ActionItem_findingId_idx" ON "ActionItem"("findingId");

-- CreateIndex
CREATE INDEX "Decision_projectId_idx" ON "Decision"("projectId");

-- CreateIndex
CREATE INDEX "Decision_committeeId_idx" ON "Decision"("committeeId");

-- CreateIndex
CREATE INDEX "Decision_meetingId_idx" ON "Decision"("meetingId");

-- CreateIndex
CREATE INDEX "Committee_projectId_idx" ON "Committee"("projectId");

-- CreateIndex
CREATE INDEX "Meeting_projectId_idx" ON "Meeting"("projectId");

-- CreateIndex
CREATE INDEX "Meeting_committeeId_idx" ON "Meeting"("committeeId");

-- CreateIndex
CREATE INDEX "Minute_meetingId_idx" ON "Minute"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeChange_approvalWorkflowId_key" ON "ScopeChange"("approvalWorkflowId");

-- CreateIndex
CREATE INDEX "ScopeChange_projectId_idx" ON "ScopeChange"("projectId");

-- CreateIndex
CREATE INDEX "ScopeChange_meetingId_idx" ON "ScopeChange"("meetingId");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_projectId_idx" ON "ApprovalWorkflow"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_resource_unique" ON "ApprovalWorkflow"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ApprovalStep_workflowId_idx" ON "ApprovalStep"("workflowId");

-- CreateIndex
CREATE INDEX "ApprovalStep_approverId_idx" ON "ApprovalStep"("approverId");

-- CreateIndex
CREATE INDEX "SlaTimer_workflowId_idx" ON "SlaTimer"("workflowId");

-- CreateIndex
CREATE INDEX "KpiSnapshot_projectId_date_idx" ON "KpiSnapshot"("projectId", "date");

-- CreateIndex
CREATE INDEX "WarehouseZone_projectId_idx" ON "WarehouseZone"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseZone_projectId_code_key" ON "WarehouseZone"("projectId", "code");

-- CreateIndex
CREATE INDEX "Rack_projectId_idx" ON "Rack"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Rack_zoneId_code_key" ON "Rack"("zoneId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Location_codeZRNP_key" ON "Location"("codeZRNP");

-- CreateIndex
CREATE INDEX "Location_projectId_idx" ON "Location"("projectId");

-- CreateIndex
CREATE INDEX "Location_zoneId_idx" ON "Location"("zoneId");

-- CreateIndex
CREATE INDEX "Location_rackId_idx" ON "Location"("rackId");

-- CreateIndex
CREATE INDEX "CapacityCalc_zoneId_idx" ON "CapacityCalc"("zoneId");

-- CreateIndex
CREATE INDEX "Sku_projectId_idx" ON "Sku"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Sku_projectId_code_key" ON "Sku"("projectId", "code");

-- CreateIndex
CREATE INDEX "InventoryCount_projectId_idx" ON "InventoryCount"("projectId");

-- CreateIndex
CREATE INDEX "InventoryTask_countId_idx" ON "InventoryTask"("countId");

-- CreateIndex
CREATE INDEX "InventoryTask_zoneId_idx" ON "InventoryTask"("zoneId");

-- CreateIndex
CREATE INDEX "InventoryTask_assignedToId_idx" ON "InventoryTask"("assignedToId");

-- CreateIndex
CREATE INDEX "InventoryScan_taskId_idx" ON "InventoryScan"("taskId");

-- CreateIndex
CREATE INDEX "InventoryScan_locationId_idx" ON "InventoryScan"("locationId");

-- CreateIndex
CREATE INDEX "InventoryScan_skuId_idx" ON "InventoryScan"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryRecount_scanId_key" ON "InventoryRecount"("scanId");

-- CreateIndex
CREATE INDEX "InventoryVariance_countId_idx" ON "InventoryVariance"("countId");

-- CreateIndex
CREATE INDEX "InventoryVariance_locationId_idx" ON "InventoryVariance"("locationId");

-- CreateIndex
CREATE INDEX "InventoryVariance_skuId_idx" ON "InventoryVariance"("skuId");

-- CreateIndex
CREATE INDEX "BarcodeLabel_projectId_type_idx" ON "BarcodeLabel"("projectId", "type");

-- CreateIndex
CREATE INDEX "BarcodeLabel_installedById_idx" ON "BarcodeLabel"("installedById");

-- CreateIndex
CREATE UNIQUE INDEX "BarcodeLabel_projectId_type_code_key" ON "BarcodeLabel"("projectId", "type", "code");

-- CreateIndex
CREATE INDEX "SkuDupCandidate_projectId_idx" ON "SkuDupCandidate"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SkuDupCandidate_skuAId_skuBId_key" ON "SkuDupCandidate"("skuAId", "skuBId");

-- CreateIndex
CREATE INDEX "Carrier_projectId_idx" ON "Carrier"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_projectId_name_key" ON "Carrier"("projectId", "name");

-- CreateIndex
CREATE INDEX "RoutePlan_projectId_idx" ON "RoutePlan"("projectId");

-- CreateIndex
CREATE INDEX "RoutePlan_carrierId_idx" ON "RoutePlan"("carrierId");

-- CreateIndex
CREATE INDEX "Vehicle_planId_idx" ON "Vehicle"("planId");

-- CreateIndex
CREATE INDEX "Vehicle_carrierId_idx" ON "Vehicle"("carrierId");

-- CreateIndex
CREATE INDEX "Tariff_planId_idx" ON "Tariff"("planId");

-- CreateIndex
CREATE INDEX "Tariff_carrierId_idx" ON "Tariff"("carrierId");

-- CreateIndex
CREATE INDEX "RouteStop_planId_idx" ON "RouteStop"("planId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HSE_Check" ADD CONSTRAINT "HSE_Check_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HSE_Check" ADD CONSTRAINT "HSE_Check_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPE_Assign" ADD CONSTRAINT "PPE_Assign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPE_Assign" ADD CONSTRAINT "PPE_Assign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiveS_Audit" ADD CONSTRAINT "FiveS_Audit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiveS_Audit" ADD CONSTRAINT "FiveS_Audit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "QuestionnaireTemplate" ADD CONSTRAINT "QuestionnaireTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireTemplate" ADD CONSTRAINT "QuestionnaireTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireVersion" ADD CONSTRAINT "QuestionnaireVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuestionnaireTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyLink" ADD CONSTRAINT "SurveyLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyLink" ADD CONSTRAINT "SurveyLink_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyLink" ADD CONSTRAINT "SurveyLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "Respondent" ADD CONSTRAINT "Respondent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_surveyLinkId_fkey" FOREIGN KEY ("surveyLinkId") REFERENCES "SurveyLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAsset" ADD CONSTRAINT "ProcessAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAsset" ADD CONSTRAINT "ProcessAsset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sop" ADD CONSTRAINT "Sop_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopStep" ADD CONSTRAINT "SopStep_sopId_fkey" FOREIGN KEY ("sopId") REFERENCES "Sop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_sopId_fkey" FOREIGN KEY ("sopId") REFERENCES "Sop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProjectTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POCItem" ADD CONSTRAINT "POCItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Minute" ADD CONSTRAINT "Minute_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Minute" ADD CONSTRAINT "Minute_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_approvalWorkflowId_fkey" FOREIGN KEY ("approvalWorkflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaTimer" ADD CONSTRAINT "SlaTimer_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPI" ADD CONSTRAINT "KPI_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseZone" ADD CONSTRAINT "WarehouseZone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityCalc" ADD CONSTRAINT "CapacityCalc_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTask" ADD CONSTRAINT "InventoryTask_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTask" ADD CONSTRAINT "InventoryTask_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTask" ADD CONSTRAINT "InventoryTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "InventoryTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRecount" ADD CONSTRAINT "InventoryRecount_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "InventoryScan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryVariance" ADD CONSTRAINT "InventoryVariance_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryVariance" ADD CONSTRAINT "InventoryVariance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryVariance" ADD CONSTRAINT "InventoryVariance_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarcodeLabel" ADD CONSTRAINT "BarcodeLabel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarcodeLabel" ADD CONSTRAINT "BarcodeLabel_installedById_fkey" FOREIGN KEY ("installedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarcodeLabel" ADD CONSTRAINT "BarcodeLabel_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarcodeLabel" ADD CONSTRAINT "BarcodeLabel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuDupCandidate" ADD CONSTRAINT "SkuDupCandidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuDupCandidate" ADD CONSTRAINT "SkuDupCandidate_skuAId_fkey" FOREIGN KEY ("skuAId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuDupCandidate" ADD CONSTRAINT "SkuDupCandidate_skuBId_fkey" FOREIGN KEY ("skuBId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrier" ADD CONSTRAINT "Carrier_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

