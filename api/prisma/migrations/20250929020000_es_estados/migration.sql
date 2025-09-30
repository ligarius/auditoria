-- Crear tipo si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoProyecto') THEN
    CREATE TYPE "EstadoProyecto" AS ENUM ('PLANIFICACION','TRABAJO_CAMPO','INFORME','CIERRE');
  END IF;
END $$;

-- Si la columna "status" existe y NO es del tipo nuevo, convertir desde el enum viejo u otros textos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='Project' AND column_name='status'
  ) THEN
    -- Mapear valores antiguos a los nuevos en español
    ALTER TABLE "Project"
      ALTER COLUMN "status" TYPE "EstadoProyecto"
      USING CASE
        WHEN "status"::text IN ('PLANNING') THEN 'PLANIFICACION'::"EstadoProyecto"
        WHEN "status"::text IN ('FIELDWORK') THEN 'TRABAJO_CAMPO'::"EstadoProyecto"
        WHEN "status"::text IN ('REPORT') THEN 'INFORME'::"EstadoProyecto"
        WHEN "status"::text IN ('CLOSE','CIERRE') THEN 'CIERRE'::"EstadoProyecto"
        ELSE 'PLANIFICACION'::"EstadoProyecto"
      END;

    ALTER TABLE "Project"
      ALTER COLUMN "status" SET DEFAULT 'PLANIFICACION',
      ALTER COLUMN "status" SET NOT NULL;
  ELSE
    ALTER TABLE "Project"
      ADD COLUMN "status" "EstadoProyecto" NOT NULL DEFAULT 'PLANIFICACION';
  END IF;
END $$;

-- Mantener columna workflowDefinition por si faltara
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "workflowDefinition" JSONB;
