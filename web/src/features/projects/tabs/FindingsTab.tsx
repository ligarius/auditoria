import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface ActionItem {
  id: string;
  findingId: string;
  title: string;
  description?: string | null;
  owner?: string | null;
  dueDate?: string | null;
  category: 'quick_win' | 'capex' | 'opex';
  status: 'todo' | 'in_progress' | 'done';
}

interface Finding {
  id: string;
  title: string;
  impact: string;
  recommendation: string;
  severity: string;
  area?: string | null;
  costEstimate?: number | null;
  isQuickWin: boolean;
  effortDays?: number | null;
  responsibleR: string;
  accountableA: string;
  targetDate?: string | null;
  evidence?: string | null;
  status: string;
  actionItems: ActionItem[];
}

interface FindingsTabProps {
  projectId: string;
}

const emptyFindingForm = {
  title: '',
  impact: '',
  recommendation: '',
  severity: 'media',
  area: '',
  costEstimate: '',
  isQuickWin: true,
  effortDays: '',
  responsibleR: '',
  accountableA: '',
  targetDate: '',
  evidence: '',
  status: 'open',
};

const emptyActionForm = {
  title: '',
  description: '',
  owner: '',
  dueDate: '',
  category: 'quick_win' as ActionItem['category'],
  status: 'todo' as ActionItem['status'],
};

const statusOptions = [
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'closed', label: 'Cerrado' },
];

const actionStatusOptions: { value: ActionItem['status']; label: string }[] = [
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Completado' },
];

const actionCategoryOptions: {
  value: ActionItem['category'];
  label: string;
}[] = [
  { value: 'quick_win', label: 'Quick Win' },
  { value: 'capex', label: 'CAPEX' },
  { value: 'opex', label: 'OPEX' },
];

