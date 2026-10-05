import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';
import { login, onboardSchool } from './classroom-fixture';

// Seeded by prisma/seed.ts.
const SUPER_ADMIN_EMAIL = 'owner@campus.app';
const SUPER_ADMIN_PASSWORD = 'ChangeMe123!';

async function createClass(app: INestApplication, adminToken: string, className: string) {
  const year = await request(app.getHttpServer())
    .post('/v1/academic-years')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ label: '2026-2027', startsOn: '2026-01-01', endsOn: '2026-12-31' })
    .expect(201);

  const klass = await request(app.getHttpServer())
    .post('/v1/classes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ academicYearId: year.body.data.id, name: className })
    .expect(201);

  return klass.body.data.id as string;
}

/**
 * The guarantee the whole multi-tenant architecture rests on (see
 * backend/README.md): a school's Admin can never see another school's
 * data, even though every request hits the same tables through the same
 * endpoints. This has broken before in subtle ways — see the Round 1 bug
 * log entry about StudentsService silently filtering through an optional
 * relation — so this is tested against two real, independently-onboarded
 * schools rather than assumed from the query code.
 */
describe('Multi-tenant isolation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("a school's admin sees only their own classes, never another school's", async () => {
    const superAdminToken = await login(app, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);

    const schoolA = await onboardSchool(app, superAdminToken);
    const schoolB = await onboardSchool(app, superAdminToken);

    const classAName = `Class A-${schoolA.suffix}`;
    const classBName = `Class B-${schoolB.suffix}`;
    await createClass(app, schoolA.adminToken, classAName);
    await createClass(app, schoolB.adminToken, classBName);

    const classesForA = await request(app.getHttpServer())
      .get('/v1/classes')
      .set('Authorization', `Bearer ${schoolA.adminToken}`)
      .expect(200);
    const namesForA = classesForA.body.data.map((c: { name: string }) => c.name);
    expect(namesForA).toContain(classAName);
    expect(namesForA).not.toContain(classBName);

    const classesForB = await request(app.getHttpServer())
      .get('/v1/classes')
      .set('Authorization', `Bearer ${schoolB.adminToken}`)
      .expect(200);
    const namesForB = classesForB.body.data.map((c: { name: string }) => c.name);
    expect(namesForB).toContain(classBName);
    expect(namesForB).not.toContain(classAName);
  });

  it("a school admin's token is rejected on Super-Admin-only platform routes", async () => {
    const superAdminToken = await login(app, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    const school = await onboardSchool(app, superAdminToken);

    await request(app.getHttpServer())
      .get('/v1/platform/schools')
      .set('Authorization', `Bearer ${school.adminToken}`)
      .expect(403);
  });
});
