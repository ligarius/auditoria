-- Asegura que exista el enum destino
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectWorkflowState') THEN
        CREATE TYPE "ProjectWorkflowState" AS ENUM ('PLANNING','FIELDWORK','REPORT','CLOSE');
    END IF;
END$$;

-- 1) Quitar DEFAULT antes del cambio de tipo
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;

-- 2) Cambiar tipo desde el valor actual (posiblemente enum "EstadoProyecto" o texto) al nuevo enum en inglés
ALTER TABLE "Project"
  ALTER COLUMN "status" TYPE "ProjectWorkflowState"
  USING CASE
    WHEN "status"::text IN ('PLANIFICACION','PLANNING') THEN 'PLANNING'::"ProjectWorkflowState"
    WHEN "status"::text IN ('TRABAJO_CAMPO','FIELDWORK') THEN 'FIELDWORK'::"ProjectWorkflowState"
    WHEN "status"::text IN ('INFORME','REPORT') THEN 'REPORT'::"ProjectWorkflowState"
    WHEN "status"::text IN ('CIERRE','CLOSE') THEN 'CLOSE'::"ProjectWorkflowState"
    ELSE 'PLANNING'::"ProjectWorkflowState"
  END;

-- 3) Volver a establecer DEFAULT ya con el tipo nuevo
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING'::"ProjectWorkflowState";
