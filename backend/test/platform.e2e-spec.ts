import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';
import { login, onboardSchool, SEEDED_PLAN_ID } from './classroom-fixture';

const SUPER_ADMIN_EMAIL = 'owner@campus.app';
const SUPER_ADMIN_PASSWORD = 'ChangeMe123!';

describe('Platform (e2e)', () => {
  let app: INestApplication;
  let superAdminToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    superAdminToken = await login(app, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Plans', () => {
    it('lists the seeded plan and a newly created one', async () => {
      const tier = `Premium-${randomUUID()}`;
      await request(app.getHttpServer())
        .post('/v1/platform/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ tier, maxStudents: 1000, priceBdt: 9000, billingCycle: 'MONTHLY' })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get('/v1/platform/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      const tiers = list.body.data.map((p: { tier: string }) => p.tier);
      expect(tiers).toContain(tier);
      expect(list.body.data.map((p: { id: string }) => p.id)).toContain(SEEDED_PLAN_ID);
    });

    it('rejects an invalid billingCycle', async () => {
      await request(app.getHttpServer())
        .post('/v1/platform/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ tier: 'Bad', maxStudents: 100, priceBdt: 100, billingCycle: 'WEEKLY' })
        .expect(400);
    });

    it('only a Super Admin may list or create plans', async () => {
      const school = await onboardSchool(app, superAdminToken);

      await request(app.getHttpServer())
        .get('/v1/platform/plans')
        .set('Authorization', `Bearer ${school.adminToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/v1/platform/plans')
        .set('Authorization', `Bearer ${school.adminToken}`)
        .send({ tier: 'Should not create', maxStudents: 100, priceBdt: 100, billingCycle: 'MONTHLY' })
        .expect(403);
    });

    it('rejects a request with no token at all', async () => {
      await request(app.getHttpServer()).get('/v1/platform/plans').expect(401);
    });
  });

  describe('Schools', () => {
    it('onboards a school and its first Admin in one call, defaulting to TRIAL', async () => {
      const school = await onboardSchool(app, superAdminToken);

      const found = await request(app.getHttpServer())
        .get(`/v1/platform/schools/${school.schoolId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(found.body.data.status).toBe('TRIAL');
      expect(found.body.data.plan.id).toBe(SEEDED_PLAN_ID);

      // The Admin created alongside it can already log in and use the API.
      const me = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${school.adminToken}`)
        .expect(200);
      expect(me.body.data.email).toBe(school.adminEmail);
      expect(me.body.data.role).toBe('ADMIN');
    });

    it('returns 404, not a raw 500, for a school id that does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/v1/platform/schools/${randomUUID()}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/v1/platform/schools/${randomUUID()}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'SUSPENDED' })
        .expect(404);
    });

    it('the status filter narrows the list correctly', async () => {
      const school = await onboardSchool(app, superAdminToken);
      await request(app.getHttpServer())
        .patch(`/v1/platform/schools/${school.schoolId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'SUSPENDED' })
        .expect(200);

      const suspended = await request(app.getHttpServer())
        .get('/v1/platform/schools?status=SUSPENDED')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(suspended.body.data.map((s: { id: string }) => s.id)).toContain(school.schoolId);

      const active = await request(app.getHttpServer())
        .get('/v1/platform/schools?status=ACTIVE')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(active.body.data.map((s: { id: string }) => s.id)).not.toContain(school.schoolId);
    });

    it('only a Super Admin may reach any /platform/schools route', async () => {
      const school = await onboardSchool(app, superAdminToken);

      await request(app.getHttpServer())
        .get('/v1/platform/schools')
        .set('Authorization', `Bearer ${school.adminToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/v1/platform/schools/${school.schoolId}`)
        .set('Authorization', `Bearer ${school.adminToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .post('/v1/platform/schools')
        .set('Authorization', `Bearer ${school.adminToken}`)
        .send({
          name: 'Should not create',
          planId: SEEDED_PLAN_ID,
          adminName: 'x',
          adminEmail: `wont-${randomUUID()}@fixture.example`,
          adminPassword: 'ChangeMe123!',
        })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/v1/platform/schools/${school.schoolId}`)
        .set('Authorization', `Bearer ${school.adminToken}`)
        .send({ status: 'SUSPENDED' })
        .expect(403);
    });
  });

  /**
   * Before this test existed, suspending a school was purely cosmetic:
   * nothing in the auth flow ever checked School.status, so a suspended
   * school's own Admin (and every other user there) could still log in
   * and use the API without limit. See backend/README.md's bug log — the
   * fix made School.status actually gate login/refresh, same as
   * User.status already did.
   */
  it("suspending a school blocks its users' login and token refresh — reactivating restores both", async () => {
    const school = await onboardSchool(app, superAdminToken);
    const preSuspendRefresh = (
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: school.adminEmail, password: 'ChangeMe123!' })
        .expect(201)
    ).body.refreshToken;

    await request(app.getHttpServer())
      .patch(`/v1/platform/schools/${school.schoolId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: school.adminEmail, password: 'ChangeMe123!' })
      .expect(401);

    // A refresh token issued *before* the suspension must stop working too —
    // not just new login attempts.
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: preSuspendRefresh })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/v1/platform/schools/${school.schoolId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: school.adminEmail, password: 'ChangeMe123!' })
      .expect(201);
  });

  it("a Super Admin's own login never depends on any school (they have none)", async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
      .expect(201);
  });
});
