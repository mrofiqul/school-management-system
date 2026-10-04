import { PrismaClient, Role, SchoolStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: '11111111-1111-4111-8111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-4111-8111-111111111111',
      tier: 'Basic',
      maxStudents: 400,
      priceBdt: 3500,
      billingCycle: 'MONTHLY',
    },
  });

  const superAdminPassword = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({
    where: { email: 'owner@campus.app' },
    update: {},
    create: {
      fullName: 'Platform Owner',
      email: 'owner@campus.app',
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      schoolId: null,
    },
  });

  const school = await prisma.school.upsert({
    where: { id: '22222222-2222-4222-8222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-4222-8222-222222222222',
      name: "Scholars' Academy",
      district: 'Dhaka',
      planId: plan.id,
      status: SchoolStatus.ACTIVE,
    },
  });

  const adminPassword = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@scholarsacademy.test' },
    update: {},
    create: {
      fullName: 'Nasrin Akter',
      email: 'admin@scholarsacademy.test',
      password: adminPassword,
      role: Role.ADMIN,
      schoolId: school.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
  // eslint-disable-next-line no-console
  console.log('  Super Admin: owner@campus.app / ChangeMe123!');
  // eslint-disable-next-line no-console
  console.log('  School Admin: admin@scholarsacademy.test / ChangeMe123!');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
