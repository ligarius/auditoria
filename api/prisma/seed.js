import { PrismaClient, ProjectWorkflowState } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(email, name, role, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

async function findOrCreateCompany(name, taxId) {
  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.company.create({ data: { name, taxId } });
}

async function main() {
  const nutrial = await findOrCreateCompany('Nutrial', '76.543.210-9');
  const democorp = await findOrCreateCompany('DemoCorp', '76.000.000-0');

  const admin = await upsertUser('admin@demo.com', 'Admin', 'admin', 'Cambiar123!');
  const consultor = await upsertUser('consultor@demo.com', 'Consultor', 'consultor', 'Cambiar123!');
  const cliente = await upsertUser('cliente@demo.com', 'Cliente', 'cliente', 'Cambiar123!');

  const nutrialProject = await prisma.project.upsert({
    where: {
      Project_companyId_name_key: {
        companyId: nutrial.id,
        name: 'Nutrial – Auditoría 2025',
      },
    },
    update: {},
    create: {
      companyId: nutrial.id,
      name: 'Nutrial – Auditoría 2025',
      status: ProjectWorkflowState.PLANNING,
      ownerId: admin.id,
      settings: { enabledFeatures: ['reception', 'picking', 'dispatch'] },
      memberships: {
        create: [
          { userId: admin.id, role: 'owner' },
          { userId: consultor.id, role: 'editor' },
          { userId: cliente.id, role: 'viewer' },
        ],
      },
    },
  });

  const categories = [
    { name: 'Finanzas', description: 'Estados financieros, presupuestos y proyecciones.' },
    { name: 'Operaciones', description: 'Procesos operativos, indicadores y documentación de control.' },
    { name: 'Tecnología', description: 'Inventario de sistemas, integraciones y seguridad.' },
  ];

  for (const category of categories) {
    await prisma.dataRequestCategory.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
  }

  const planningTaskId = 'seed-task-planning';
  const assessmentTaskId = 'seed-task-assessment';

  const planningTaskStart = new Date('2025-01-06T00:00:00.000Z');
  const planningTaskEnd = new Date('2025-01-17T00:00:00.000Z');
  const assessmentTaskStart = new Date('2025-01-20T00:00:00.000Z');
  const assessmentTaskEnd = new Date('2025-02-07T00:00:00.000Z');

  await prisma.projectTask.upsert({
    where: { id: planningTaskId },
    update: {
      name: 'Planificación de auditoría',
      description: 'Definir alcance, recursos y cronograma del proyecto.',
      owner: 'Admin',
      status: 'En progreso',
      progress: 60,
      startDate: planningTaskStart,
      endDate: planningTaskEnd,
      sortOrder: 1,
      projectId: nutrialProject.id,
    },
    create: {
      id: planningTaskId,
      projectId: nutrialProject.id,
      name: 'Planificación de auditoría',
      description: 'Definir alcance, recursos y cronograma del proyecto.',
      owner: 'Admin',
      status: 'En progreso',
      progress: 60,
      startDate: planningTaskStart,
      endDate: planningTaskEnd,
      sortOrder: 1,
    },
  });

  await prisma.projectTask.upsert({
    where: { id: assessmentTaskId },
    update: {
      name: 'Levantamiento y evaluación',
      description: 'Entrevistas, levantamiento documental y evaluación preliminar.',
      owner: 'Consultor',
      status: 'Planificado',
      progress: 0,
      startDate: assessmentTaskStart,
      endDate: assessmentTaskEnd,
      sortOrder: 2,
      parentId: planningTaskId,
      projectId: nutrialProject.id,
    },
    create: {
      id: assessmentTaskId,
      projectId: nutrialProject.id,
      parentId: planningTaskId,
      name: 'Levantamiento y evaluación',
      description: 'Entrevistas, levantamiento documental y evaluación preliminar.',
      owner: 'Consultor',
      status: 'Planificado',
      progress: 0,
      startDate: assessmentTaskStart,
      endDate: assessmentTaskEnd,
      sortOrder: 2,
    },
  });

  console.log('Seed OK', {
    companies: [nutrial.name, democorp.name],
    users: ['admin@demo.com', 'consultor@demo.com', 'cliente@demo.com'],
    dataRequestCategories: categories.map((category) => category.name),
    projectTasks: [planningTaskId, assessmentTaskId],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
