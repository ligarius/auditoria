import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface Evidence {
  url: string;
  description?: string | null;
}

interface CheckItem {
  description: string;
  status?: 'ok' | 'no_ok' | 'na' | null;
  notes?: string | null;
}

interface HseCheck {
  id: string;
  type: 'induccion' | 'checklist' | 'inspeccion';
  title: string;
  conductedBy?: string | null;
  location?: string | null;
  notes?: string | null;
  items?: CheckItem[] | null;
  evidence?: Evidence[] | null;
  performedAt: string;
  createdBy?: { id: string; name: string | null } | null;
}

interface PpeItem {
  item: string;
  quantity?: number | null;
  notes?: string | null;
}

interface PpeAssignment {
  id: string;
  personName: string;
  role?: string | null;
  deliveredBy?: string | null;
  notes?: string | null;
  assignedAt: string;
  items?: PpeItem[] | null;
  evidence?: Evidence[] | null;
  createdBy?: { id: string; name: string | null } | null;
}

interface Incident {
  id: string;
  title: string;
  severity: 'baja' | 'media' | 'alta' | 'critica';
  description?: string | null;
  reportedBy?: string | null;
  occurredAt: string;
  location?: string | null;
  immediateActions?: string | null;
  correctiveActions?: string | null;
  photos?: Evidence[] | null;
  createdBy?: { id: string; name: string | null } | null;
}

interface HseTabProps {
  projectId: string;
}

const checkTypeLabels: Record<HseCheck['type'], string> = {
  induccion: 'Inducción',
  checklist: 'Checklist',
  inspeccion: 'Inspección',
};

const severityLabels: Record<Incident['severity'], string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

const defaultCheckForm = {
  type: 'induccion' as HseCheck['type'],
  title: '',
  conductedBy: '',
  performedAt: '',
  location: '',
  notes: '',
  itemsText: '',
  evidenceText: '',
};

const defaultPpeForm = {
  personName: '',
  role: '',
  deliveredBy: '',
  assignedAt: '',
  notes: '',
  itemsText: '',
  evidenceText: '',
};

const defaultIncidentForm = {
  title: '',
  severity: 'baja' as Incident['severity'],
  description: '',
  reportedBy: '',
  occurredAt: '',
  location: '',
  immediateActions: '',
  correctiveActions: '',
  photosText: '',
};

const parseEvidence = (text: string): Evidence[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, ...rest] = line.split('|');
      const description = rest.join('|').trim();
      return {
        url: url.trim(),
        description: description.length > 0 ? description : undefined,
      };
    });

