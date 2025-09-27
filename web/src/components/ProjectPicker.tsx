import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import api from '../lib/api';

interface ProjectOption {
  id: string;
  name: string;
}

interface ProjectPickerProps {
  refreshKey?: number;
}

export default function ProjectPicker({ refreshKey = 0 }: ProjectPickerProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [items, setItems] = useState<ProjectOption[]>([]);

  useEffect(() => {
    api.get('/projects').then((r) => {
      setItems(r.data || []);
    });
  }, [refreshKey]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = event.target.value;
    if (!projectId) return;
    localStorage.setItem('lastProjectId', projectId);
    navigate(`/projects/${projectId}`);
  };

  return (
    <select
      className="border rounded px-2 py-1"
      value={id || ''}
      onChange={handleChange}
    >
      {!id && <option value="">Selecciona un proyecto</option>}
      {items.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
}
