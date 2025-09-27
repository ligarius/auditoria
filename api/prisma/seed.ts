import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(email: string, name: string, role: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash },
  });
}

async function main() {
  // Empresas
  const nutrial = await prisma.company.upsert({
    where: { name: 'Nutrial' },
    update: { taxId: '76.543.210-9' },
    create: { name: 'Nutrial', taxId: '76.543.210-9' },
  });

  const democorp = await prisma.company.upsert({
    where: { name: 'DemoCorp' },
    update: {},
    create: { name: 'DemoCorp', taxId: '76.000.000-0' },
  });

  // Usuarios
  const admin = await upsertUser('admin@demo.com', 'Admin', 'admin', 'Cambiar123!');
  const consultor = await upsertUser('consultor@demo.com', 'Consultor', 'consultor', 'Cambiar123!');
  const cliente = await upsertUser('cliente@demo.com', 'Cliente', 'cliente', 'Cambiar123!');

  // Proyecto demo con features
  await prisma.project.upsert({
    where: { name: 'Nutrial – Auditoría 2025' },
    update: {},
    create: {
      name: 'Nutrial – Auditoría 2025',
      status: 'active',
      companyId: nutrial.id,
      ownerId: consultor.id,
      settings: { enabledFeatures: ['reception', 'picking', 'dispatch'] },
      memberships: {
        create: [
          { userId: consultor.id, role: 'owner' },
          { userId: admin.id, role: 'editor' },
          { userId: cliente.id, role: 'viewer' },
        ],
      },
    },
  });

  console.log('Seed ok:', { nutrial: nutrial.name, democorp: democorp.name, admin: admin.email });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
