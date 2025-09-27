import { FC } from 'react';

import PreKickoffTab from './tabs/PreKickoffTab';
import SurveysTab from './tabs/SurveysTab';
import InterviewsTab from './tabs/InterviewsTab';
import ProcessesTab from './tabs/ProcessesTab';
import POCTab from './tabs/POCTab';
import DecisionsTab from './tabs/DecisionsTab';
import KpisTab from './tabs/KpisTab';
import RisksTab from './tabs/RisksTab';
import FindingsTab from './tabs/FindingsTab';

interface TabComponentProps {
  projectId: string;
}

const makeSection = (
  title: string,
  description: string
): FC<TabComponentProps> =>
  function Section({ projectId }) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
        <p className="text-xs text-slate-400">Proyecto: {projectId}</p>
      </div>
    );
  };

export const ProjectTabs: {
  value: string;
  label: string;
  component: FC<TabComponentProps>;
}[] = [
  { value: 'prekickoff', label: 'Datos Pre-Kickoff', component: PreKickoffTab },
  { value: 'surveys', label: 'Encuestas', component: SurveysTab },
  { value: 'interviews', label: 'Entrevistas', component: InterviewsTab },
  { value: 'processes', label: 'Procesos', component: ProcessesTab },
  {
    value: 'systems',
    label: 'Sistemas',
    component: makeSection(
      'Sistemas',
      'Inventario, cobertura, integraciones y data.'
    ),
  },
  {
    value: 'security',
    label: 'Seguridad',
    component: makeSection('Seguridad', 'Postura, performance y costos/TCO.'),
  },
  { value: 'risks', label: 'Riesgos', component: RisksTab },
  { value: 'findings', label: 'Hallazgos', component: FindingsTab },
  { value: 'poc', label: 'POC', component: POCTab },
  { value: 'decisions', label: 'Decisiones', component: DecisionsTab },
  { value: 'kpis', label: 'KPIs', component: KpisTab },
  {
    value: 'export',
    label: 'Exportar',
    component: makeSection('Exportar', 'Genera Excel y PDF ejecutivos.'),
  },
];
