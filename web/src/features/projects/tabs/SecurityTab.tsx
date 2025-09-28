import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface SecurityItem {
  id: string;
  systemName: string;
  userLifecycle?: string | null;
  rbac?: string | null;
  mfa?: boolean | null;
  auditLogs?: boolean | null;
  backupsRPO?: string | null;
  backupsRTO?: string | null;
  tlsInTransit?: boolean | null;
  encryptionAtRest?: boolean | null;
  openVulns?: string | null;
  compliance?: string | null;
  notes?: string | null;
}

interface PerformanceItem {
  id: string;
  systemName: string;
  peakUsers?: number | null;
  latencyMs?: number | null;
  availabilityPct?: number | null;
  incidents90d?: number | null;
  topRootCause?: string | null;
  capacityInfo?: string | null;
  scalability?: number | null;
  notes?: string | null;
}

interface CostItem {
  id: string;
  systemName: string;
  model: string;
  usersLicenses?: number | null;
  costAnnual?: number | null;
  implUSD?: number | null;
  infraUSD?: number | null;
  supportUSD?: number | null;
  otherUSD?: number | null;
  tco3y?: number | null;
}

interface SecurityTabProps {
  projectId: string;
}

const defaultSecurityForm = {
  systemName: '',
  userLifecycle: '',
  rbac: '',
  mfa: 'true',
  auditLogs: 'true',
  backupsRPO: '',
  backupsRTO: '',
  tlsInTransit: 'true',
  encryptionAtRest: 'true',
  openVulns: '',
  compliance: '',
  notes: '',
};

const defaultPerformanceForm = {
  systemName: '',
  peakUsers: '',
  latencyMs: '',
  availabilityPct: '',
  incidents90d: '',
  topRootCause: '',
  capacityInfo: '',
  scalability: '',
  notes: '',
};

const defaultCostForm = {
  systemName: '',
  model: '',
  usersLicenses: '',
  costAnnual: '',
  implUSD: '',
  infraUSD: '',
  supportUSD: '',
  otherUSD: '',
};

