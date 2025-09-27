import 'dotenv/config';
import { prisma } from '../src/core/config/db.js';
import { hashPassword } from '../src/core/utils/password.js';

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.file.deleteMany();
  await prisma.kPI.deleteMany();
  await prisma.decisionLog.deleteMany();
  await prisma.pOCItem.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.reception.deleteMany();
  await prisma.costLicensing.deleteMany();
  await prisma.performance.deleteMany();
  await prisma.securityPosture.deleteMany();
  await prisma.dataModelQuality.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.processCoverage.deleteMany();
  await prisma.systemInventory.deleteMany();
  await prisma.processAsset.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.surveyAnswer.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.surveyQuestion.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.dataRequestItem.deleteMany();
  await prisma.project.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await hashPassword('admin123');
  const consultantPassword = await hashPassword('consultor123');

  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin@nustrial.com', role: 'admin', passwordHash: adminPassword }
  });
  const consultant = await prisma.user.create({
    data: { name: 'Consultor Demo', email: 'consultor@nustrial.com', role: 'consultor', passwordHash: consultantPassword }
  });

  const company = await prisma.company.create({ data: { name: 'Nutrial' } });

  const project = await prisma.project.create({
    data: {
      name: 'Nutrial – Auditoría 2025',
      status: 'En progreso',
      companyId: company.id,
      startDate: new Date(),
      settings: { enabledFeatures: ['reception', 'picking', 'dispatch'] }
    }
  });

  const simplifiedProject = await prisma.project.create({
    data: {
      name: 'Nutrial – Diagnóstico Express',
      status: 'Planificado',
      companyId: company.id,
      startDate: new Date(),
      settings: { enabledFeatures: [] }
    }
  });

  await prisma.membership.createMany({
    data: [
      { userId: admin.id, projectId: project.id, role: 'Admin' },
      { userId: consultant.id, projectId: project.id, role: 'ConsultorLider' },
      { userId: admin.id, projectId: simplifiedProject.id, role: 'Admin' },
      { userId: consultant.id, projectId: simplifiedProject.id, role: 'ConsultorLider' }
    ]
  });

  await prisma.dataRequestItem.createMany({
    data: Array.from({ length: 10 }).map((_, index) => ({
      projectId: project.id,
      category: index % 2 === 0 ? 'Finanzas' : 'Operaciones',
      title: `Solicitud ${index + 1}`,
      description: 'Detalle requerido',
      status: index % 3 === 0 ? 'Received' : 'Pending',
      ownerName: 'Sponsor PM',
      required: true
    }))
  });

  const survey = await prisma.survey.create({
    data: {
      projectId: project.id,
      title: 'Encuesta de Madurez',
      description: 'Evaluación de percepción',
      questions: {
        create: Array.from({ length: 10 }).map((_, index) => ({
          type: index % 2 === 0 ? 'Likert' : 'Open',
          text: `Pregunta ${index + 1}`,
          scaleMin: 1,
          scaleMax: 5
        }))
      }
    },
    include: { questions: true }
  });

  await prisma.surveyResponse.create({
    data: {
      surveyId: survey.id,
      respondent: 'Sponsor',
      answers: {
        create: survey.questions.map((question) => ({
          questionId: question.id,
          valueNumber: question.type === 'Likert' ? 4 : null,
          valueText: question.type === 'Open' ? 'Respuesta' : null
        }))
      }
    }
  });

  await prisma.interview.createMany({
    data: [
      { projectId: project.id, personName: 'Operaciones', role: 'Jefe', area: 'Logística' },
      { projectId: project.id, personName: 'TI', role: 'Líder', area: 'Sistemas' },
      { projectId: project.id, personName: 'Finanzas', role: 'Analista', area: 'Finanzas' }
    ]
  });

  await prisma.systemInventory.createMany({
    data: Array.from({ length: 5 }).map((_, index) => ({
      projectId: project.id,
      systemName: `Sistema ${index + 1}`,
      type: 'ERP',
      ownerArea: 'TI',
      usersActive: 50 + index * 10,
      criticality: 'Alta'
    }))
  });

  await prisma.risk.createMany({
    data: Array.from({ length: 8 }).map((_, index) => ({
      projectId: project.id,
      category: 'Operacional',
      description: `Riesgo ${index + 1}`,
      probability: 3,
      impact: index % 4 + 1,
      severity: 3 * (index % 4 + 1),
      rag: index % 3 === 0 ? 'Rojo' : 'Ámbar'
    }))
  });

  await prisma.finding.createMany({
    data: Array.from({ length: 12 }).map((_, index) => ({
      projectId: project.id,
      title: `Hallazgo ${index + 1}`,
      impact: 'Alto',
      recommendation: 'Implementar mejora',
      quickWin: index % 2 === 0,
      effortDays: 5,
      responsibleR: 'ConsultorLider',
      accountableA: 'Sponsor',
      status: index % 3 === 0 ? 'En progreso' : 'Open'
    }))
  });

  await prisma.reception.createMany({
    data: Array.from({ length: 5 }).map((_, index) => ({
      projectId: project.id,
      date: new Date(),
      truckPlate: `ABC-${index}23`,
      carrier: 'Logística SA',
      tArriveGate: new Date(Date.now() - 60 * 60 * 1000),
      tUnloadStart: new Date(Date.now() - 45 * 60 * 1000),
      tUnloadEnd: new Date(Date.now() - 20 * 60 * 1000),
      tExit: new Date(),
      docsOk: true
    }))
  });

  await prisma.kPI.createMany({
    data: Array.from({ length: 6 }).map((_, index) => ({
      projectId: project.id,
      name: `KPI ${index + 1}`,
      value: 70 + index * 2,
      unit: '%',
      date: new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000)
    }))
  });

  console.info('Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
