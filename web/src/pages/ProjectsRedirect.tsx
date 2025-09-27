import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../lib/api';

export default function ProjectsRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('lastProjectId');
    if (stored) {
      navigate(`/projects/${stored}`, { replace: true });
      return;
    }
    const resolveProject = async () => {
      try {
        const res = await api.get('/projects');
        const first = res.data?.[0];
        if (first?.id) {
          localStorage.setItem('lastProjectId', first.id);
          navigate(`/projects/${first.id}`, { replace: true });
        }
      } catch (error) {
        navigate('/login', { replace: true });
      }
    };
    resolveProject();
  }, [navigate]);

  return (
    <div className="p-6 text-slate-600">
      Cargando proyecto...
    </div>
  );
}
