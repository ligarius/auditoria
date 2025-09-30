-- Actualiza el enum de estados de proyecto a valores en español en minúsculas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectWorkflowState') THEN
    CREATE TYPE "ProjectWorkflowState" AS ENUM ('planificacion','recoleccion_datos','analisis','recomendaciones','cierre');
  END IF;
END $$;

ALTER TABLE "Project"
  ALTER COLUMN "status" TYPE text USING "status"::text;

UPDATE "Project"
SET "status" = CASE
  WHEN "status" IN ('PLANIFICACION', 'planificacion') THEN 'planificacion'
  WHEN "status" IN ('TRABAJO_CAMPO', 'FIELDWORK', 'recoleccion_datos') THEN 'recoleccion_datos'
  WHEN "status" IN ('INFORME', 'REPORT', 'analisis') THEN 'analisis'
  WHEN "status" IN ('RECOMENDACIONES', 'RECOMMENDATIONS') THEN 'recomendaciones'
  WHEN "status" IN ('CIERRE', 'CLOSE', 'closing', 'cierre') THEN 'cierre'
  ELSE 'planificacion'
END;

ALTER TABLE "Project"
  ALTER COLUMN "status" TYPE "ProjectWorkflowState"
  USING "status"::"ProjectWorkflowState";

ALTER TABLE "Project"
  ALTER COLUMN "status" SET DEFAULT 'planificacion';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoProyecto') THEN
    DROP TYPE "EstadoProyecto";
  END IF;
END $$;
