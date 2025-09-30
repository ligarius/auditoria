import { EstadoProyecto } from '@prisma/client';
import type { EstadoProyecto as EstadoProyectoType } from '@prisma/client';

import { prisma } from '../../core/config/db.js';

const allowed: Record<EstadoProyectoType, EstadoProyectoType[]> = {
  PLANIFICACION: [EstadoProyecto.TRABAJO_CAMPO],
  TRABAJO_CAMPO: [EstadoProyecto.INFORME],
  INFORME: [EstadoProyecto.CIERRE],
  CIERRE: [],
};

export async function getWorkflow(projectId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new Error('Proyecto no encontrado');
  const current = p.status as EstadoProyectoType;
  return {
    projectId,
    estadoActual: current,
    permitidos: allowed[current],
    workflowDefinition: p.workflowDefinition ?? null,
    historial: [] // TODO: si guardas eventos, devuélvelos aquí
  };
}

export async function transition(projectId: string, next: EstadoProyectoType) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new Error('Proyecto no encontrado');
  const current = p.status as EstadoProyectoType;
  if (!allowed[current].includes(next)) {
    throw new Error(`Transición inválida: ${current} → ${next}`);
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { status: next }
  });
  return { ok: true, project: updated };
}
