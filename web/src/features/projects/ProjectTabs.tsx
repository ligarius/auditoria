import { FC } from 'react';

import PreKickoffTab from './tabs/PreKickoffTab';
import SummaryTab from './tabs/SummaryTab';
import ProjectPlanTab from './tabs/ProjectPlanTab';
import SystemsTab from './tabs/SystemsTab';
import SecurityTab from './tabs/SecurityTab';
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

export const ProjectTabs: {
  value: string;
  label: string;
  component: FC<TabComponentProps>;
}[] = [
  { value: 'summary', label: 'Resumen', component: SummaryTab },
  { value: 'prekickoff', label: 'Datos Pre-Kickoff', component: PreKickoffTab },
  { value: 'plan', label: 'Plan del Proyecto', component: ProjectPlanTab },
  { value: 'surveys', label: 'Encuestas', component: SurveysTab },
  { value: 'interviews', label: 'Entrevistas', component: InterviewsTab },
  { value: 'processes', label: 'Procesos', component: ProcessesTab },
  { value: 'systems', label: 'Sistemas', component: SystemsTab },
  { value: 'security', label: 'Seguridad', component: SecurityTab },
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
