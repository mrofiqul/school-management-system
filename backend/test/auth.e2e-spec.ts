import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';

// Seeded by prisma/seed.ts (run against the test DB in test/global-setup.ts).
const ADMIN_EMAIL = 'admin@scholarsacademy.test';
const ADMIN_PASSWORD = 'ChangeMe123!';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/login', () => {
    it('issues an access + refresh token pair for correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(201);

      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.accessToken.length).toBeGreaterThan(20);
      expect(res.body.refreshToken.length).toBeGreaterThan(20);
    });

    it('rejects a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an unknown email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'nobody@nowhere.test', password: ADMIN_PASSWORD })
        .expect(401);
    });
  });

  describe('GET /v1/auth/me', () => {
    it('rejects a request with no token', async () => {
      await request(app.getHttpServer()).get('/v1/auth/me').expect(401);
    });

    it("returns the logged-in user's own profile", async () => {
      const login = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(ADMIN_EMAIL);
      expect(res.body.data.role).toBe('ADMIN');
    });
  });

  describe('POST /v1/auth/refresh — rotation', () => {
    it('rotates on every use and rejects a replayed (already-rotated) token', async () => {
      const login = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(201);
      const rt1 = login.body.refreshToken;

      const refresh1 = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: rt1 })
        .expect(201);
      const rt2 = refresh1.body.refreshToken;
      expect(rt2).not.toBe(rt1);

      const refresh2 = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: rt2 })
        .expect(201);
      const rt3 = refresh2.body.refreshToken;

      // Replaying rt1 (already rotated past) must fail...
      await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: rt1 }).expect(401);

      // ...and, because that looks like token theft, it must also have
      // revoked rt3 — the newest, still-unused token in the same family.
      await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: rt3 }).expect(401);
    });

    it('rejects a garbage token', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(401);
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('revokes the token so it can no longer be refreshed', async () => {
      const login = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(201);
      const rt = login.body.refreshToken;

      await request(app.getHttpServer()).post('/v1/auth/logout').send({ refreshToken: rt }).expect(201);
      await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: rt }).expect(401);
    });

    it('is a no-op (not a 500) for a token that was never valid', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .send({ refreshToken: 'garbage-token' })
        .expect(201);
    });
  });
});