export default function SecurityTab({ projectId }: SecurityTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';

  const [securityItems, setSecurityItems] = useState<SecurityItem[]>([]);
  const [securityForm, setSecurityForm] = useState(defaultSecurityForm);
  const [editingSecurity, setEditingSecurity] = useState<SecurityItem | null>(null);

  const [performanceItems, setPerformanceItems] = useState<PerformanceItem[]>([]);
  const [performanceForm, setPerformanceForm] = useState(defaultPerformanceForm);
  const [editingPerformance, setEditingPerformance] = useState<PerformanceItem | null>(null);

  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [costForm, setCostForm] = useState(defaultCostForm);
  const [editingCost, setEditingCost] = useState<CostItem | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadSecurity = useCallback(async () => {
    try {
      const response = await api.get<SecurityItem[]>(
        `/systems/security/${projectId}`
      );
      setSecurityItems(response.data ?? []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo cargar la postura de seguridad'));
    }
  }, [projectId]);

  const loadPerformance = useCallback(async () => {
    try {
      const response = await api.get<PerformanceItem[]>(
        `/systems/performance/${projectId}`
      );
      setPerformanceItems(response.data ?? []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo cargar el rendimiento de sistemas'));
    }
  }, [projectId]);

  const loadCosts = useCallback(async () => {
    try {
      const response = await api.get<CostItem[]>(`/systems/costs/${projectId}`);
      setCostItems(response.data ?? []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudieron cargar los costos'));
    }
  }, [projectId]);

  useEffect(() => {
    void loadSecurity();
    void loadPerformance();
    void loadCosts();
  }, [loadSecurity, loadPerformance, loadCosts]);

  const handleCreateSecurity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/systems/security/${projectId}`, {
        systemName: securityForm.systemName,
        userLifecycle: securityForm.userLifecycle || undefined,
        rbac: securityForm.rbac || undefined,
        mfa: securityForm.mfa === 'true',
        auditLogs: securityForm.auditLogs === 'true',
        backupsRPO: securityForm.backupsRPO || undefined,
        backupsRTO: securityForm.backupsRTO || undefined,
        tlsInTransit: securityForm.tlsInTransit === 'true',
        encryptionAtRest: securityForm.encryptionAtRest === 'true',
        openVulns: securityForm.openVulns || undefined,
        compliance: securityForm.compliance || undefined,
        notes: securityForm.notes || undefined,
      });
      setSecurityForm(defaultSecurityForm);
      await loadSecurity();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo registrar la postura de seguridad'));
    }
  };

  const handleUpdateSecurity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSecurity) return;
    try {
      await api.put(`/systems/security/${projectId}/${editingSecurity.id}`, {
        systemName: editingSecurity.systemName,
        userLifecycle: editingSecurity.userLifecycle || undefined,
        rbac: editingSecurity.rbac || undefined,
        mfa: editingSecurity.mfa ?? undefined,
        auditLogs: editingSecurity.auditLogs ?? undefined,
        backupsRPO: editingSecurity.backupsRPO || undefined,
        backupsRTO: editingSecurity.backupsRTO || undefined,
        tlsInTransit: editingSecurity.tlsInTransit ?? undefined,
        encryptionAtRest: editingSecurity.encryptionAtRest ?? undefined,
        openVulns: editingSecurity.openVulns || undefined,
        compliance: editingSecurity.compliance || undefined,
        notes: editingSecurity.notes || undefined,
      });
      setEditingSecurity(null);
      await loadSecurity();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la postura de seguridad'));
    }
  };

  const handleCreatePerformance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/systems/performance/${projectId}`, {
        systemName: performanceForm.systemName,
        peakUsers: performanceForm.peakUsers ? Number(performanceForm.peakUsers) : undefined,
        latencyMs: performanceForm.latencyMs ? Number(performanceForm.latencyMs) : undefined,
        availabilityPct: performanceForm.availabilityPct
          ? Number(performanceForm.availabilityPct)
          : undefined,
        incidents90d: performanceForm.incidents90d
          ? Number(performanceForm.incidents90d)
          : undefined,
        topRootCause: performanceForm.topRootCause || undefined,
        capacityInfo: performanceForm.capacityInfo || undefined,
        scalability: performanceForm.scalability ? Number(performanceForm.scalability) : undefined,
        notes: performanceForm.notes || undefined,
      });
      setPerformanceForm(defaultPerformanceForm);
      await loadPerformance();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo registrar el desempeño del sistema'));
    }
  };

  const handleUpdatePerformance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPerformance) return;
    try {
      await api.put(`/systems/performance/${projectId}/${editingPerformance.id}`, {
        systemName: editingPerformance.systemName,
        peakUsers: editingPerformance.peakUsers ?? undefined,
        latencyMs: editingPerformance.latencyMs ?? undefined,
        availabilityPct: editingPerformance.availabilityPct ?? undefined,
        incidents90d: editingPerformance.incidents90d ?? undefined,
        topRootCause: editingPerformance.topRootCause || undefined,
        capacityInfo: editingPerformance.capacityInfo || undefined,
        scalability: editingPerformance.scalability ?? undefined,
        notes: editingPerformance.notes || undefined,
      });
      setEditingPerformance(null);
      await loadPerformance();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar el desempeño del sistema'));
    }
  };

  const handleCreateCost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/systems/costs/${projectId}`, {
        systemName: costForm.systemName,
        model: costForm.model,
        usersLicenses: costForm.usersLicenses ? Number(costForm.usersLicenses) : undefined,
        costAnnual: costForm.costAnnual ? Number(costForm.costAnnual) : undefined,
        implUSD: costForm.implUSD ? Number(costForm.implUSD) : undefined,
        infraUSD: costForm.infraUSD ? Number(costForm.infraUSD) : undefined,
        supportUSD: costForm.supportUSD ? Number(costForm.supportUSD) : undefined,
        otherUSD: costForm.otherUSD ? Number(costForm.otherUSD) : undefined,
      });
      setCostForm(defaultCostForm);
      await loadCosts();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo registrar el costo'));
    }
  };

  const handleUpdateCost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCost) return;
    try {
      await api.put(`/systems/costs/${projectId}/${editingCost.id}`, {
        systemName: editingCost.systemName,
        model: editingCost.model,
        usersLicenses: editingCost.usersLicenses ?? undefined,
        costAnnual: editingCost.costAnnual ?? undefined,
        implUSD: editingCost.implUSD ?? undefined,
        infraUSD: editingCost.infraUSD ?? undefined,
        supportUSD: editingCost.supportUSD ?? undefined,
        otherUSD: editingCost.otherUSD ?? undefined,
      });
      setEditingCost(null);
      await loadCosts();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar el costo'));
    }
  };

  const removeSecurity = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/systems/security/${projectId}/${id}`);
      await loadSecurity();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar el registro de seguridad'));
    }
  };

  const removePerformance = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/systems/performance/${projectId}/${id}`);
      await loadPerformance();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar el registro de desempeño'));
    }
  };

  const removeCost = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/systems/costs/${projectId}/${id}`);
      await loadCosts();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar el registro de costos'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Seguridad</h2>
        <p className="text-sm text-slate-500">
          Monitorea controles, desempeño y costos asociados a los sistemas auditados.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Postura de seguridad</h3>
          <p className="text-sm text-slate-500">
            Evalúa la madurez de controles y vulnerabilidades abiertas por sistema.
          </p>
        </header>
        {canEdit && !editingSecurity && (
          <form
            onSubmit={handleCreateSecurity}
            className="grid gap-3 rounded-lg border border-slate-200 p-4"
          >
            <h4 className="text-base font-medium text-slate-800">Nuevo registro</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.systemName}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      systemName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Ciclo de vida de usuarios
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.userLifecycle}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      userLifecycle: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Modelo RBAC
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.rbac}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      rbac: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                MFA habilitado
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.mfa}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      mfa: event.target.value,
                    }))
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Auditoría habilitada
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.auditLogs}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      auditLogs: event.target.value,
                    }))
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                RPO backups
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.backupsRPO}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      backupsRPO: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                RTO backups
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.backupsRTO}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      backupsRTO: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                TLS en tránsito
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.tlsInTransit}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      tlsInTransit: event.target.value,
                    }))
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Cifrado en reposo
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.encryptionAtRest}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      encryptionAtRest: event.target.value,
                    }))
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Vulnerabilidades abiertas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.openVulns}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      openVulns: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Cumplimiento y notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={securityForm.compliance}
                  onChange={(event) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      compliance: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Registrar postura
              </button>
            </div>
          </form>
        )}

        {editingSecurity && canEdit && (
          <form
            onSubmit={handleUpdateSecurity}
            className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-slate-800">Editar registro</h4>
              <button
                type="button"
                className="text-sm text-blue-700 underline"
                onClick={() => setEditingSecurity(null)}
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.systemName}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, systemName: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Ciclo de vida de usuarios
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.userLifecycle ?? ''}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, userLifecycle: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Modelo RBAC
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.rbac ?? ''}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, rbac: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                MFA habilitado
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.mfa ? 'true' : 'false'}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, mfa: event.target.value === 'true' } : prev
                    )
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Auditoría habilitada
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.auditLogs ? 'true' : 'false'}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, auditLogs: event.target.value === 'true' } : prev
                    )
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                RPO backups
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.backupsRPO ?? ''}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, backupsRPO: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                RTO backups
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.backupsRTO ?? ''}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, backupsRTO: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                TLS en tránsito
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.tlsInTransit ? 'true' : 'false'}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, tlsInTransit: event.target.value === 'true' } : prev
                    )
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Cifrado en reposo
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.encryptionAtRest ? 'true' : 'false'}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev
                        ? { ...prev, encryptionAtRest: event.target.value === 'true' }
                        : prev
                    )
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Vulnerabilidades abiertas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.openVulns ?? ''}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, openVulns: event.target.value } : prev
                    )
                  }
                  rows={2}
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Cumplimiento y notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={editingSecurity.compliance ?? ''}
                  onChange={(event) =>
                    setEditingSecurity((prev) =>
                      prev ? { ...prev, compliance: event.target.value } : prev
                    )
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Actualizar postura
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {securityItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{item.systemName}</p>
                <p className="text-xs text-slate-500">
                  MFA: {item.mfa ? 'Sí' : 'No'} · Logs: {item.auditLogs ? 'Sí' : 'No'} · TLS: {item.tlsInTransit ? 'Sí' : 'No'}
                </p>
                {item.openVulns && (
                  <p className="text-xs text-red-500">Vulnerabilidades: {item.openVulns}</p>
                )}
                {item.notes && (
                  <p className="text-xs text-slate-500">{item.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => setEditingSecurity(item)}
                  >
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    onClick={() => removeSecurity(item.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          {securityItems.length === 0 && (
            <p className="text-sm text-slate-500">No hay registros de seguridad.</p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Performance de sistemas</h3>
          <p className="text-sm text-slate-500">
            Registra métricas operacionales, incidentes y escalabilidad.
          </p>
        </header>
        {canEdit && !editingPerformance && (
          <form
            onSubmit={handleCreatePerformance}
            className="grid gap-3 rounded-lg border border-slate-200 p-4"
          >
            <h4 className="text-base font-medium text-slate-800">Nuevo registro</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.systemName}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      systemName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Usuarios pico
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.peakUsers}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      peakUsers: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Latencia (ms)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.latencyMs}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      latencyMs: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Disponibilidad (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.availabilityPct}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      availabilityPct: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Incidentes 90 días
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.incidents90d}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      incidents90d: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Principal causa raíz
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.topRootCause}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      topRootCause: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Información de capacidad
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.capacityInfo}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      capacityInfo: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Escalabilidad (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.scalability}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      scalability: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={performanceForm.notes}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Registrar rendimiento
              </button>
            </div>
          </form>
        )}

        {editingPerformance && canEdit && (
          <form
            onSubmit={handleUpdatePerformance}
            className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-slate-800">Editar registro</h4>
              <button
                type="button"
                className="text-sm text-blue-700 underline"
                onClick={() => setEditingPerformance(null)}
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.systemName}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev ? { ...prev, systemName: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Usuarios pico
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.peakUsers ?? ''}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev ? { ...prev, peakUsers: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Latencia (ms)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.latencyMs ?? ''}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev ? { ...prev, latencyMs: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Disponibilidad (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.availabilityPct ?? ''}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev
                        ? { ...prev, availabilityPct: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Incidentes 90 días
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.incidents90d ?? ''}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev ? { ...prev, incidents90d: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Principal causa raíz
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.topRootCause ?? ''}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev ? { ...prev, topRootCause: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Información de capacidad
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.capacityInfo ?? ''}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev ? { ...prev, capacityInfo: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Escalabilidad (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.scalability ?? ''}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev ? { ...prev, scalability: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={editingPerformance.notes ?? ''}
                  onChange={(event) =>
                    setEditingPerformance((prev) =>
                      prev ? { ...prev, notes: event.target.value } : prev
                    )
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Actualizar rendimiento
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {performanceItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{item.systemName}</p>
                <p className="text-xs text-slate-500">
                  Disponibilidad: {item.availabilityPct ?? 'N/D'}% · Incidentes: {item.incidents90d ?? 'N/D'}
                </p>
                {item.topRootCause && (
                  <p className="text-xs text-slate-500">Causa raíz: {item.topRootCause}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => setEditingPerformance(item)}
                  >
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    onClick={() => removePerformance(item.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          {performanceItems.length === 0 && (
            <p className="text-sm text-slate-500">No hay registros de performance.</p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Costos y licenciamiento</h3>
          <p className="text-sm text-slate-500">
            Controla el modelo de licenciamiento y el costo total de propiedad estimado.
          </p>
        </header>
        {canEdit && !editingCost && (
          <form
            onSubmit={handleCreateCost}
            className="grid gap-3 rounded-lg border border-slate-200 p-4"
          >
            <h4 className="text-base font-medium text-slate-800">Nuevo registro</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={costForm.systemName}
                  onChange={(event) =>
                    setCostForm((prev) => ({
                      ...prev,
                      systemName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Modelo de licenciamiento
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={costForm.model}
                  onChange={(event) =>
                    setCostForm((prev) => ({
                      ...prev,
                      model: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Usuarios / licencias
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={costForm.usersLicenses}
                  onChange={(event) =>
                    setCostForm((prev) => ({
                      ...prev,
                      usersLicenses: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Costo anual (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={costForm.costAnnual}
                  onChange={(event) =>
                    setCostForm((prev) => ({
                      ...prev,
                      costAnnual: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Implementación (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={costForm.implUSD}
                  onChange={(event) =>
                    setCostForm((prev) => ({
                      ...prev,
                      implUSD: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Infraestructura (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={costForm.infraUSD}
                  onChange={(event) =>
                    setCostForm((prev) => ({
                      ...prev,
                      infraUSD: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Soporte (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={costForm.supportUSD}
                  onChange={(event) =>
                    setCostForm((prev) => ({
                      ...prev,
                      supportUSD: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Otros costos (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={costForm.otherUSD}
                  onChange={(event) =>
                    setCostForm((prev) => ({
                      ...prev,
                      otherUSD: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Registrar costo
              </button>
            </div>
          </form>
        )}

        {editingCost && canEdit && (
          <form
            onSubmit={handleUpdateCost}
            className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-slate-800">Editar registro</h4>
              <button
                type="button"
                className="text-sm text-blue-700 underline"
                onClick={() => setEditingCost(null)}
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCost.systemName}
                  onChange={(event) =>
                    setEditingCost((prev) =>
                      prev ? { ...prev, systemName: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Modelo de licenciamiento
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCost.model}
                  onChange={(event) =>
                    setEditingCost((prev) =>
                      prev ? { ...prev, model: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Usuarios / licencias
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCost.usersLicenses ?? ''}
                  onChange={(event) =>
                    setEditingCost((prev) =>
                      prev ? { ...prev, usersLicenses: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Costo anual (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCost.costAnnual ?? ''}
                  onChange={(event) =>
                    setEditingCost((prev) =>
                      prev ? { ...prev, costAnnual: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Implementación (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCost.implUSD ?? ''}
                  onChange={(event) =>
                    setEditingCost((prev) =>
                      prev ? { ...prev, implUSD: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Infraestructura (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCost.infraUSD ?? ''}
                  onChange={(event) =>
                    setEditingCost((prev) =>
                      prev ? { ...prev, infraUSD: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Soporte (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCost.supportUSD ?? ''}
                  onChange={(event) =>
                    setEditingCost((prev) =>
                      prev ? { ...prev, supportUSD: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Otros costos (USD)
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCost.otherUSD ?? ''}
                  onChange={(event) =>
                    setEditingCost((prev) =>
                      prev ? { ...prev, otherUSD: Number(event.target.value) } : prev
                    )
                  }
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Actualizar costo
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {costItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{item.systemName}</p>
                <p className="text-xs text-slate-500">
                  Modelo: {item.model} · Usuarios: {item.usersLicenses ?? 'N/D'} · TCO 3y: ${item.tco3y?.toLocaleString('es-CL') ?? 'N/D'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => setEditingCost(item)}
                  >
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    onClick={() => removeCost(item.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          {costItems.length === 0 && (
            <p className="text-sm text-slate-500">No hay registros de costos.</p>
          )}
        </div>
      </section>
    </div>
  );
}