export default function FindingsTab({ projectId }: FindingsTabProps) {
  const { role } = useAuth();
  const canEdit = ['admin', 'consultor'].includes(role);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [form, setForm] = useState(emptyFindingForm);
  const [actionForms, setActionForms] = useState<
    Record<string, typeof emptyActionForm>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFindings = useCallback(async () => {
    try {
      const response = await api.get<Finding[]>('/findings', {
        params: { projectId },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setFindings(data);
      setActionForms(
        data.reduce<Record<string, typeof emptyActionForm>>((acc, finding) => {
          acc[finding.id] = {
            ...emptyActionForm,
            category: finding.isQuickWin ? 'quick_win' : 'capex',
          };
          return acc;
        }, {})
      );
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los hallazgos'));
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadFindings();
    }
  }, [projectId, loadFindings]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/findings', {
        projectId,
        title: form.title,
        impact: form.impact,
        recommendation: form.recommendation,
        severity: form.severity,
        area: form.area || undefined,
        costEstimate: form.costEstimate ? Number(form.costEstimate) : undefined,
        isQuickWin: form.isQuickWin,
        effortDays: form.effortDays ? Number(form.effortDays) : undefined,
        responsibleR: form.responsibleR,
        accountableA: form.accountableA,
        targetDate: form.targetDate
          ? new Date(form.targetDate).toISOString()
          : undefined,
        evidence: form.evidence || undefined,
        status: form.status,
      });
      setForm(emptyFindingForm);
      await loadFindings();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el hallazgo'));
    } finally {
      setLoading(false);
    }
  };

  const updateFinding = async (id: string, data: Partial<Finding>) => {
    try {
      await api.patch(`/findings/${id}`, data);
      await loadFindings();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el hallazgo'));
    }
  };

  const handleCreateAction = async (finding: Finding) => {
    if (!canEdit) return;
    const formData = actionForms[finding.id] ?? emptyActionForm;
    if (!formData.title.trim()) {
      setError('La acción debe tener un título');
      return;
    }
    try {
      await api.post('/actions', {
        projectId,
        findingId: finding.id,
        title: formData.title,
        description: formData.description || undefined,
        owner: formData.owner || undefined,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : undefined,
        category: finding.isQuickWin ? 'quick_win' : formData.category,
        status: formData.status,
      });
      await loadFindings();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la acción'));
    }
  };

  const updateAction = async (actionId: string, data: Partial<ActionItem>) => {
    try {
      await api.patch(`/actions/${actionId}`, data);
      setFindings((prev) =>
        prev.map((finding) => ({
          ...finding,
          actionItems: finding.actionItems.map((item) =>
            item.id === actionId ? { ...item, ...data } : item
          ),
        }))
      );
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la acción'));
    }
  };

  const quickWins = useMemo(
    () => findings.filter((finding) => finding.isQuickWin),
    [findings]
  );
  const capexOpex = useMemo(
    () => findings.filter((finding) => !finding.isQuickWin),
    [findings]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          Hallazgos y plan de acción
        </h2>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {canEdit && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-lg font-medium text-slate-800">Nuevo hallazgo</h3>
          <label className="flex flex-col text-sm">
            Título
            <input
              className="mt-1 rounded border border-slate-300 px-3 py-2"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              required
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Severidad
              <select
                className="mt-1 rounded border border-slate-300 px-3 py-2"
                value={form.severity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, severity: event.target.value }))
                }
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              Área
              <input
                className="mt-1 rounded border border-slate-300 px-3 py-2"
                value={form.area}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, area: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Estimación de costo (USD)
              <input
                type="number"
                min={0}
                className="mt-1 rounded border border-slate-300 px-3 py-2"
                value={form.costEstimate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    costEstimate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Días de esfuerzo
              <input
                type="number"
                min={0}
                className="mt-1 rounded border border-slate-300 px-3 py-2"
                value={form.effortDays}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    effortDays: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Responsable (R)
              <input
                className="mt-1 rounded border border-slate-300 px-3 py-2"
                value={form.responsibleR}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    responsibleR: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Accountable (A)
              <input
                className="mt-1 rounded border border-slate-300 px-3 py-2"
                value={form.accountableA}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    accountableA: event.target.value,
                  }))
                }
                required
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Fecha objetivo
              <input
                type="date"
                className="mt-1 rounded border border-slate-300 px-3 py-2"
                value={form.targetDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Tipo
              <select
                className="mt-1 rounded border border-slate-300 px-3 py-2"
                value={form.isQuickWin ? 'quick' : 'inversion'}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isQuickWin: event.target.value === 'quick',
                  }))
                }
              >
                <option value="quick">Quick Win</option>
                <option value="inversion">CAPEX / OPEX</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col text-sm">
            Impacto
            <textarea
              className="mt-1 rounded border border-slate-300 px-3 py-2"
              value={form.impact}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, impact: event.target.value }))
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Recomendación
            <textarea
              className="mt-1 rounded border border-slate-300 px-3 py-2"
              value={form.recommendation}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  recommendation: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Evidencia
            <textarea
              className="mt-1 rounded border border-slate-300 px-3 py-2"
              value={form.evidence}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, evidence: event.target.value }))
              }
              rows={2}
            />
          </label>
          <label className="flex flex-col text-sm">
            Estado
            <select
              className="mt-1 rounded border border-slate-300 px-3 py-2"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={loading}
            >
              Crear hallazgo
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Column
          title="Quick Wins"
          description="Hallazgos de implementación rápida"
          findings={quickWins}
          actionForms={actionForms}
          setActionForms={setActionForms}
          onCreateAction={handleCreateAction}
          onUpdateFinding={updateFinding}
          onUpdateAction={updateAction}
          canEdit={canEdit}
          requireCategory={false}
        />
        <Column
          title="CAPEX / OPEX"
          description="Hallazgos que requieren inversión"
          findings={capexOpex}
          actionForms={actionForms}
          setActionForms={setActionForms}
          onCreateAction={handleCreateAction}
          onUpdateFinding={updateFinding}
          onUpdateAction={updateAction}
          canEdit={canEdit}
          requireCategory
        />
      </div>
    </div>
  );
}

interface ColumnProps {
  title: string;
  description: string;
  findings: Finding[];
  actionForms: Record<string, typeof emptyActionForm>;
  setActionForms: Dispatch<
    SetStateAction<Record<string, typeof emptyActionForm>>
  >;
  onCreateAction: (finding: Finding) => void;
  onUpdateFinding: (id: string, data: Partial<Finding>) => void;
  onUpdateAction: (id: string, data: Partial<ActionItem>) => void;
  canEdit: boolean;
  requireCategory: boolean;
}

