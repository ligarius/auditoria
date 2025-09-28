import dayjs from 'dayjs';
import type { Prisma } from '@prisma/client';
import { fetch } from 'undici';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';

interface SupersetGuestTokenInput {
  companyId: string;
  projectId: string;
  dashboardId: string;
  datasetIds?: (string | number)[];
}

interface SupersetGuestTokenResult {
  token: string;
  embedUrl: string;
  expiresAt?: string;
}

interface AnalyticsKpisInput {
  companyId: string;
  projectId: string;
}

interface AnalyticsKpisResult {
  progress: { day: string; pct: number }[];
  findingsBySeverity: { severity: string; qty: number }[];
  pbcAging: { bucket: string; label: string; count: number }[];
}

const supersetCache: { token?: string; expiresAt?: number } = {};

const sanitizeRlsValue = (value: string): string => value.replace(/'/g, "''");

export const buildRlsClause = (companyId: string, projectId: string): string => {
  const safeCompany = sanitizeRlsValue(companyId);
  const safeProject = sanitizeRlsValue(projectId);
  return `company_id = '${safeCompany}' AND project_id = '${safeProject}'`;
};

const normalizeStatus = (status: string | null | undefined) =>
  (status ?? '').trim().toLowerCase();

export const bucketizePbcItems = (
  items: Array<{ dueDate: Date | null; status: string | null }>,
  referenceDate: Date = new Date()
): { bucket: string; label: string; count: number }[] => {
  const now = dayjs(referenceDate);
  const buckets: Record<string, { label: string; count: number }> = {
    on_time: { label: 'Al día', count: 0 },
    overdue_0_3: { label: '1-3 días atraso', count: 0 },
    overdue_4_7: { label: '4-7 días atraso', count: 0 },
    overdue_8_plus: { label: '8+ días atraso', count: 0 },
    no_due_date: { label: 'Sin fecha', count: 0 }
  };

  items.forEach((item) => {
    const status = normalizeStatus(item.status);
    const isCompleted =
      status.includes('complete') || status.includes('cerrad') || status.includes('done');

    if (isCompleted) {
      return;
    }

    if (!item.dueDate) {
      buckets.no_due_date.count += 1;
      return;
    }

    const diff = now.diff(dayjs(item.dueDate), 'day');
    if (diff <= 0) {
      buckets.on_time.count += 1;
    } else if (diff <= 3) {
      buckets.overdue_0_3.count += 1;
    } else if (diff <= 7) {
      buckets.overdue_4_7.count += 1;
    } else {
      buckets.overdue_8_plus.count += 1;
    }
  });

  return Object.entries(buckets).map(([bucket, value]) => ({
    bucket,
    label: value.label,
    count: value.count
  }));
};

const ensureProjectScope = async (companyId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, companyId: true }
  });
  if (!project || project.companyId !== companyId) {
    throw new HttpError(404, 'Proyecto no encontrado para la compañía');
  }
};

const getSupersetAccessToken = async () => {
  const baseUrl = process.env.SUPERSET_BASE_URL;
  const username = process.env.SUPERSET_USERNAME;
  const password = process.env.SUPERSET_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new HttpError(500, 'Superset no configurado');
  }

  if (supersetCache.token && supersetCache.expiresAt && supersetCache.expiresAt > Date.now()) {
    return supersetCache.token;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/security/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, provider: 'db', refresh: true })
  });

  if (!response.ok) {
    throw new HttpError(response.status, 'No se pudo autenticar con Superset');
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new HttpError(502, 'Respuesta inválida de Superset');
  }

  const expiresIn = payload.expires_in ?? 300;
  supersetCache.token = payload.access_token;
  supersetCache.expiresAt = Date.now() + (expiresIn - 30) * 1000;

  return supersetCache.token;
};

const requestSupersetGuestToken = async (
  input: SupersetGuestTokenInput
): Promise<SupersetGuestTokenResult> => {
  await ensureProjectScope(input.companyId, input.projectId);

  const baseUrl = process.env.SUPERSET_BASE_URL;
  if (!baseUrl) {
    throw new HttpError(500, 'Superset no configurado');
  }

  const accessToken = await getSupersetAccessToken();
  const clause = buildRlsClause(input.companyId, input.projectId);
  const datasetIds = (input.datasetIds ?? []).map((value) => Number(value)).filter((value) => !Number.isNaN(value));

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/security/guest_token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      resources: [{ type: 'dashboard', id: input.dashboardId }],
      user: {
        username: process.env.SUPERSET_GUEST_USERNAME ?? 'auditoria-guest',
        first_name: 'Auditoria',
        last_name: 'Viewer'
      },
      rls: datasetIds.map((datasetId) => ({ dataset: datasetId, clause }))
    })
  });

  if (!response.ok) {
    throw new HttpError(response.status, 'No se pudo generar guest token de Superset');
  }

  const payload = (await response.json()) as { token?: string; exp?: number };
  if (!payload.token) {
    throw new HttpError(502, 'Superset no retornó token válido');
  }

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/superset/dashboard/${input.dashboardId}/`);
  url.searchParams.set('standalone', '3');
  url.searchParams.set('guest_token', payload.token);
  url.searchParams.set('companyId', input.companyId);
  url.searchParams.set('projectId', input.projectId);

  return {
    token: payload.token,
    embedUrl: url.toString(),
    expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined
  };
};

const getKpis = async (input: AnalyticsKpisInput): Promise<AnalyticsKpisResult> => {
  await ensureProjectScope(input.companyId, input.projectId);

  const [progressRows, severityRows, pbcItems] = await Promise.all([
    prisma.$queryRaw<Array<{ day: Date; projectId: string; pct: Prisma.Decimal }>>`
      SELECT day, "projectId", pct FROM analytics.progress_daily WHERE "projectId" = ${input.projectId} ORDER BY day
    `,
    prisma.$queryRaw<Array<{ severity: string; projectId: string; qty: bigint }>>`
      SELECT severity, "projectId", qty FROM analytics.findings_by_severity WHERE "projectId" = ${input.projectId}
    `,
    prisma.dataRequestItem.findMany({
      where: { projectId: input.projectId },
      select: { dueDate: true, status: true }
    })
  ]);

  return {
    progress: progressRows.map((row) => ({
      day: row.day.toISOString(),
      pct: Number(row.pct)
    })),
    findingsBySeverity: severityRows.map((row) => ({
      severity: row.severity,
      qty: Number(row.qty)
    })),
    pbcAging: bucketizePbcItems(pbcItems.map((item) => ({ dueDate: item.dueDate, status: item.status })))
  };
};

export const analyticsService = {
  requestSupersetGuestToken,
  getKpis
};

export type { AnalyticsKpisResult, SupersetGuestTokenResult };
