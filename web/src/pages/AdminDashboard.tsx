import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLastProjectId(localStorage.getItem('lastProjectId'));
    }
  }, []);

  const quickActionBase = useMemo(
    () => (lastProjectId ? `/projects/${lastProjectId}` : '/projects'),
    [lastProjectId],
  );

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
      <header className="space-y-2 sm:flex sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Panel administrativo
          </h1>
          <p className="text-sm text-slate-600">
            Gestiona compañías, usuarios y obtén visibilidad rápida del estado
            de la plataforma.
          </p>
        </div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        >
          Volver al sistema
        </Link>
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

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-800">
              Exportación ejecutiva
            </h2>
            <p className="text-sm text-slate-600">
              Descarga reportes consolidados en Excel y comparte avances con los
              stakeholders.
            </p>
          </div>
          <Link
            to={`${quickActionBase}${quickActionBase.endsWith('/projects') ? '' : '/export'}`}
            className="mt-4 inline-flex items-center justify-center rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Ir a exportación
          </Link>
        </article>
        <article className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-800">
              Configuración del proyecto
            </h2>
            <p className="text-sm text-slate-600">
              Ajusta datos base, miembros y el alcance del proyecto de
              auditoría.
            </p>
          </div>
          <Link
            to={quickActionBase}
            className="mt-4 inline-flex items-center justify-center rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Abrir proyectos
          </Link>
        </article>
        <article className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-800">
              Seguridad y sistemas
            </h2>
            <p className="text-sm text-slate-600">
              Accede rápidamente a los tableros de seguridad y sistemas para
              revisar hallazgos técnicos.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              to={`${quickActionBase}${quickActionBase.endsWith('/projects') ? '' : '/security'}`}
              className="flex-1 rounded bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Seguridad
            </Link>
            <Link
              to={`${quickActionBase}${quickActionBase.endsWith('/projects') ? '' : '/systems'}`}
              className="flex-1 rounded bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Sistemas
            </Link>
          </div>
        </article>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <CompanyManager onChange={refreshSummary} />
        <UserManager onChange={refreshSummary} />
      </div>
    </div>
  );
}
