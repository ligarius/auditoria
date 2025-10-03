import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import api from '../../../lib/api';
import { downloadModuleReport } from '../../../lib/reports';

type PhotoType = 'before' | 'after';

type ActionStatus = 'todo' | 'in_progress' | 'done';

interface FiveSAuditPhoto {
  type: PhotoType;
  url: string;
  description?: string | null;
}

interface FiveSAuditAction {
  description: string;
  responsible?: string | null;
  dueDate?: string | null;
  status: ActionStatus;
  notes?: string | null;
}

interface FiveSAudit {
  id: string;
  projectId: string;
  area: string;
  score: number;
  auditDate: string;
  notes?: string | null;
  photos?: FiveSAuditPhoto[] | null;
  actions?: FiveSAuditAction[] | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null } | null;
}

interface PhotoFormValue {
  url: string;
  description: string;
}

interface EditableAction {
  description: string;
  responsible: string;
  dueDate: string;
  status: ActionStatus;
  notes: string;
}

interface FiveSTabProps {
  projectId: string;
}

const statusOptions: { value: ActionStatus; label: string }[] = [
  { value: 'todo', label: 'Pendiente' },
  { value: 'in_progress', label: 'En seguimiento' },
  { value: 'done', label: 'Completada' },
];

const defaultPhoto: PhotoFormValue = { url: '', description: '' };
const defaultAction: EditableAction = {
  description: '',
  responsible: '',
  dueDate: '',
  status: 'todo',
  notes: '',
};

const isPhoto = (value: unknown): value is FiveSAuditPhoto => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const type = record.type;
  const url = record.url;
  return (
    (type === 'before' || type === 'after') &&
    typeof url === 'string' &&
    url.trim().length > 0
  );
};

const isAction = (value: unknown): value is FiveSAuditAction => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const description = record.description;
  const status = record.status;
  return (
    typeof description === 'string' &&
    description.trim().length > 0 &&
    (status === 'todo' || status === 'in_progress' || status === 'done')
  );
};

const toDateInputValue = (value: string | undefined | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

const formatDisplayDate = (value: string | undefined | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('es-ES');
};

const formatNumber = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '—';
  return Number(value).toFixed(1);
};

