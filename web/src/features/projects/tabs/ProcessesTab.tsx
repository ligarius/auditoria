import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import { getErrorMessage } from '../../../lib/errors';

export const PROCESS_SUBTABS: Record<string, string> = {
  library: 'Procesos',
  reception: 'Recepción',
  storage: 'Almacenamiento',
  picking: 'Picking',
  dispatch: 'Despacho',
};

type ProcessRecord = {
  id: string;
  projectId: string;
  name: string;
  type: 'AS_IS' | 'TO_BE';
  version: number;
  description?: string | null;
  sops?: {
    id: string;
    title: string;
    status: 'draft' | 'published';
    version: number;
  }[];
};

type SopRecord = {
  id: string;
  processId: string;
  title: string;
  version: number;
  status: 'draft' | 'published';
  steps: {
    id?: string;
    order: number;
    text: string;
    kpi?: { metric?: string; target?: string } | null;
  }[];
};

type ChecklistItem = {
  id: string;
  text: string;
  isDone: boolean;
};

type ChecklistRecord = {
  id: string;
  sopId: string;
  status: 'open' | 'in_progress' | 'completed' | 'signed';
  signedAt?: string | null;
  assignee?: { id: string; name: string; email: string } | null;
  signedBy?: { id: string; name: string; email: string } | null;
  items: ChecklistItem[];
};

type ProjectMember = {
  id: string;
  name: string;
  email: string;
};

interface ProjectMembershipResponse {
  memberships?: {
    user?: {
      id: string;
      name?: string | null;
      email: string;
    };
  }[];
}

interface ProcessesTabProps {
  projectId: string;
}

const emptyProcessForm = {
  name: '',
  type: 'TO_BE' as 'AS_IS' | 'TO_BE',
  version: 1,
  description: '',
};

const emptyStep = { text: '', kpiMetric: '', kpiTarget: '' };

const emptySopForm = {
  title: '',
  version: 1,
  status: 'draft' as 'draft' | 'published',
  steps: [emptyStep],
};

const emptyChecklistForm = {
  assigneeId: '',
  status: 'open' as ChecklistRecord['status'],
  items: [''],
};

const statusLabels: Record<ChecklistRecord['status'], string> = {
  open: 'Abierta',
  in_progress: 'En progreso',
  completed: 'Completada',
  signed: 'Firmada',
};

const sopStatusLabels: Record<SopRecord['status'], string> = {
  draft: 'Borrador',
  published: 'Publicado',
};

