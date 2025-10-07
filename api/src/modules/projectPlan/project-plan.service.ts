import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

export const projectPlanService = {
  async list(projectId: string) {
    return prisma.projectTask.findMany({
      where: { projectId },
      orderBy: [
        { sortOrder: 'asc' },
        { startDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });
  },

  async create(projectId: string, payload: any, userId: string) {
    const task = await prisma.projectTask.create({
      data: { ...payload, projectId }
    });
    await auditService.record(
      'ProjectTask',
      task.id,
      'CREATE',
      userId,
      projectId,
      null,
      task
    );
    return task;
  },

  async update(taskId: string, payload: any, userId: string) {
    const before = await prisma.projectTask.findUnique({
      where: { id: taskId }
    });
    if (!before) {
      throw new HttpError(404, 'Tarea no encontrada');
    }
    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: payload
    });
    await auditService.record(
      'ProjectTask',
      taskId,
      'UPDATE',
      userId,
      before.projectId,
      before,
      task
    );
    return task;
  },

  async remove(taskId: string, userId: string) {
    const before = await prisma.projectTask.findUnique({
      where: { id: taskId }
    });
    if (!before) {
      throw new HttpError(404, 'Tarea no encontrada');
    }

    await prisma.projectTask.updateMany({
      where: { parentId: taskId },
      data: { parentId: null }
    });

    await prisma.projectTask.delete({ where: { id: taskId } });
    await auditService.record(
      'ProjectTask',
      taskId,
      'DELETE',
      userId,
      before.projectId,
      before,
      null
    );
  }
};
