import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import CompanyManager from '../features/admin/CompanyManager';
import UserManager from '../features/admin/UserManager';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { getErrorMessage } from '../lib/errors';

interface Summary {
  companies: number;
  projects: number;
  users: number;
}

export default function AdminDashboard() {
  const { role } = useAuth();
  const [summary, setSummary] = useState<Summary>({
    companies: 0,
    projects: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, projectsRes, usersRes] = await Promise.all([
        api.get('/companies'),
        api.get('/projects'),
        api.get('/users'),
      ]);
      setSummary({
        companies: Array.isArray(companiesRes.data)
          ? companiesRes.data.length
          : 0,
        projects: Array.isArray(projectsRes.data) ? projectsRes.data.length : 0,
        users: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
      });
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'No se pudo obtener el resumen'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      refreshSummary();
    }
  }, [role, refreshSummary]);

  if (role !== 'admin') {
    return (
      <div className="mx-auto mt-20 max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-center shadow">
        <h1 className="text-2xl font-semibold text-slate-900">
          Acceso restringido
        </h1>
        <p className="text-sm text-slate-600">
          Solo los administradores pueden acceder al panel de gestión. Solicita
          permisos a un administrador del sistema.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Volver al portal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">
          Panel administrativo
        </h1>
        <p className="text-sm text-slate-600">
          Gestiona compañías, usuarios y obtén visibilidad rápida del estado de
          la plataforma.
        </p>
      </header>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Compañías activas</p>
          <p className="text-3xl font-semibold text-slate-900">
            {summary.companies}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Proyectos</p>
          <p className="text-3xl font-semibold text-slate-900">
            {summary.projects}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Usuarios</p>
          <p className="text-3xl font-semibold text-slate-900">
            {summary.users}
          </p>
          {loading && <p className="text-xs text-slate-500">Actualizando…</p>}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <CompanyManager onChange={refreshSummary} />
        <UserManager onChange={refreshSummary} />
      </div>
    </div>
  );
}
