// api/prisma/seed.ts
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

async function upsertCompanyByName(name: string, taxId?: string) {
  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: { taxId },
    });
  }
  return prisma.company.create({ data: { name, taxId } });
}

async function main() {
  // Empresas
  const nutrial = await upsertCompanyByName('Nutrial', '76.543.210-9');
  const democorp = await upsertCompanyByName('DemoCorp', '76.000.000-0');

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

  console.log('Seed OK', {
    companies: [nutrial.name, democorp.name],
    users: ['admin@demo.com', 'consultor@demo.com', 'cliente@demo.com']
  });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
