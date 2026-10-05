import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';

// Seeded by prisma/seed.ts.
const ADMIN_EMAIL = 'admin@scholarsacademy.test';
const ADMIN_PASSWORD = 'ChangeMe123!';

/**
 * Regression test for the Round 1 bug (backend/README.md): StudentsService
 * once scoped its query through the optional `section` relation
 * (`section: { id: sectionId, ... }`), which Prisma treats the same way an
 * inner join treats a null foreign key — silently dropping every student
 * with no section yet. That's every student right after admission, so the
 * bug looked like "no students yet" in a demo. Scoping through the
 * required `user.schoolId` instead fixed it; this test exists so a future
 * refactor can't quietly bring the old behavior back.
 */
describe('Students — unsectioned students stay visible (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('a newly admitted student with no section appears in the unfiltered list', async () => {
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(201);
    const adminToken = login.body.accessToken;

    const suffix = randomUUID();
    const admit = await request(app.getHttpServer())
      .post('/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Unsectioned Test Student',
        email: `student-${suffix}@isolation-test.example`,
        password: 'ChangeMe123!',
        dob: '2012-05-01',
        admissionNo: `TEST-${suffix}`,
        // sectionId deliberately omitted
      })
      .expect(201);

    expect(admit.body.data.sectionId ?? null).toBeNull();

    const list = await request(app.getHttpServer())
      .get('/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const userIds = list.body.data.map((s: { userId: string }) => s.userId);
    expect(userIds).toContain(admit.body.data.userId);
  });
});