function Column({
  title,
  description,
  findings,
  actionForms,
  setActionForms,
  onCreateAction,
  onUpdateFinding,
  onUpdateAction,
  canEdit,
  requireCategory,
}: ColumnProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {findings.length === 0 && (
        <p className="text-sm text-slate-500">
          Sin hallazgos en esta categoría.
        </p>
      )}
      {findings.map((finding) => (
        <article
          key={finding.id}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                {finding.title}
              </h4>
              <p className="text-xs uppercase text-slate-500">
                Severidad {finding.severity}
              </p>
            </div>
            {canEdit && (
              <select
                className="rounded border border-slate-300 px-2 py-1 text-xs"
                value={finding.status}
                onChange={(event) =>
                  onUpdateFinding(finding.id, { status: event.target.value })
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </header>

          <div className="grid gap-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-700">Impacto:</span>{' '}
              {finding.impact}
            </p>
            <p>
              <span className="font-medium text-slate-700">Recomendación:</span>{' '}
              {finding.recommendation}
            </p>
            {finding.area && (
              <p>
                <span className="font-medium text-slate-700">Área:</span>{' '}
                {finding.area}
              </p>
            )}
            {(finding.costEstimate ?? 0) > 0 && (
              <p>
                <span className="font-medium text-slate-700">
                  Costo estimado:
                </span>{' '}
                ${finding.costEstimate?.toLocaleString()}
              </p>
            )}
            {finding.targetDate && (
              <p>
                <span className="font-medium text-slate-700">
                  Fecha objetivo:
                </span>{' '}
                {new Date(finding.targetDate).toLocaleDateString()}
              </p>
            )}
            {finding.evidence && (
              <p className="text-xs text-slate-500">
                Evidencia: {finding.evidence}
              </p>
            )}
            <p className="text-xs text-slate-500">
              R: {finding.responsibleR} • A: {finding.accountableA}
            </p>
          </div>

          <section className="space-y-2">
            <h5 className="text-sm font-medium text-slate-800">
              Acciones vinculadas
            </h5>
            {finding.actionItems.length === 0 && (
              <p className="text-xs text-slate-500">
                No hay acciones registradas.
              </p>
            )}
            <ul className="space-y-2">
              {finding.actionItems.map((action) => (
                <li
                  key={action.id}
                  className="rounded border border-slate-200 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">
                        {action.title}
                      </p>
                      {action.owner && (
                        <p className="text-xs text-slate-500">
                          Owner: {action.owner}
                        </p>
                      )}
                      <p className="text-xs uppercase text-slate-500">
                        {
                          actionCategoryOptions.find(
                            (option) => option.value === action.category
                          )?.label
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        value={action.status}
                        onChange={(event) =>
                          onUpdateAction(action.id, {
                            status: event.target.value as ActionItem['status'],
                          })
                        }
                      >
                        {actionStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {action.dueDate && (
                        <span className="text-xs text-slate-500">
                          Vence {new Date(action.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {action.description && (
                    <p className="mt-2 text-xs text-slate-600">
                      {action.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {canEdit && (
            <div className="rounded border border-slate-200 p-3">
              <h6 className="text-sm font-medium text-slate-800">
                Agregar acción
              </h6>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label className="flex flex-col text-xs uppercase tracking-wide text-slate-500">
                  Título
                  <input
                    className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
                    value={actionForms[finding.id]?.title ?? ''}
                    onChange={(event) =>
                      setActionForms((prev) => ({
                        ...prev,
                        [finding.id]: {
                          ...(prev[finding.id] ?? emptyActionForm),
                          title: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col text-xs uppercase tracking-wide text-slate-500">
                  Responsable
                  <input
                    className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
                    value={actionForms[finding.id]?.owner ?? ''}
                    onChange={(event) =>
                      setActionForms((prev) => ({
                        ...prev,
                        [finding.id]: {
                          ...(prev[finding.id] ?? emptyActionForm),
                          owner: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label className="flex flex-col text-xs uppercase tracking-wide text-slate-500">
                  Fecha objetivo
                  <input
                    type="date"
                    className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
                    value={actionForms[finding.id]?.dueDate ?? ''}
                    onChange={(event) =>
                      setActionForms((prev) => ({
                        ...prev,
                        [finding.id]: {
                          ...(prev[finding.id] ?? emptyActionForm),
                          dueDate: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                {requireCategory && (
                  <label className="flex flex-col text-xs uppercase tracking-wide text-slate-500">
                    Categoría
                    <select
                      className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
                      value={actionForms[finding.id]?.category ?? 'capex'}
                      onChange={(event) =>
                        setActionForms((prev) => ({
                          ...prev,
                          [finding.id]: {
                            ...(prev[finding.id] ?? emptyActionForm),
                            category: event.target
                              .value as ActionItem['category'],
                          },
                        }))
                      }
                    >
                      {actionCategoryOptions
                        .filter((option) => option.value !== 'quick_win')
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </div>
              <label className="mt-2 flex flex-col text-xs uppercase tracking-wide text-slate-500">
                Descripción
                <textarea
                  className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
                  value={actionForms[finding.id]?.description ?? ''}
                  onChange={(event) =>
                    setActionForms((prev) => ({
                      ...prev,
                      [finding.id]: {
                        ...(prev[finding.id] ?? emptyActionForm),
                        description: event.target.value,
                      },
                    }))
                  }
                  rows={2}
                />
              </label>
              <div className="mt-3 flex justify-end gap-2">
                <select
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                  value={actionForms[finding.id]?.status ?? 'todo'}
                  onChange={(event) =>
                    setActionForms((prev) => ({
                      ...prev,
                      [finding.id]: {
                        ...(prev[finding.id] ?? emptyActionForm),
                        status: event.target.value as ActionItem['status'],
                      },
                    }))
                  }
                >
                  {actionStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onCreateAction(finding)}
                  className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Agregar acción
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
