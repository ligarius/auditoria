import { FormEvent, useEffect, useState } from 'react';

import api from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count?: { memberships: number };
}

interface UserManagerProps {
  onChange?: () => void;
}

const defaultForm = {
  name: '',
  email: '',
  role: 'consultor',
  password: '',
};

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'consultor', label: 'Consultor' },
  { value: 'cliente', label: 'Cliente' },
];

export default function UserManager({ onChange }: UserManagerProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<ManagedUser[]>('/users');
      setUsers(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudieron cargar los usuarios'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => setForm(defaultForm);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post('/users', {
        name: form.name,
        email: form.email,
        role: form.role,
        password: form.password,
      });
      resetForm();
      await loadUsers();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear el usuario'));
    }
  };

  const updateRole = async (id: string, role: string) => {
    try {
      await api.put(`/users/${id}`, { role });
      await loadUsers();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar el rol'));
    }
  };

  const applyPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetPasswordId || !resetPasswordValue.trim()) return;
    try {
      await api.put(`/users/${resetPasswordId}`, {
        password: resetPasswordValue.trim(),
      });
      setResetPasswordId(null);
      setResetPasswordValue('');
      await loadUsers();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la contraseña'));
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      await loadUsers();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar el usuario'));
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Usuarios</h2>
        <p className="text-sm text-slate-500">
          Gestiona cuentas, roles y reseteo de contraseñas.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-lg border border-slate-200 p-4"
      >
        <h3 className="text-base font-medium text-slate-800">Nuevo usuario</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col text-sm">
            Nombre
            <input
              className="mt-1 rounded border px-3 py-2"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Email
            <input
              type="email"
              className="mt-1 rounded border px-3 py-2"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Rol
            <select
              className="mt-1 rounded border px-3 py-2"
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value }))
              }
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            Contraseña temporal
            <input
              type="password"
              className="mt-1 rounded border px-3 py-2"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              minLength={8}
              required
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-600"
            onClick={resetForm}
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Crear usuario
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Nombre
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Email
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Rol
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Proyectos
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {user.name}
                </td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border px-2 py-1"
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                  >
                    {roles.map((role) => (
                      <option
                        key={`${user.id}-${role.value}`}
                        value={role.value}
                      >
                        {role.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">{user._count?.memberships ?? 0}</td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    onClick={() => {
                      setResetPasswordId(user.id);
                      setResetPasswordValue('');
                    }}
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    Reset contraseña
                  </button>
                  <button
                    onClick={() => remove(user.id)}
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    disabled={(user._count?.memberships ?? 0) > 0}
                    title={
                      (user._count?.memberships ?? 0) > 0
                        ? 'El usuario tiene proyectos asignados'
                        : undefined
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  Cargando usuarios…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resetPasswordId && (
        <form
          onSubmit={applyPasswordReset}
          className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-slate-800">
              Resetear contraseña
            </h3>
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={() => setResetPasswordId(null)}
            >
              Cerrar
            </button>
          </div>
          <p className="text-sm text-slate-600">
            Ingresa una contraseña temporal. El usuario deberá cambiarla al
            iniciar sesión.
          </p>
          <label className="flex flex-col text-sm">
            Nueva contraseña
            <input
              type="password"
              className="mt-1 rounded border px-3 py-2"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Guardar contraseña
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
