import { ProjectWorkflowState } from '@prisma/client';
import type { ProjectWorkflowState as ProjectWorkflowStateType } from '@prisma/client';

import { prisma } from '../../core/config/db';

const allowed: Record<ProjectWorkflowStateType, ProjectWorkflowStateType[]> = {
  planificacion: [ProjectWorkflowState.recoleccion_datos],
  recoleccion_datos: [ProjectWorkflowState.analisis],
  analisis: [ProjectWorkflowState.recomendaciones],
  recomendaciones: [ProjectWorkflowState.cierre],
  cierre: []
};

export async function getWorkflow(projectId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new Error('Proyecto no encontrado');
  const current = p.status as ProjectWorkflowStateType;
  return {
    projectId,
    estadoActual: current,
    permitidos: allowed[current],
    workflowDefinition: p.workflowDefinition ?? null,
    historial: [] // TODO: si guardas eventos, devuélvelos aquí
  };
}

export async function transition(
  projectId: string,
  next: ProjectWorkflowStateType
) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new Error('Proyecto no encontrado');
  const current = p.status as ProjectWorkflowStateType;
  if (!allowed[current].includes(next)) {
    throw new Error(`Transición inválida: ${current} → ${next}`);
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { status: next }
  });
  return { ok: true, project: updated };
}
