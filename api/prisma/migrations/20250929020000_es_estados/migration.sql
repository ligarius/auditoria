DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoProyecto') THEN
        CREATE TYPE "EstadoProyecto" AS ENUM ('PLANIFICACION','TRABAJO_CAMPO','INFORME','CIERRE');
    END IF;
END$$;

ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Project"
  ALTER COLUMN "status" TYPE "EstadoProyecto"
  USING CASE
    WHEN "status"::text IN ('PLANNING')         THEN 'PLANIFICACION'::"EstadoProyecto"
    WHEN "status"::text IN ('FIELDWORK')        THEN 'TRABAJO_CAMPO'::"EstadoProyecto"
    WHEN "status"::text IN ('REPORT')           THEN 'INFORME'::"EstadoProyecto"
    WHEN "status"::text IN ('CLOSE','CIERRE')   THEN 'CIERRE'::"EstadoProyecto"
    ELSE 'PLANIFICACION'::"EstadoProyecto"
  END;

ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANIFICACION'::"EstadoProyecto";
