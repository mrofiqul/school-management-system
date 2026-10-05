import { PrismaClient, Role, SchoolStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'ChangeMe123!';
// Overridable via env so this script stays a zero-config, one-command local
// dev seed (`npm run prisma:seed`) while still being safe to run once against
// a real production database — see backend/README.md, "Deploying to Render".
const superAdminPasswordPlain = process.env.SEED_SUPER_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
const schoolAdminPasswordPlain = process.env.SEED_SCHOOL_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

async function main() {
  if (
    process.env.NODE_ENV === 'production' &&
    (superAdminPasswordPlain === DEFAULT_PASSWORD || schoolAdminPasswordPlain === DEFAULT_PASSWORD)
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING: seeding a production database with the well-known default password. ' +
        'Set SEED_SUPER_ADMIN_PASSWORD / SEED_SCHOOL_ADMIN_PASSWORD to override, or ' +
        'change the password immediately after this finishes.',
    );
  }

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

  const superAdminPassword = await bcrypt.hash(superAdminPasswordPlain, 12);
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

  const adminPassword = await bcrypt.hash(schoolAdminPasswordPlain, 12);
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
  console.log(`  Super Admin: owner@campus.app / ${superAdminPasswordPlain}`);
  // eslint-disable-next-line no-console
  console.log(`  School Admin: admin@scholarsacademy.test / ${schoolAdminPasswordPlain}`);
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
