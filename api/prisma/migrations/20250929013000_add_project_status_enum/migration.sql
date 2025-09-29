DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectWorkflowState') THEN
    CREATE TYPE "ProjectWorkflowState" AS ENUM ('PLANNING','FIELDWORK','REPORT','CLOSE');
  END IF;
END $$;

-- Si la columna no existe, créala con el enum; si existe como TEXT/VARCHAR, conviértela.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Project' AND column_name = 'status'
  ) THEN
    ALTER TABLE "Project"
      ADD COLUMN "status" "ProjectWorkflowState" NOT NULL DEFAULT 'PLANNING';
  ELSE
    -- convierte texto a enum si fuera necesario
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'Project' AND column_name = 'status' AND udt_name NOT IN ('ProjectWorkflowState')
    ) THEN
      ALTER TABLE "Project"
        ALTER COLUMN "status" TYPE "ProjectWorkflowState"
        USING CASE
          WHEN "status" IN ('PLANNING','FIELDWORK','REPORT','CLOSE') THEN "status"::"ProjectWorkflowState"
          ELSE 'PLANNING'::"ProjectWorkflowState"
        END,
        ALTER COLUMN "status" SET DEFAULT 'PLANNING',
        ALTER COLUMN "status" SET NOT NULL;
    END IF;
  END IF;
END $$;
