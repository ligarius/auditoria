CREATE SCHEMA IF NOT EXISTS analytics;

DO
$$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auditoria_analytics') THEN
    CREATE ROLE auditoria_analytics LOGIN PASSWORD 'change_me';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA analytics TO auditoria_analytics;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO auditoria_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO auditoria_analytics;

DROP MATERIALIZED VIEW IF EXISTS analytics.responses_daily;
CREATE MATERIALIZED VIEW analytics.responses_daily AS
SELECT
  date_trunc('day', "submittedAt")::date AS day,
  "projectId",
  COUNT(*)::bigint AS responses
FROM "QuestionnaireResponse"
GROUP BY 1, 2;

CREATE INDEX responses_daily_project_day_idx ON analytics.responses_daily ("projectId", day);

DROP MATERIALIZED VIEW IF EXISTS analytics.findings_by_severity;
CREATE MATERIALIZED VIEW analytics.findings_by_severity AS
SELECT
  COALESCE("status", 'UNSPECIFIED') AS severity,
  "projectId",
  COUNT(*)::bigint AS qty
FROM "Finding"
GROUP BY 1, 2;

CREATE INDEX findings_by_severity_project_idx ON analytics.findings_by_severity ("projectId");

DROP MATERIALIZED VIEW IF EXISTS analytics.progress_daily;
CREATE MATERIALIZED VIEW analytics.progress_daily AS
SELECT
  date_trunc('day', "updatedAt")::date AS day,
  "projectId",
  AVG(COALESCE("progress", 0))::numeric(10, 2) AS pct
FROM "ProjectTask"
GROUP BY 1, 2;

CREATE INDEX progress_daily_project_day_idx ON analytics.progress_daily ("projectId", day);