const FiveSTab = ({ projectId }: FiveSTabProps) => {
  const [audits, setAudits] = useState<FiveSAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [area, setArea] = useState('');
  const [score, setScore] = useState('3');
  const [auditDate, setAuditDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [beforePhotos, setBeforePhotos] = useState<PhotoFormValue[]>([
    { ...defaultPhoto },
  ]);
  const [afterPhotos, setAfterPhotos] = useState<PhotoFormValue[]>([
    { ...defaultPhoto },
  ]);
  const [actions, setActions] = useState<EditableAction[]>([
    { ...defaultAction },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [actionDrafts, setActionDrafts] = useState<
    Record<string, EditableAction[]>
  >({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [savingAuditId, setSavingAuditId] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const resetForm = () => {
    setArea('');
    setScore('3');
    setAuditDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setBeforePhotos([{ ...defaultPhoto }]);
    setAfterPhotos([{ ...defaultPhoto }]);
    setActions([{ ...defaultAction }]);
  };

  const mapAudit = (raw: FiveSAudit): FiveSAudit => ({
    ...raw,
    photos: Array.isArray(raw.photos)
      ? raw.photos.filter((item) => isPhoto(item))
      : [],
    actions: Array.isArray(raw.actions)
      ? raw.actions.filter((item) => isAction(item))
      : [],
  });

  const fetchAudits = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<FiveSAudit[]>(
        `/fiveS/audits/${projectId}`
      );
      const raw = Array.isArray(response.data) ? response.data : [];
      setAudits(raw.map(mapAudit));
    } catch (err) {
      console.error('No se pudieron cargar las auditorías 5S', err);
      setError('No se pudieron cargar las auditorías registradas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    setActionDrafts(
      audits.reduce<Record<string, EditableAction[]>>((acc, audit) => {
        acc[audit.id] = (audit.actions ?? []).map((action) => ({
          description: action.description,
          responsible: action.responsible ?? '',
          dueDate: toDateInputValue(action.dueDate),
          status: action.status,
          notes: action.notes ?? '',
        }));
        if (acc[audit.id].length === 0) {
          acc[audit.id] = [{ ...defaultAction }];
        }
        return acc;
      }, {})
    );
    setNoteDrafts(
      audits.reduce<Record<string, string>>((acc, audit) => {
        acc[audit.id] = audit.notes ?? '';
        return acc;
      }, {})
    );
  }, [audits]);

  const combinedPhotos = useMemo(() => {
    const make = (items: PhotoFormValue[], type: PhotoType) =>
      items
        .map((photo) => ({
          type,
          url: photo.url.trim(),
          description: photo.description.trim(),
        }))
        .filter((photo) => photo.url.length > 0)
        .map((photo) => ({
          ...photo,
          description:
            photo.description.length > 0 ? photo.description : undefined,
        }));

    return {
      before: make(beforePhotos, 'before'),
      after: make(afterPhotos, 'after'),
    };
  }, [beforePhotos, afterPhotos]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!area.trim()) {
      setFormError('Debes indicar el área evaluada.');
      return;
    }

    const numericScore = Number(score);
    if (Number.isNaN(numericScore)) {
      setFormError('La puntuación debe ser un número.');
      return;
    }

    const payload = {
      area: area.trim(),
      score: numericScore,
      auditDate,
      notes: notes.trim() ? notes.trim() : undefined,
      photos: [...combinedPhotos.before, ...combinedPhotos.after],
      actions: actions
        .map((action) => ({
          ...action,
          description: action.description.trim(),
          responsible: action.responsible.trim(),
          dueDate: action.dueDate.trim(),
          notes: action.notes.trim(),
        }))
        .filter((action) => action.description.length > 0)
        .map((action) => ({
          description: action.description,
          responsible:
            action.responsible.length > 0 ? action.responsible : undefined,
          dueDate: action.dueDate.length > 0 ? action.dueDate : undefined,
          status: action.status,
          notes: action.notes.length > 0 ? action.notes : undefined,
        })),
    };

    setSubmitting(true);
    try {
      await api.post(`/fiveS/audits/${projectId}`, payload);
      setFormSuccess('Auditoría 5S registrada correctamente.');
      resetForm();
      await fetchAudits();
    } catch (err) {
      console.error('No se pudo registrar la auditoría 5S', err);
      setFormError(
        'No se pudo registrar la auditoría. Revisa los datos e inténtalo nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (
    type: PhotoType,
    index: number,
    field: keyof PhotoFormValue,
    value: string
  ) => {
    const updater = type === 'before' ? setBeforePhotos : setAfterPhotos;
    updater((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddPhoto = (type: PhotoType) => {
    const updater = type === 'before' ? setBeforePhotos : setAfterPhotos;
    updater((prev) => [...prev, { ...defaultPhoto }]);
  };

  const handleRemovePhoto = (type: PhotoType, index: number) => {
    const updater = type === 'before' ? setBeforePhotos : setAfterPhotos;
    updater((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleDownloadReport = async () => {
    if (!projectId) return;
    setReportError(null);
    setDownloadingReport(true);
    try {
      await downloadModuleReport(projectId, '5s', 'programa-5s');
    } catch (downloadException) {
      console.error('No se pudo descargar el informe 5S', downloadException);
      setReportError('No se pudo descargar el informe 5S. Inténtalo nuevamente.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleActionChange = <K extends keyof EditableAction>(
    index: number,
    field: K,
    value: EditableAction[K]
  ) => {
    setActions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddAction = () => {
    setActions((prev) => [...prev, { ...defaultAction }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleDraftChange = <K extends keyof EditableAction>(
    auditId: string,
    index: number,
    field: K,
    value: EditableAction[K]
  ) => {
    setActionDrafts((prev) => {
      const current = prev[auditId] ?? [{ ...defaultAction }];
      const next = [...current];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [auditId]: next };
    });
  };

  const handleAddDraftAction = (auditId: string) => {
    setActionDrafts((prev) => {
      const current = prev[auditId] ?? [];
      return { ...prev, [auditId]: [...current, { ...defaultAction }] };
    });
  };

  const handleRemoveDraftAction = (auditId: string, index: number) => {
    setActionDrafts((prev) => {
      const current = prev[auditId] ?? [];
      if (current.length <= 1) return prev;
      return {
        ...prev,
        [auditId]: current.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleNoteDraftChange = (auditId: string, value: string) => {
    setNoteDrafts((prev) => ({ ...prev, [auditId]: value }));
  };

  const handleSaveFollowUp = async (auditId: string) => {
    const drafts = actionDrafts[auditId] ?? [];
    const sanitizedActions = drafts
      .map((action) => ({
        description: action.description.trim(),
        responsible: action.responsible.trim(),
        dueDate: action.dueDate.trim(),
        status: action.status,
        notes: action.notes.trim(),
      }))
      .filter((action) => action.description.length > 0)
      .map((action) => ({
        description: action.description,
        responsible:
          action.responsible.length > 0 ? action.responsible : undefined,
        dueDate: action.dueDate.length > 0 ? action.dueDate : undefined,
        status: action.status,
        notes: action.notes.length > 0 ? action.notes : undefined,
      }));

    const payload: Record<string, unknown> = { actions: sanitizedActions };
    const note = noteDrafts[auditId]?.trim() ?? '';
    if (note.length > 0 || noteDrafts[auditId] === '') {
      payload.notes = note.length > 0 ? note : null;
    }

    setSavingAuditId(auditId);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      await api.patch(`/fiveS/audits/${auditId}`, payload);
      setUpdateSuccess('Seguimiento actualizado correctamente.');
      await fetchAudits();
    } catch (err) {
      console.error('No se pudo actualizar el seguimiento 5S', err);
      setUpdateError('No se pudo actualizar el seguimiento de acciones.');
    } finally {
      setSavingAuditId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Informe programa 5S</h2>
            <p className="text-sm text-slate-500">
              Genera un PDF con las auditorías registradas, evidencia y acciones de mejora.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {reportError ? (
              <span className="text-sm text-red-600">{reportError}</span>
            ) : null}
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {downloadingReport ? 'Generando…' : 'Descargar informe 5S'}
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Registrar nueva auditoría 5S
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Documenta el estado actual del área, carga evidencia fotográfica
          antes/después y define las acciones correctivas.
        </p>
        <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Área evaluada
              <input
                type="text"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="Ej. Andén de recepción"
                required
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Puntuación (0 a 5)
              <input
                type="number"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                min={0}
                max={5}
                step={0.1}
                value={score}
                onChange={(event) => setScore(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Fecha de auditoría
              <input
                type="date"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={auditDate}
                onChange={(event) => setAuditDate(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="flex flex-col text-sm font-medium text-slate-700">
            Observaciones generales
            <textarea
              className="mt-1 min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Hallazgos relevantes, oportunidades o acuerdos principales"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {(['before', 'after'] as PhotoType[]).map((type) => {
              const items = type === 'before' ? beforePhotos : afterPhotos;
              return (
                <div
                  key={type}
                  className="rounded-md border border-dashed border-slate-300 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Fotos {type === 'before' ? 'antes' : 'después'}
                    </h3>
                    <button
                      type="button"
                      className="text-sm font-medium text-sky-600 hover:text-sky-700"
                      onClick={() => handleAddPhoto(type)}
                    >
                      Agregar foto
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {items.map((photo, index) => (
                      <div
                        key={`${type}-${index}`}
                        className="rounded-md border border-slate-200 p-3"
                      >
                        <div className="flex flex-col gap-2">
                          <input
                            type="url"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            placeholder="URL de la imagen"
                            value={photo.url}
                            onChange={(event) =>
                              handlePhotoChange(
                                type,
                                index,
                                'url',
                                event.target.value
                              )
                            }
                            required={false}
                          />
                          <input
                            type="text"
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            placeholder="Descripción opcional"
                            value={photo.description}
                            onChange={(event) =>
                              handlePhotoChange(
                                type,
                                index,
                                'description',
                                event.target.value
                              )
                            }
                          />
                          {items.length > 1 && (
                            <button
                              type="button"
                              className="self-start text-xs font-medium text-rose-600 hover:text-rose-700"
                              onClick={() => handleRemovePhoto(type, index)}
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-md border border-dashed border-slate-300 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Acciones correctivas
              </h3>
              <button
                type="button"
                className="text-sm font-medium text-sky-600 hover:text-sky-700"
                onClick={handleAddAction}
              >
                Agregar acción
              </button>
            </div>
            <div className="mt-3 space-y-4">
              {actions.map((action, index) => (
                <div
                  key={`new-action-${index}`}
                  className="rounded-md border border-slate-200 p-3"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col text-xs font-medium text-slate-600">
                      Descripción
                      <textarea
                        className="mt-1 min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        value={action.description}
                        onChange={(event) =>
                          handleActionChange(
                            index,
                            'description',
                            event.target.value
                          )
                        }
                        placeholder="Acción a realizar"
                        required
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col text-xs font-medium text-slate-600">
                        Responsable
                        <input
                          type="text"
                          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          value={action.responsible}
                          onChange={(event) =>
                            handleActionChange(
                              index,
                              'responsible',
                              event.target.value
                            )
                          }
                          placeholder="Nombre o rol"
                        />
                      </label>
                      <label className="flex flex-col text-xs font-medium text-slate-600">
                        Fecha compromiso
                        <input
                          type="date"
                          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          value={action.dueDate}
                          onChange={(event) =>
                            handleActionChange(
                              index,
                              'dueDate',
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </div>
                    <label className="flex flex-col text-xs font-medium text-slate-600">
                      Comentarios
                      <input
                        type="text"
                        className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        value={action.notes}
                        onChange={(event) =>
                          handleActionChange(index, 'notes', event.target.value)
                        }
                        placeholder="Notas de seguimiento"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-medium text-slate-600">
                      Estado
                      <select
                        className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        value={action.status}
                        onChange={(event) =>
                          handleActionChange(
                            index,
                            'status',
                            event.target.value as ActionStatus
                          )
                        }
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {actions.length > 1 && (
                    <button
                      type="button"
                      className="mt-3 text-xs font-medium text-rose-600 hover:text-rose-700"
                      onClick={() => handleRemoveAction(index)}
                    >
                      Quitar acción
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          {formSuccess && (
            <p className="text-sm text-emerald-600">{formSuccess}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? 'Registrando…' : 'Registrar auditoría'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Historial de auditorías
            </h2>
            <p className="text-sm text-slate-500">
              Consulta auditorías previas, evidencia fotográfica y actualiza el
              estado de las acciones.
            </p>
          </div>
          <button
            type="button"
            className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
            onClick={fetchAudits}
          >
            Refrescar
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {loading && (
            <p className="text-sm text-slate-500">Cargando auditorías…</p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!loading && !error && audits.length === 0 && (
            <p className="text-sm text-slate-500">
              Aún no existen auditorías registradas para este proyecto.
            </p>
          )}

          {!loading &&
            !error &&
            audits.map((audit) => {
              const before = (audit.photos ?? []).filter(
                (photo) => photo.type === 'before'
              );
              const after = (audit.photos ?? []).filter(
                (photo) => photo.type === 'after'
              );
              const drafts = actionDrafts[audit.id] ?? [{ ...defaultAction }];
              const noteDraft = noteDrafts[audit.id] ?? '';
              return (
                <article
                  key={audit.id}
                  className="rounded-md border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {audit.area}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-600">
                        <span>Puntuación: {formatNumber(audit.score)}</span>
                        <span>Fecha: {formatDisplayDate(audit.auditDate)}</span>
                        <span>
                          Registrado: {formatDisplayDate(audit.createdAt)}
                        </span>
                      </div>
                    </div>
                    {audit.createdBy?.name && (
                      <span className="text-sm text-slate-500">
                        Registrado por {audit.createdBy.name}
                      </span>
                    )}
                  </div>

                  {(before.length > 0 || after.length > 0) && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          Antes
                        </h4>
                        <div className="mt-2 space-y-3">
                          {before.length === 0 && (
                            <p className="text-xs text-slate-500">
                              Sin evidencia registrada.
                            </p>
                          )}
                          {before.map((photo, index) => (
                            <div
                              key={`before-${audit.id}-${index}`}
                              className="space-y-2 rounded-md border border-slate-200 p-3"
                            >
                              <img
                                src={photo.url}
                                alt={`Foto antes ${index + 1} - ${audit.area}`}
                                className="h-40 w-full rounded-md object-cover"
                                loading="lazy"
                              />
                              {photo.description && (
                                <p className="text-xs text-slate-600">
                                  {photo.description}
                                </p>
                              )}
                              <a
                                href={photo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs font-medium text-sky-600 hover:text-sky-700"
                              >
                                Abrir imagen
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          Después
                        </h4>
                        <div className="mt-2 space-y-3">
                          {after.length === 0 && (
                            <p className="text-xs text-slate-500">
                              Sin evidencia registrada.
                            </p>
                          )}
                          {after.map((photo, index) => (
                            <div
                              key={`after-${audit.id}-${index}`}
                              className="space-y-2 rounded-md border border-slate-200 p-3"
                            >
                              <img
                                src={photo.url}
                                alt={`Foto después ${index + 1} - ${audit.area}`}
                                className="h-40 w-full rounded-md object-cover"
                                loading="lazy"
                              />
                              {photo.description && (
                                <p className="text-xs text-slate-600">
                                  {photo.description}
                                </p>
                              )}
                              <a
                                href={photo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs font-medium text-sky-600 hover:text-sky-700"
                              >
                                Abrir imagen
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800">
                      Seguimiento de acciones
                    </h4>
                    <div className="space-y-4">
                      {drafts.map((action, index) => (
                        <div
                          key={`draft-${audit.id}-${index}`}
                          className="rounded-md border border-slate-200 p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex flex-col text-xs font-medium text-slate-600">
                              Descripción
                              <textarea
                                className="mt-1 min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                value={action.description}
                                onChange={(event) =>
                                  handleDraftChange(
                                    audit.id,
                                    index,
                                    'description',
                                    event.target.value
                                  )
                                }
                              />
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="flex flex-col text-xs font-medium text-slate-600">
                                Responsable
                                <input
                                  type="text"
                                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  value={action.responsible}
                                  onChange={(event) =>
                                    handleDraftChange(
                                      audit.id,
                                      index,
                                      'responsible',
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                              <label className="flex flex-col text-xs font-medium text-slate-600">
                                Fecha compromiso
                                <input
                                  type="date"
                                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  value={action.dueDate}
                                  onChange={(event) =>
                                    handleDraftChange(
                                      audit.id,
                                      index,
                                      'dueDate',
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                            </div>
                            <label className="flex flex-col text-xs font-medium text-slate-600">
                              Comentarios
                              <input
                                type="text"
                                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                value={action.notes}
                                onChange={(event) =>
                                  handleDraftChange(
                                    audit.id,
                                    index,
                                    'notes',
                                    event.target.value
                                  )
                                }
                              />
                            </label>
                            <label className="flex flex-col text-xs font-medium text-slate-600">
                              Estado
                              <select
                                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                value={action.status}
                                onChange={(event) =>
                                  handleDraftChange(
                                    audit.id,
                                    index,
                                    'status',
                                    event.target.value as ActionStatus
                                  )
                                }
                              >
                                {statusOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          {(drafts.length > 1 ||
                            (drafts.length === 1 && drafts[0].description)) && (
                            <button
                              type="button"
                              className="mt-3 text-xs font-medium text-rose-600 hover:text-rose-700"
                              onClick={() =>
                                handleRemoveDraftAction(audit.id, index)
                              }
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-sm font-medium text-sky-600 hover:text-sky-700"
                      onClick={() => handleAddDraftAction(audit.id)}
                    >
                      Agregar acción de seguimiento
                    </button>
                    <label className="mt-2 flex flex-col text-xs font-medium text-slate-600">
                      Notas de seguimiento
                      <textarea
                        className="mt-1 min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        value={noteDraft}
                        onChange={(event) =>
                          handleNoteDraftChange(audit.id, event.target.value)
                        }
                        placeholder="Resumen de avances o acuerdos"
                      />
                    </label>
                    <div className="flex items-center justify-end gap-3">
                      {savingAuditId === audit.id && (
                        <span className="text-sm text-slate-500">
                          Guardando…
                        </span>
                      )}
                      <button
                        type="button"
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() => handleSaveFollowUp(audit.id)}
                        disabled={savingAuditId === audit.id}
                      >
                        Guardar seguimiento
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>

        {updateError && (
          <p className="mt-4 text-sm text-rose-600">{updateError}</p>
        )}
        {updateSuccess && (
          <p className="mt-4 text-sm text-emerald-600">{updateSuccess}</p>
        )}
      </section>
    </div>
  );
};

export default FiveSTab;