const parseCheckItems = (text: string): CheckItem[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((description) => ({ description, status: 'ok' as const }));

const parsePpeItems = (text: string): PpeItem[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [item, qty, ...rest] = line.split('|');
      const quantity = qty ? Number.parseInt(qty.trim(), 10) : undefined;
      const notes = rest.join('|').trim();
      return {
        item: item.trim(),
        quantity: Number.isNaN(quantity) ? undefined : quantity,
        notes: notes.length > 0 ? notes : undefined,
      };
    });

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export default function HseTab({ projectId }: HseTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);

  const [checks, setChecks] = useState<HseCheck[]>([]);
  const [ppeAssignments, setPpeAssignments] = useState<PpeAssignment[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [checkForm, setCheckForm] = useState(defaultCheckForm);
  const [ppeForm, setPpeForm] = useState(defaultPpeForm);
  const [incidentForm, setIncidentForm] = useState(defaultIncidentForm);

  const [error, setError] = useState<string | null>(null);

  const loadChecks = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<HseCheck[]>(`/hse/checks/${projectId}`);
      setChecks(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No se pudieron cargar los chequeos HSE'));
    }
  }, [projectId]);

  const loadPpe = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<PpeAssignment[]>(`/hse/ppe/${projectId}`);
      setPpeAssignments(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, 'No se pudieron cargar las asignaciones de EPP')
      );
    }
  }, [projectId]);

  const loadIncidents = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<Incident[]>(`/hse/incidents/${projectId}`);
      setIncidents(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No se pudieron cargar los incidentes'));
    }
  }, [projectId]);

  useEffect(() => {
    void loadChecks();
    void loadPpe();
    void loadIncidents();
  }, [loadChecks, loadPpe, loadIncidents]);

  const handleSubmitCheck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;

    try {
      setError(null);
      await api.post(`/hse/checks/${projectId}`, {
        type: checkForm.type,
        title: checkForm.title,
        conductedBy: checkForm.conductedBy || undefined,
        location: checkForm.location || undefined,
        notes: checkForm.notes || undefined,
        performedAt: checkForm.performedAt || undefined,
        items: parseCheckItems(checkForm.itemsText),
        evidence: parseEvidence(checkForm.evidenceText),
      });
      setCheckForm(defaultCheckForm);
      await loadChecks();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No se pudo registrar el chequeo HSE'));
    }
  };

  const handleSubmitPpe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;

    try {
      setError(null);
      await api.post(`/hse/ppe/${projectId}`, {
        personName: ppeForm.personName,
        role: ppeForm.role || undefined,
        deliveredBy: ppeForm.deliveredBy || undefined,
        assignedAt: ppeForm.assignedAt || undefined,
        notes: ppeForm.notes || undefined,
        items: parsePpeItems(ppeForm.itemsText),
        evidence: parseEvidence(ppeForm.evidenceText),
      });
      setPpeForm(defaultPpeForm);
      await loadPpe();
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, 'No se pudo registrar la asignación de EPP')
      );
    }
  };

  const handleSubmitIncident = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;

    try {
      setError(null);
      await api.post(`/hse/incidents/${projectId}`, {
        title: incidentForm.title,
        severity: incidentForm.severity,
        description: incidentForm.description || undefined,
        reportedBy: incidentForm.reportedBy || undefined,
        occurredAt: incidentForm.occurredAt || undefined,
        location: incidentForm.location || undefined,
        immediateActions: incidentForm.immediateActions || undefined,
        correctiveActions: incidentForm.correctiveActions || undefined,
        photos: parseEvidence(incidentForm.photosText),
      });
      setIncidentForm(defaultIncidentForm);
      await loadIncidents();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No se pudo reportar el incidente'));
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Chequeos e inducciones HSE
            </h2>
            <p className="text-sm text-slate-500">
              Documenta inducciones, checklists y evidencias fotográficas.
            </p>
          </div>
        </div>

        {canEdit ? (
          <form
            className="mb-6 grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmitCheck}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Tipo de registro
              </label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={checkForm.type}
                onChange={(event) =>
                  setCheckForm((prev) => ({
                    ...prev,
                    type: event.target.value as HseCheck['type'],
                  }))
                }
              >
                <option value="induccion">Inducción</option>
                <option value="checklist">Checklist</option>
                <option value="inspeccion">Inspección</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Fecha de ejecución
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={checkForm.performedAt}
                onChange={(event) =>
                  setCheckForm((prev) => ({
                    ...prev,
                    performedAt: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Título o actividad
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={checkForm.title}
                onChange={(event) =>
                  setCheckForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Responsable / Facilitador
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={checkForm.conductedBy}
                onChange={(event) =>
                  setCheckForm((prev) => ({
                    ...prev,
                    conductedBy: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Ubicación
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={checkForm.location}
                onChange={(event) =>
                  setCheckForm((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Ítems del checklist (uno por línea)
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Ingreso a planta\nUso de EPP\nBriefing de riesgos"
                value={checkForm.itemsText}
                onChange={(event) =>
                  setCheckForm((prev) => ({
                    ...prev,
                    itemsText: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Notas generales
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={checkForm.notes}
                onChange={(event) =>
                  setCheckForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Evidencias (URL|Descripción, una por línea)
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="https://foto.com/epp1.jpg|Equipo completo"
                value={checkForm.evidenceText}
                onChange={(event) =>
                  setCheckForm((prev) => ({
                    ...prev,
                    evidenceText: event.target.value,
                  }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none"
              >
                Registrar chequeo
              </button>
            </div>
          </form>
        ) : null}

        <div className="space-y-4">
          {checks.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aún no hay chequeos registrados.
            </p>
          ) : (
            checks.map((check) => (
              <article
                key={check.id}
                className="rounded-md border border-slate-200 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {check.title}
                    </p>
                    <p className="text-slate-500">
                      {checkTypeLabels[check.type]} ·{' '}
                      {formatDate(check.performedAt)}
                    </p>
                  </div>
                  {check.createdBy?.name ? (
                    <span className="text-xs text-slate-400">
                      Registrado por {check.createdBy.name}
                    </span>
                  ) : null}
                </div>

                {check.conductedBy ? (
                  <p className="mt-2 text-slate-600">
                    Responsable: {check.conductedBy}
                  </p>
                ) : null}

                {check.location ? (
                  <p className="text-slate-600">Ubicación: {check.location}</p>
                ) : null}

                {check.notes ? (
                  <p className="mt-2 text-slate-600">Notas: {check.notes}</p>
                ) : null}

                {check.items && check.items.length > 0 ? (
                  <ul className="mt-3 list-inside list-disc text-slate-600">
                    {check.items.map((item, index) => (
                      <li key={index}>{item.description}</li>
                    ))}
                  </ul>
                ) : null}

                {check.evidence && check.evidence.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    <p className="font-medium text-slate-700">Evidencias</p>
                    <ul className="space-y-1">
                      {check.evidence.map((item, index) => (
                        <li key={index}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {item.description || item.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Entrega de EPP por persona
          </h2>
          <p className="text-sm text-slate-500">
            Controla las asignaciones y renovaciones de equipos de protección.
          </p>
        </div>

        {canEdit ? (
          <form
            className="mb-6 grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmitPpe}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Colaborador
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={ppeForm.personName}
                onChange={(event) =>
                  setPpeForm((prev) => ({
                    ...prev,
                    personName: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Rol</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={ppeForm.role}
                onChange={(event) =>
                  setPpeForm((prev) => ({
                    ...prev,
                    role: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Fecha de entrega
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={ppeForm.assignedAt}
                onChange={(event) =>
                  setPpeForm((prev) => ({
                    ...prev,
                    assignedAt: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Entregado por
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={ppeForm.deliveredBy}
                onChange={(event) =>
                  setPpeForm((prev) => ({
                    ...prev,
                    deliveredBy: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                EPP entregado (Elemento|Cantidad|Notas, uno por línea)
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Casco|1\nChaleco reflectivo|1|Reposición"
                value={ppeForm.itemsText}
                onChange={(event) =>
                  setPpeForm((prev) => ({
                    ...prev,
                    itemsText: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Notas adicionales
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={ppeForm.notes}
                onChange={(event) =>
                  setPpeForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Evidencias de entrega (URL|Descripción)
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={ppeForm.evidenceText}
                onChange={(event) =>
                  setPpeForm((prev) => ({
                    ...prev,
                    evidenceText: event.target.value,
                  }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none"
              >
                Registrar asignación
              </button>
            </div>
          </form>
        ) : null}

        <div className="space-y-4">
          {ppeAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay asignaciones de EPP registradas.
            </p>
          ) : (
            ppeAssignments.map((assignment) => (
              <article
                key={assignment.id}
                className="rounded-md border border-slate-200 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {assignment.personName}
                    </p>
                    <p className="text-slate-500">
                      {assignment.role ? `${assignment.role} · ` : ''}
                      {formatDate(assignment.assignedAt)}
                    </p>
                  </div>
                  {assignment.createdBy?.name ? (
                    <span className="text-xs text-slate-400">
                      Registrado por {assignment.createdBy.name}
                    </span>
                  ) : null}
                </div>

                {assignment.deliveredBy ? (
                  <p className="mt-2 text-slate-600">
                    Entregado por: {assignment.deliveredBy}
                  </p>
                ) : null}

                {assignment.notes ? (
                  <p className="text-slate-600">Notas: {assignment.notes}</p>
                ) : null}

                {assignment.items && assignment.items.length > 0 ? (
                  <ul className="mt-3 list-inside list-disc text-slate-600">
                    {assignment.items.map((item, index) => (
                      <li key={index}>
                        {item.item}
                        {item.quantity ? ` · ${item.quantity}` : ''}
                        {item.notes ? ` — ${item.notes}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {assignment.evidence && assignment.evidence.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    <p className="font-medium text-slate-700">Evidencias</p>
                    <ul className="space-y-1">
                      {assignment.evidence.map((item, index) => (
                        <li key={index}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {item.description || item.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Registro de incidentes y condiciones inseguras
          </h2>
          <p className="text-sm text-slate-500">
            Reporta incidentes, adjunta fotos y documenta acciones inmediatas.
          </p>
        </div>

        {canEdit ? (
          <form
            className="mb-6 grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmitIncident}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Título del incidente
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={incidentForm.title}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Severidad
              </label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={incidentForm.severity}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    severity: event.target.value as Incident['severity'],
                  }))
                }
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Fecha del evento
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={incidentForm.occurredAt}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    occurredAt: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Reportado por
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={incidentForm.reportedBy}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    reportedBy: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Ubicación
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={incidentForm.location}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Descripción del evento
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={incidentForm.description}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Acciones inmediatas
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={incidentForm.immediateActions}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    immediateActions: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Acciones correctivas
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={incidentForm.correctiveActions}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    correctiveActions: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Fotos y evidencias (URL|Descripción)
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="https://foto.com/incidente1.jpg|Vista área impacto"
                value={incidentForm.photosText}
                onChange={(event) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    photosText: event.target.value,
                  }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none"
              >
                Reportar incidente
              </button>
            </div>
          </form>
        ) : null}

        <div className="space-y-4">
          {incidents.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay incidentes reportados.
            </p>
          ) : (
            incidents.map((incident) => (
              <article
                key={incident.id}
                className="rounded-md border border-slate-200 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {incident.title}
                    </p>
                    <p className="text-slate-500">
                      {severityLabels[incident.severity]} ·{' '}
                      {formatDate(incident.occurredAt)}
                    </p>
                  </div>
                  {incident.createdBy?.name ? (
                    <span className="text-xs text-slate-400">
                      Registrado por {incident.createdBy.name}
                    </span>
                  ) : null}
                </div>

                {incident.location ? (
                  <p className="mt-2 text-slate-600">
                    Ubicación: {incident.location}
                  </p>
                ) : null}

                {incident.reportedBy ? (
                  <p className="text-slate-600">
                    Reportado por: {incident.reportedBy}
                  </p>
                ) : null}

                {incident.description ? (
                  <p className="mt-2 text-slate-600">
                    Descripción: {incident.description}
                  </p>
                ) : null}

                {incident.immediateActions ? (
                  <p className="mt-2 text-slate-600">
                    Acciones inmediatas: {incident.immediateActions}
                  </p>
                ) : null}

                {incident.correctiveActions ? (
                  <p className="text-slate-600">
                    Acciones correctivas: {incident.correctiveActions}
                  </p>
                ) : null}

                {incident.photos && incident.photos.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    <p className="font-medium text-slate-700">Evidencias</p>
                    <ul className="space-y-1">
                      {incident.photos.map((photo, index) => (
                        <li key={index}>
                          <a
                            href={photo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {photo.description || photo.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