export default function ProcessesTab({ projectId }: ProcessesTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);

  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(
    null
  );
  const [processForm, setProcessForm] = useState(emptyProcessForm);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);

  const [sops, setSops] = useState<SopRecord[]>([]);
  const [selectedSopId, setSelectedSopId] = useState<string | null>(null);
  const [sopForm, setSopForm] = useState(emptySopForm);
  const [editingSopId, setEditingSopId] = useState<string | null>(null);

  const [checklists, setChecklists] = useState<ChecklistRecord[]>([]);
  const [checklistForm, setChecklistForm] = useState(emptyChecklistForm);

  const [members, setMembers] = useState<ProjectMember[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSuccess(null);
  }, [projectId]);

  const loadProcesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ProcessRecord[]>('/processes', {
        params: { projectId },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setProcesses(data);
      if (data.length > 0) {
        setSelectedProcessId((prev) => prev ?? data[0]?.id ?? null);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los procesos'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadMembers = useCallback(async () => {
    try {
      const response = await api.get<ProjectMembershipResponse>(
        `/projects/${projectId}`
      );
      const memberships = Array.isArray(response.data?.memberships)
        ? response.data.memberships
        : [];
      setMembers(
        memberships
          .filter(
            (
              membership
            ): membership is {
              user: { id: string; name?: string | null; email: string };
            } => Boolean(membership.user?.id)
          )
          .map((membership) => ({
            id: membership.user.id,
            name: membership.user.name ?? membership.user.email ?? 'Sin nombre',
            email: membership.user.email,
          }))
      );
    } catch (err) {
      console.error('No se pudieron cargar los miembros del proyecto', err);
    }
  }, [projectId]);

  const loadChecklists = useCallback(
    async (sopId: string) => {
      try {
        const response = await api.get<ChecklistRecord[]>('/checklists', {
          params: { projectId, sopId },
        });
        setChecklists(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(
          getErrorMessage(err, 'No se pudieron cargar las checklists')
        );
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (projectId) {
      void loadProcesses();
      void loadMembers();
    }
  }, [projectId, loadProcesses, loadMembers]);

  useEffect(() => {
    if (!selectedProcessId) {
      setSops([]);
      setSelectedSopId(null);
      return;
    }
    setError(null);
    api
      .get<SopRecord[]>('/sops', {
        params: { projectId, processId: selectedProcessId },
      })
      .then((response) => {
        const records = Array.isArray(response.data) ? response.data : [];
        setSops(records);
        if (records.length > 0) {
          setSelectedSopId((prev) => prev ?? records[0]?.id ?? null);
        }
      })
      .catch((err) => {
        setError(
          getErrorMessage(err, 'No se pudieron cargar los SOP del proceso')
        );
      });
  }, [projectId, selectedProcessId]);

  useEffect(() => {
    if (!selectedSopId) {
      setChecklists([]);
      return;
    }
    setError(null);
    void loadChecklists(selectedSopId);
  }, [selectedSopId, loadChecklists]);

  const resetProcessForm = () => {
    setProcessForm(emptyProcessForm);
    setEditingProcessId(null);
  };

  const handleProcessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    setError(null);
    try {
      if (editingProcessId) {
        await api.put(`/processes/${editingProcessId}`, {
          name: processForm.name,
          type: processForm.type,
          version: processForm.version,
          description: processForm.description || null,
        });
        setSuccess('Proceso actualizado correctamente');
      } else {
        await api.post('/processes', {
          projectId,
          name: processForm.name,
          type: processForm.type,
          version: processForm.version,
          description: processForm.description || null,
        });
        setSuccess('Proceso creado correctamente');
      }
      await loadProcesses();
      resetProcessForm();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el proceso'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProcess = (processId: string) => {
    setSelectedProcessId(processId);
    setSelectedSopId(null);
    setSopForm(emptySopForm);
    setEditingSopId(null);
  };

  const startEditProcess = (process: ProcessRecord) => {
    setEditingProcessId(process.id);
    setProcessForm({
      name: process.name,
      type: process.type,
      version: process.version,
      description: process.description ?? '',
    });
  };

  const cancelProcessEdit = () => {
    resetProcessForm();
  };

  const addStep = () => {
    setSopForm((prev) => ({ ...prev, steps: [...prev.steps, emptyStep] }));
  };

  const removeStep = (index: number) => {
    setSopForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, idx) => idx !== index),
    }));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSopForm((prev) => {
      const steps = [...prev.steps];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= steps.length) return prev;
      const temp = steps[targetIndex];
      steps[targetIndex] = steps[index];
      steps[index] = temp;
      return { ...prev, steps };
    });
  };

  const startEditSop = (sop: SopRecord) => {
    setEditingSopId(sop.id);
    setSelectedSopId(sop.id);
    setSopForm({
      title: sop.title,
      version: sop.version,
      status: sop.status,
      steps: sop.steps.length
        ? sop.steps.map((step) => ({
            text: step.text,
            kpiMetric: step.kpi?.metric ?? '',
            kpiTarget: step.kpi?.target ?? '',
          }))
        : [emptyStep],
    });
  };

  const resetSopForm = () => {
    setSopForm(emptySopForm);
    setEditingSopId(null);
  };

  const handleSopSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !selectedProcessId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        projectId,
        processId: selectedProcessId,
        title: sopForm.title,
        version: sopForm.version,
        status: sopForm.status,
        steps: sopForm.steps
          .filter((step) => step.text.trim())
          .map((step, index) => ({
            order: index + 1,
            text: step.text,
            kpi:
              step.kpiMetric || step.kpiTarget
                ? { metric: step.kpiMetric, target: step.kpiTarget }
                : null,
          })),
      };

      if (editingSopId) {
        await api.patch(`/sops/${editingSopId}`, payload);
        setSuccess('SOP actualizado correctamente');
      } else {
        await api.post('/sops', payload);
        setSuccess('SOP creado correctamente');
      }
      await api
        .get<
          SopRecord[]
        >('/sops', { params: { projectId, processId: selectedProcessId } })
        .then((response) =>
          setSops(Array.isArray(response.data) ? response.data : [])
        );
      resetSopForm();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el SOP'));
    } finally {
      setLoading(false);
    }
  };

  const publishSop = async (sopId: string) => {
    if (!canEdit) return;
    try {
      await api.post(`/sops/${sopId}/publish`);
      setSuccess('SOP enviado a aprobación');
      await api
        .get<
          SopRecord[]
        >('/sops', { params: { projectId, processId: selectedProcessId } })
        .then((response) =>
          setSops(Array.isArray(response.data) ? response.data : [])
        );
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo publicar el SOP'));
    }
  };

  const resetChecklistForm = () => {
    setChecklistForm(emptyChecklistForm);
  };

  const handleChecklistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !selectedSopId) return;
    const items = checklistForm.items
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
    if (!items.length) {
      setError('La checklist debe tener al menos un punto de verificación');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/checklists', {
        projectId,
        sopId: selectedSopId,
        assigneeId: checklistForm.assigneeId || undefined,
        status: checklistForm.status,
        items,
      });
      setSuccess('Checklist creada correctamente');
      resetChecklistForm();
      await loadChecklists(selectedSopId);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la checklist'));
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistStatus = async (
    checklistId: string,
    status: ChecklistRecord['status']
  ) => {
    if (!canEdit) return;
    try {
      await api.patch(`/checklists/${checklistId}`, { status });
      setChecklists((prev) =>
        prev.map((item) =>
          item.id === checklistId ? { ...item, status } : item
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la checklist'));
    }
  };

  const toggleChecklistItem = async (
    checklistId: string,
    item: ChecklistItem
  ) => {
    if (!canEdit) return;
    const checklist = checklists.find((entry) => entry.id === checklistId);
    if (!checklist) {
      return;
    }
    if (checklist.status === 'signed') {
      setError('No se pueden modificar checklists firmadas');
      return;
    }

    const nextIsDone = !item.isDone;
    const nextItems = checklist.items.map((entry) =>
      entry.id === item.id ? { ...entry, isDone: nextIsDone } : entry
    );
    const allDone = nextItems.length > 0 && nextItems.every((entry) => entry.isDone);
    const anyDone = nextItems.some((entry) => entry.isDone);
    let nextStatus: ChecklistRecord['status'] = checklist.status;
    if (allDone) {
      nextStatus = 'completed';
    } else if (anyDone) {
      nextStatus = 'in_progress';
    } else {
      nextStatus = 'open';
    }

    try {
      await api.patch(`/checklists/${checklistId}/items/${item.id}`, {
        isDone: nextIsDone,
      });
      if (nextStatus !== checklist.status) {
        await api.patch(`/checklists/${checklistId}`, { status: nextStatus });
      }
      setChecklists((prev) =>
        prev.map((entry) =>
          entry.id === checklistId
            ? { ...entry, items: nextItems, status: nextStatus }
            : entry
        )
      );
      setError(null);
    } catch (err) {
      setError(
        getErrorMessage(err, 'No se pudo actualizar el ítem de checklist')
      );
      void loadChecklists(checklist.sopId);
    }
  };

  const signChecklist = async (checklistId: string) => {
    if (!canEdit) return;
    try {
      const response = await api.post<ChecklistRecord>(
        `/checklists/${checklistId}/sign`
      );
      setChecklists((prev) =>
        prev.map((item) => (item.id === checklistId ? response.data : item))
      );
      setSuccess('Checklist firmada correctamente');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo firmar la checklist'));
    }
  };

  const currentProcess = processes.find(
    (process) => process.id === selectedProcessId
  );
  const currentSop = sops.find((sop) => sop.id === selectedSopId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Procesos TO-BE y SOP
        </h2>
        <p className="text-sm text-slate-600">
          Documenta el proceso objetivo, define SOP con pasos reordenables y
          sigue checklists con firma digital.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-medium text-slate-800">Procesos</h3>
            <ul className="mt-3 space-y-2">
              {processes.map((process) => (
                <li key={process.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectProcess(process.id)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                      selectedProcessId === process.id
                        ? 'border-slate-900 bg-slate-900/5 font-semibold'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{process.name}</span>
                      <span className="text-xs uppercase text-slate-500">
                        {process.type}
                      </span>
                    </div>
                    {process.sops && process.sops.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        {process.sops.length} SOP ·{' '}
                        {
                          process.sops.filter(
                            (sop) => sop.status === 'published'
                          ).length
                        }{' '}
                        publicados
                      </p>
                    )}
                  </button>
                  {canEdit && (
                    <div className="mt-1 flex justify-end text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => startEditProcess(process)}
                        className="hover:text-slate-700"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {processes.length === 0 && (
                <li className="text-sm text-slate-500">
                  Aún no hay procesos definidos. Crea uno para comenzar.
                </li>
              )}
            </ul>
          </div>

          {canEdit && (
            <form
              onSubmit={handleProcessSubmit}
              className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-lg font-medium text-slate-800">
                {editingProcessId ? 'Editar proceso' : 'Nuevo proceso'}
              </h3>
              <label className="flex flex-col text-sm">
                Nombre
                <input
                  className="mt-1 rounded border border-slate-300 px-3 py-2"
                  value={processForm.name}
                  onChange={(event) =>
                    setProcessForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Tipo
                <select
                  className="mt-1 rounded border border-slate-300 px-3 py-2"
                  value={processForm.type}
                  onChange={(event) =>
                    setProcessForm((prev) => ({
                      ...prev,
                      type: event.target.value as 'AS_IS' | 'TO_BE',
                    }))
                  }
                >
                  <option value="AS_IS">AS-IS</option>
                  <option value="TO_BE">TO-BE</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Versión
                <input
                  type="number"
                  min={1}
                  className="mt-1 rounded border border-slate-300 px-3 py-2"
                  value={processForm.version}
                  onChange={(event) =>
                    setProcessForm((prev) => ({
                      ...prev,
                      version: Number(event.target.value) || 1,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Descripción
                <textarea
                  className="mt-1 rounded border border-slate-300 px-3 py-2"
                  value={processForm.description}
                  onChange={(event) =>
                    setProcessForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </label>
              <div className="flex justify-end gap-2">
                {editingProcessId && (
                  <button
                    type="button"
                    onClick={cancelProcessEdit}
                    className="rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading}
                >
                  {editingProcessId ? 'Actualizar' : 'Crear proceso'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-6">
          {currentProcess && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {currentProcess.name}
                  </h3>
                  <p className="text-xs uppercase text-slate-500">
                    {currentProcess.type}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  Versión {currentProcess.version}
                </span>
              </div>
              {currentProcess.description && (
                <p className="mt-3 text-sm text-slate-600">
                  {currentProcess.description}
                </p>
              )}
            </div>
          )}

          {currentProcess && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-800">
                  SOP del proceso
                </h3>
                {canEdit && (
                  <button
                    type="button"
                    onClick={resetSopForm}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Nuevo SOP
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {sops.map((sop) => (
                  <button
                    key={sop.id}
                    type="button"
                    onClick={() => setSelectedSopId(sop.id)}
                    className={`rounded border px-3 py-2 text-sm transition ${
                      selectedSopId === sop.id
                        ? 'border-slate-900 bg-slate-900/5 font-semibold'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{sop.title}</span>
                      <span className="text-xs text-slate-500">
                        {sopStatusLabels[sop.status]}
                      </span>
                    </div>
                  </button>
                ))}
                {sops.length === 0 && (
                  <span className="text-sm text-slate-500">
                    Aún no hay SOP registrados.
                  </span>
                )}
              </div>
              {canEdit && (
                <form
                  onSubmit={handleSopSubmit}
                  className="space-y-3 rounded border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-medium text-slate-800">
                      {editingSopId ? 'Editar SOP' : 'Nuevo SOP'}
                    </h4>
                    {editingSopId && (
                      <button
                        type="button"
                        onClick={resetSopForm}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                  <label className="flex flex-col text-sm">
                    Título
                    <input
                      className="mt-1 rounded border border-slate-300 px-3 py-2"
                      value={sopForm.title}
                      onChange={(event) =>
                        setSopForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col text-sm">
                      Versión
                      <input
                        type="number"
                        min={1}
                        className="mt-1 rounded border border-slate-300 px-3 py-2"
                        value={sopForm.version}
                        onChange={(event) =>
                          setSopForm((prev) => ({
                            ...prev,
                            version: Number(event.target.value) || 1,
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col text-sm">
                      Estado
                      <select
                        className="mt-1 rounded border border-slate-300 px-3 py-2"
                        value={sopForm.status}
                        onChange={(event) =>
                          setSopForm((prev) => ({
                            ...prev,
                            status: event.target.value as 'draft' | 'published',
                          }))
                        }
                      >
                        <option value="draft">Borrador</option>
                        <option value="published">Publicado</option>
                      </select>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-700">
                      Pasos del SOP
                    </h5>
                    {sopForm.steps.map((step, index) => (
                      <div
                        key={`step-${index}`}
                        className="rounded border border-slate-200 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex-1 text-sm">
                            Instrucción
                            <textarea
                              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                              value={step.text}
                              onChange={(event) =>
                                setSopForm((prev) => {
                                  const steps = [...prev.steps];
                                  steps[index] = {
                                    ...steps[index],
                                    text: event.target.value,
                                  };
                                  return { ...prev, steps };
                                })
                              }
                              rows={2}
                            />
                          </label>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moveStep(index, -1)}
                              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(index, 1)}
                              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-500">
                            KPI
                            <input
                              className="mt-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                              placeholder="Métrica"
                              value={step.kpiMetric}
                              onChange={(event) =>
                                setSopForm((prev) => {
                                  const steps = [...prev.steps];
                                  steps[index] = {
                                    ...steps[index],
                                    kpiMetric: event.target.value,
                                  };
                                  return { ...prev, steps };
                                })
                              }
                            />
                          </label>
                          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-500">
                            Objetivo
                            <input
                              className="mt-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                              placeholder="Objetivo"
                              value={step.kpiTarget}
                              onChange={(event) =>
                                setSopForm((prev) => {
                                  const steps = [...prev.steps];
                                  steps[index] = {
                                    ...steps[index],
                                    kpiTarget: event.target.value,
                                  };
                                  return { ...prev, steps };
                                })
                              }
                            />
                          </label>
                        </div>
                        {sopForm.steps.length > 1 && (
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeStep(index)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Eliminar paso
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addStep}
                      className="text-sm text-slate-600 hover:text-slate-800"
                    >
                      + Añadir paso
                    </button>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                      disabled={loading}
                    >
                      {editingSopId ? 'Actualizar SOP' : 'Crear SOP'}
                    </button>
                    {editingSopId && (
                      <button
                        type="button"
                        onClick={() => publishSop(editingSopId)}
                        className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        Publicar
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {currentSop && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">
                    Checklist de {currentSop.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Estado: {sopStatusLabels[currentSop.status]} •{' '}
                    {currentSop.steps.length} pasos definidos
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => startEditSop(currentSop)}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Editar SOP
                  </button>
                )}
              </div>

              {checklists.length > 0 ? (
                <div className="space-y-3">
                  {checklists.map((checklist) => (
                    <div
                      key={checklist.id}
                      className="rounded border border-slate-200 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {checklist.assignee
                              ? checklist.assignee.name
                              : 'Sin asignar'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Estado: {statusLabels[checklist.status]}
                          </p>
                          {checklist.signedBy && (
                            <p className="text-xs text-emerald-600">
                              Firmado por {checklist.signedBy.name} el{' '}
                              {checklist.signedAt
                                ? new Date(checklist.signedAt).toLocaleString()
                                : ''}
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <select
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                              value={checklist.status}
                              onChange={(event) =>
                                updateChecklistStatus(
                                  checklist.id,
                                  event.target
                                    .value as ChecklistRecord['status']
                                )
                              }
                            >
                              {Object.entries(statusLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                )
                              )}
                            </select>
                            {checklist.status === 'completed' && (
                              <button
                                type="button"
                                onClick={() => signChecklist(checklist.id)}
                                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
                              >
                                Firmar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        {checklist.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-2">
                            {canEdit ? (
                              <input
                                type="checkbox"
                                checked={item.isDone}
                                onChange={() =>
                                  toggleChecklistItem(checklist.id, item)
                                }
                              />
                            ) : (
                              <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
                            )}
                            <span
                              className={
                                item.isDone ? 'text-slate-500 line-through' : ''
                              }
                            >
                              {item.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Todavía no hay checklists vinculadas al SOP.
                </p>
              )}

              {canEdit && (
                <form
                  onSubmit={handleChecklistSubmit}
                  className="space-y-3 rounded border border-slate-200 p-3"
                >
                  <h4 className="text-base font-medium text-slate-800">
                    Nueva checklist
                  </h4>
                  <label className="flex flex-col text-sm">
                    Asignar a
                    <select
                      className="mt-1 rounded border border-slate-300 px-3 py-2"
                      value={checklistForm.assigneeId}
                      onChange={(event) =>
                        setChecklistForm((prev) => ({
                          ...prev,
                          assigneeId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Sin asignar</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col text-sm">
                    Estado inicial
                    <select
                      className="mt-1 rounded border border-slate-300 px-3 py-2"
                      value={checklistForm.status}
                      onChange={(event) =>
                        setChecklistForm((prev) => ({
                          ...prev,
                          status: event.target
                            .value as ChecklistRecord['status'],
                        }))
                      }
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      Puntos de verificación
                    </p>
                    {checklistForm.items.map((text, index) => (
                      <div key={`item-${index}`} className="flex gap-2">
                        <input
                          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                          value={text}
                          onChange={(event) =>
                            setChecklistForm((prev) => {
                              const items = [...prev.items];
                              items[index] = event.target.value;
                              return { ...prev, items };
                            })
                          }
                          placeholder="Describe la actividad a confirmar"
                        />
                        {checklistForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setChecklistForm((prev) => ({
                                ...prev,
                                items: prev.items.filter(
                                  (_, idx) => idx !== index
                                ),
                              }))
                            }
                            className="rounded bg-red-50 px-2 py-1 text-xs text-red-600"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setChecklistForm((prev) => ({
                          ...prev,
                          items: [...prev.items, ''],
                        }))
                      }
                      className="text-sm text-slate-600 hover:text-slate-800"
                    >
                      + Añadir punto
                    </button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetChecklistForm}
                      className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-600"
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                      disabled={loading}
                    >
                      Crear checklist
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
