import { FC } from 'react';

import RisksTab from './tabs/RisksTab';
import FindingsTab from './tabs/FindingsTab';
import ProcessesTab from './tabs/ProcessesTab';

interface TabComponentProps {
  projectId: string;
}

const makeSection = (title: string, description: string): FC<TabComponentProps> =>
  function Section({ projectId }) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
        <p className="text-xs text-slate-400">Proyecto: {projectId}</p>
      </div>
    );
  };

export const ProjectTabs: { value: string; label: string; component: FC<TabComponentProps> }[] = [
  { value: 'prekickoff', label: 'Datos Pre-Kickoff', component: makeSection('Datos Pre-Kickoff', 'Checklist y solicitudes de datos clave previas al kickoff.') },
  { value: 'surveys', label: 'Encuestas', component: makeSection('Encuestas', 'Gestiona cuestionarios y respuestas.') },
  { value: 'interviews', label: 'Entrevistas', component: makeSection('Entrevistas', 'Registra entrevistas y evidencias de audio.') },
  { value: 'processes', label: 'Procesos', component: ProcessesTab },
  { value: 'systems', label: 'Sistemas', component: makeSection('Sistemas', 'Inventario, cobertura, integraciones y data.') },
  { value: 'security', label: 'Seguridad', component: makeSection('Seguridad', 'Postura, performance y costos/TCO.') },
  { value: 'risks', label: 'Riesgos', component: RisksTab },
  { value: 'findings', label: 'Hallazgos', component: FindingsTab },
  { value: 'poc', label: 'POC', component: makeSection('POC', 'Seguimiento de pilotos y DoD.') },
  { value: 'decisions', label: 'Decisiones', component: makeSection('Decision Log', 'Registro de decisiones clave y aprobadores.') },
  { value: 'kpis', label: 'KPIs', component: makeSection('KPIs', 'Seguimiento de indicadores y metas.') },
  { value: 'export', label: 'Exportar', component: makeSection('Exportar', 'Genera Excel y PDF ejecutivos.') }
];
