import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../lib/api';
import { LAST_PROJECT_KEY } from '../lib/session';

export default function ProjectsRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem(LAST_PROJECT_KEY);
    if (stored) {
      navigate(`/projects/${stored}`, { replace: true });
      return;
    }
    const resolveProject = async () => {
      try {
        const res = await api.get('/projects');
        const first = res.data?.[0];
        if (first?.id) {
          localStorage.setItem(LAST_PROJECT_KEY, first.id);
          navigate(`/projects/${first.id}`, { replace: true });
        }
      } catch {
        navigate('/login', { replace: true });
      }
    };
    resolveProject();
  }, [navigate]);

  return <div className="p-6 text-slate-600">Cargando proyecto...</div>;
}
