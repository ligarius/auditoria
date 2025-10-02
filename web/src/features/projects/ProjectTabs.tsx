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
import WorkflowTab from './tabs/WorkflowTab';
import GovernanceTab from './tabs/GovernanceTab';
import InventoryTab from '../inventory/InventoryTab';

interface TabComponentProps {
  projectId: string;
}

const makeSection = (title: string, description: string): FC<TabComponentProps> => {
  const Section: FC<TabComponentProps> = () => (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );

  return Section;
};

export const ProjectTabs: {
  value: string;
  label: string;
  component: FC<TabComponentProps>;
}[] = [
  { value: 'summary', label: 'Resumen', component: SummaryTab },
  { value: 'workflow', label: 'Workflow', component: WorkflowTab },
  { value: 'prekickoff', label: 'Datos Pre-Kickoff', component: PreKickoffTab },
  { value: 'plan', label: 'Plan del Proyecto', component: ProjectPlanTab },
  { value: 'surveys', label: 'Encuestas', component: SurveysTab },
  { value: 'interviews', label: 'Entrevistas', component: InterviewsTab },
  { value: 'processes', label: 'Procesos', component: ProcessesTab },
  { value: 'systems', label: 'Sistemas', component: SystemsTab },
  { value: 'inventory', label: 'Maestro & Etiquetas', component: InventoryTab },
  { value: 'security', label: 'Seguridad', component: SecurityTab },
  { value: 'risks', label: 'Riesgos', component: RisksTab },
  { value: 'findings', label: 'Hallazgos', component: FindingsTab },
  { value: 'poc', label: 'POC', component: POCTab },
  { value: 'governance', label: 'Gobernanza', component: GovernanceTab },
  { value: 'decisions', label: 'Decisiones', component: DecisionsTab },
  { value: 'kpis', label: 'KPIs', component: KpisTab },
  {
    value: 'export',
    label: 'Exportar',
    component: makeSection('Exportar', 'Genera Excel y PDF ejecutivos.'),
  },
];
