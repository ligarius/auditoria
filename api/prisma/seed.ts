// api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(email: string, name: string, role: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

async function findOrCreateCompany(name: string, taxId?: string) {
  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.company.create({ data: { name, taxId } });
}

async function main() {
  // Empresas
  const nutrial = await findOrCreateCompany('Nutrial', '76.543.210-9');
  const democorp = await findOrCreateCompany('DemoCorp', '76.000.000-0');

  // Usuarios
  const admin = await upsertUser('admin@demo.com', 'Admin', 'admin', 'Cambiar123!');
  const consultor = await upsertUser('consultor@demo.com', 'Consultor', 'consultor', 'Cambiar123!');
  const cliente = await upsertUser('cliente@demo.com', 'Cliente', 'cliente', 'Cambiar123!');

  // Proyecto demo con features
  await prisma.project.upsert({
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
      status: 'active',
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

  console.log('Seed OK', {
    companies: [nutrial.name, democorp.name],
    users: ['admin@demo.com', 'consultor@demo.com', 'cliente@demo.com']
  });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
