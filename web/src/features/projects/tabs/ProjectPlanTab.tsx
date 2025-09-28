import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface ProjectTask {
  id: string;
  name: string;
  description?: string | null;
  owner?: string | null;
  status: string;
  progress?: number | null;
  startDate: string;
  endDate: string;
  parentId?: string | null;
  sortOrder?: number | null;
}

interface ProjectPlanTabProps {
  projectId: string;
}

interface TaskNode extends ProjectTask {
  children: TaskNode[];
  depth: number;
}

const TASK_STATUS = ['Planificado', 'En progreso', 'Completado'];

const STATUS_COLOR: Record<string, string> = {
  Planificado: 'bg-slate-300',
  'En progreso': 'bg-blue-500',
  Completado: 'bg-emerald-500',
};

const defaultForm = {
  name: '',
  owner: '',
  status: 'Planificado',
  progress: 0,
  startDate: '',
  endDate: '',
  parentId: '',
  description: '',
};

const parseDate = (value: string) => new Date(value);

const buildHierarchy = (tasks: ProjectTask[]): TaskNode[] => {
  const map = new Map<string, TaskNode>();
  tasks.forEach((task) => {
    map.set(task.id, { ...task, children: [], depth: 0 });
  });
  const roots: TaskNode[] = [];
  const attach = (node: TaskNode) => {
    if (node.parentId && map.has(node.parentId)) {
      const parent = map.get(node.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  };
  map.forEach(attach);

  const sortNodes = (nodes: TaskNode[]) => {
    nodes.sort((a, b) => {
      if (a.sortOrder !== null && a.sortOrder !== undefined && b.sortOrder !== null && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      return parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime();
    });
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
};

const flattenHierarchy = (nodes: TaskNode[]): TaskNode[] => {
  const result: TaskNode[] = [];
  const visit = (list: TaskNode[]) => {
    list.forEach((node) => {
      result.push(node);
      if (node.children.length > 0) {
        visit(node.children);
      }
    });
  };
  visit(nodes);
  return result;
};

const getTimelineBounds = (tasks: ProjectTask[]) => {
  if (!tasks.length) {
    const today = new Date();
    return { start: today, end: today };
  }
  let min = parseDate(tasks[0].startDate);
  let max = parseDate(tasks[0].endDate);
  tasks.forEach((task) => {
    const start = parseDate(task.startDate);
    const end = parseDate(task.endDate);
    if (start < min) min = start;
    if (end > max) max = end;
  });
  return { start: min, end: max };
};

const formatDate = (value: string) => new Date(value).toLocaleDateString();

export default function ProjectPlanTab({ projectId }: ProjectPlanTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<ProjectTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await api.get<ProjectTask[]>(`/project-plan/${projectId}`);
      setTasks(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo cargar el plan del proyecto'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/project-plan/${projectId}`, {
        name: form.name,
        owner: form.owner || undefined,
        status: form.status,
        progress: Number(form.progress) || 0,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        parentId: form.parentId || undefined,
        description: form.description || undefined,
        sortOrder: tasks.length,
      });
      resetForm();
      await loadTasks();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear la tarea'));
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/project-plan/${projectId}/${editing.id}`, {
        name: editing.name,
        owner: editing.owner || undefined,
        status: editing.status,
        progress:
          editing.progress !== null && editing.progress !== undefined
            ? Number(editing.progress)
            : 0,
        startDate: new Date(editing.startDate).toISOString(),
        endDate: new Date(editing.endDate).toISOString(),
        parentId: editing.parentId || undefined,
        description: editing.description || undefined,
        sortOrder: editing.sortOrder ?? undefined,
      });
      setEditing(null);
      await loadTasks();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la tarea'));
    }
  };

  const removeTask = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/project-plan/${projectId}/${id}`);
      await loadTasks();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar la tarea'));
    }
  };

  const hierarchy = useMemo(() => buildHierarchy(tasks), [tasks]);
  const flatTasks = useMemo(() => flattenHierarchy(hierarchy), [hierarchy]);
  const timeline = useMemo(() => getTimelineBounds(tasks), [tasks]);
  const totalDuration = Math.max(
    1,
    Math.round(
      (timeline.end.getTime() - timeline.start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  const availableParents = editing
    ? tasks.filter((task) => task.id !== editing.id)
    : tasks;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Plan del proyecto</h2>
        <p className="text-sm text-slate-500">
          Crea hitos, asigna responsables y visualiza la carta Gantt del proyecto.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {canEdit && !editing && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-lg border border-slate-200 p-4"
        >
          <h3 className="text-lg font-medium text-slate-800">Nueva tarea</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Nombre
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Responsable
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.owner}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, owner: event.target.value }))
                }
                placeholder="Nombre del responsable"
              />
            </label>
            <label className="flex flex-col text-sm">
              Estado
              <select
                className="mt-1 rounded border px-3 py-2"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                {TASK_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              Progreso (%)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 rounded border px-3 py-2"
                value={form.progress}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, progress: Number(event.target.value) }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Fecha inicio
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Fecha término
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={form.endDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Tarea padre
              <select
                className="mt-1 rounded border px-3 py-2"
                value={form.parentId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, parentId: event.target.value }))
                }
              >
                <option value="">Ninguna</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Descripción
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
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
              Agregar tarea
            </button>
          </div>
        </form>
      )}

      {editing && canEdit && (
        <form
          onSubmit={handleUpdate}
          className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">Editar tarea</h3>
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Nombre
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.name}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, name: event.target.value } : prev
                  )
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Responsable
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.owner ?? ''}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, owner: event.target.value } : prev
                  )
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Estado
              <select
                className="mt-1 rounded border px-3 py-2"
                value={editing.status}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, status: event.target.value } : prev
                  )
                }
              >
                {TASK_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              Progreso (%)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 rounded border px-3 py-2"
                value={editing.progress ?? 0}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev
                      ? { ...prev, progress: Number(event.target.value) }
                      : prev
                  )
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Fecha inicio
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={editing.startDate.substring(0, 10)}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, startDate: event.target.value } : prev
                  )
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Fecha término
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={editing.endDate.substring(0, 10)}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, endDate: event.target.value } : prev
                  )
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Tarea padre
              <select
                className="mt-1 rounded border px-3 py-2"
                value={editing.parentId ?? ''}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, parentId: event.target.value || null } : prev
                  )
                }
              >
                <option value="">Ninguna</option>
                {availableParents.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Descripción
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={editing.description ?? ''}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, description: event.target.value } : prev
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
              Actualizar tarea
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Carta Gantt</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="min-w-[720px] space-y-4 p-4">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
              <span>{timeline.start.toLocaleDateString()}</span>
              <span>{timeline.end.toLocaleDateString()}</span>
            </div>
            <div className="space-y-3">
              {flatTasks.map((task) => {
                const startOffset =
                  ((parseDate(task.startDate).getTime() - timeline.start.getTime()) /
                    (1000 * 60 * 60 * 24)) /
                  totalDuration;
                const duration =
                  ((parseDate(task.endDate).getTime() - parseDate(task.startDate).getTime()) /
                    (1000 * 60 * 60 * 24)) /
                  totalDuration;
                const widthPercent = Math.max(duration * 100, 2);
                const leftPercent = Math.max(startOffset * 100, 0);
                const color = STATUS_COLOR[task.status] ?? 'bg-slate-400';
                const progressPercent = Math.min(task.progress ?? 0, 100);
                const progressWidth = Math.max(
                  (widthPercent * progressPercent) / 100,
                  0
                );

                return (
                  <div key={task.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">
                        {Array.from({ length: task.depth })
                          .map(() => '•')
                          .join(' ')}{' '}
                        {task.name}
                      </span>
                      {task.owner && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {task.owner}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {formatDate(task.startDate)} → {formatDate(task.endDate)}
                      </span>
                    </div>
                    <div className="relative h-3 rounded bg-slate-100">
                      <div
                        className={`absolute h-3 rounded ${color}`}
                        style={{
                          width: `${widthPercent}%`,
                          left: `${leftPercent}%`,
                          minWidth: '2%',
                        }}
                      />
                      {task.progress !== null && task.progress !== undefined && (
                        <div
                          className="absolute h-3 rounded bg-black/20"
                          style={{
                            width: `${progressWidth}%`,
                            left: `${leftPercent}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              {flatTasks.length === 0 && (
                <p className="text-sm text-slate-500">
                  Aún no hay tareas registradas. Crea hitos para visualizar el plan.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Detalle de tareas</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Tarea</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Responsable</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Estado</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Inicio</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Término</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {flatTasks.map((task) => (
                <tr key={`${task.id}-row`} className="bg-white">
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-800">
                      {Array.from({ length: task.depth })
                        .map(() => '•')
                        .join(' ')}{' '}
                      {task.name}
                    </span>
                    {task.description && (
                      <p className="text-xs text-slate-500">{task.description}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {task.owner || '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{task.status}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {formatDate(task.startDate)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {formatDate(task.endDate)}
                  </td>
                  <td className="px-3 py-2">
                    {canEdit && (
                      <button
                        className="mr-2 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                        onClick={() => setEditing(task)}
                      >
                        Editar
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white"
                        onClick={() => removeTask(task.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {flatTasks.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    No hay tareas registradas.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    Cargando plan…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
