import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';
import { buildClassroomFixture, linkParent, login } from './classroom-fixture';

const ADMIN_EMAIL = 'admin@scholarsacademy.test';
const ADMIN_PASSWORD = 'ChangeMe123!';

describe('Communication (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    adminToken = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Notices', () => {
    it('ALL scope reaches everyone; CLASS/SECTION/ROLE scope reaches only who they target', async () => {
      const fx = await buildClassroomFixture(app, adminToken);
      const suffix = fx.suffix;

      const titleAll = `All-school notice ${suffix}`;
      const titleClass = `Class notice ${suffix}`;
      const titleSection = `Section notice ${suffix}`;
      const titleRoleTeacher = `Teacher-only notice ${suffix}`;

      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: titleAll, body: 'Reaches everyone', audienceScope: 'ALL' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: titleClass, body: 'For this class', audienceScope: 'CLASS', targetClassId: fx.classId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: titleSection,
          body: 'For this section',
          audienceScope: 'SECTION',
          targetSectionId: fx.sectionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: titleRoleTeacher, body: 'For teachers', audienceScope: 'ROLE', targetRole: 'TEACHER' })
        .expect(201);

      // The student in this fixture's own class+section sees ALL, CLASS, and
      // SECTION notices meant for them, but not a notice targeted at a
      // different role.
      const studentView = await request(app.getHttpServer())
        .get('/v1/notices')
        .set('Authorization', `Bearer ${fx.studentToken}`)
        .expect(200);
      const studentTitles = studentView.body.data.map((n: { title: string }) => n.title);
      expect(studentTitles).toEqual(expect.arrayContaining([titleAll, titleClass, titleSection]));
      expect(studentTitles).not.toContain(titleRoleTeacher);

      // The teacher sees every notice at the school (staff see everything),
      // including the TEACHER-scoped one.
      const teacherView = await request(app.getHttpServer())
        .get('/v1/notices')
        .set('Authorization', `Bearer ${fx.teacherToken}`)
        .expect(200);
      const teacherTitles = teacherView.body.data.map((n: { title: string }) => n.title);
      expect(teacherTitles).toEqual(
        expect.arrayContaining([titleAll, titleClass, titleSection, titleRoleTeacher]),
      );

      // A student in a *different* class/section never sees this fixture's
      // CLASS/SECTION-targeted notices, even though they still see ALL.
      const otherFx = await buildClassroomFixture(app, adminToken);
      const otherStudentView = await request(app.getHttpServer())
        .get('/v1/notices')
        .set('Authorization', `Bearer ${otherFx.studentToken}`)
        .expect(200);
      const otherTitles = otherStudentView.body.data.map((n: { title: string }) => n.title);
      expect(otherTitles).toContain(titleAll);
      expect(otherTitles).not.toContain(titleClass);
      expect(otherTitles).not.toContain(titleSection);
    });

    it("a parent sees notices scoped to their linked child's class/section, not an unrelated child's", async () => {
      const fx = await buildClassroomFixture(app, adminToken);
      const { parentToken } = await linkParent(app, adminToken, fx.studentId);

      const titleClass = `Parent-visible class notice ${fx.suffix}`;
      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: titleClass, body: 'For this class', audienceScope: 'CLASS', targetClassId: fx.classId })
        .expect(201);

      const asParentForChild = await request(app.getHttpServer())
        .get(`/v1/notices?studentId=${fx.studentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(asParentForChild.body.data.map((n: { title: string }) => n.title)).toContain(titleClass);

      const otherFx = await buildClassroomFixture(app, adminToken);
      await request(app.getHttpServer())
        .get(`/v1/notices?studentId=${otherFx.studentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });

    it('validates CLASS/SECTION/ROLE scope requires its matching target field', async () => {
      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad', body: 'Missing targetClassId', audienceScope: 'CLASS' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad', body: 'Missing targetSectionId', audienceScope: 'SECTION' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad', body: 'Missing targetRole', audienceScope: 'ROLE' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad', body: 'Class from nowhere', audienceScope: 'CLASS', targetClassId: randomUUID() })
        .expect(404);
    });

    it('only an ADMIN or TEACHER may post a notice — a STUDENT token is rejected', async () => {
      const fx = await buildClassroomFixture(app, adminToken);
      await request(app.getHttpServer())
        .post('/v1/notices')
        .set('Authorization', `Bearer ${fx.studentToken}`)
        .send({ title: 'Should not post', body: 'nope', audienceScope: 'ALL' })
        .expect(403);
    });
  });

  describe('Messages', () => {
    it('a teacher and a parent can message each other, and a thread filter narrows to just the two of them', async () => {
      const fx = await buildClassroomFixture(app, adminToken);
      const { parentId, parentToken } = await linkParent(app, adminToken, fx.studentId);

      await request(app.getHttpServer())
        .post('/v1/messages')
        .set('Authorization', `Bearer ${fx.teacherToken}`)
        .send({ recipientId: parentId, body: 'How is the student doing?' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/v1/messages')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ recipientId: fx.teacherId, body: 'Doing well, thanks!' })
        .expect(201);

      const teacherThread = await request(app.getHttpServer())
        .get(`/v1/messages?with=${parentId}`)
        .set('Authorization', `Bearer ${fx.teacherToken}`)
        .expect(200);
      expect(teacherThread.body.data).toHaveLength(2);

      const parentThread = await request(app.getHttpServer())
        .get(`/v1/messages?with=${fx.teacherId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(parentThread.body.data).toHaveLength(2);
    });

    it('rejects a recipient from another school', async () => {
      const fx = await buildClassroomFixture(app, adminToken);

      const otherSuperAdmin = await login(app, 'owner@campus.app', 'ChangeMe123!');
      const otherSuffix = randomUUID();
      await request(app.getHttpServer())
        .post('/v1/platform/schools')
        .set('Authorization', `Bearer ${otherSuperAdmin}`)
        .send({
          name: `Other School ${otherSuffix}`,
          planId: '11111111-1111-4111-8111-111111111111',
          adminName: 'Other Admin',
          adminEmail: `other-admin-${otherSuffix}@fixture.example`,
          adminPassword: 'ChangeMe123!',
        })
        .expect(201);
      const otherAdminToken = await login(app, `other-admin-${otherSuffix}@fixture.example`, 'ChangeMe123!');
      const otherFx = await buildClassroomFixture(app, otherAdminToken);

      await request(app.getHttpServer())
        .post('/v1/messages')
        .set('Authorization', `Bearer ${fx.teacherToken}`)
        .send({ recipientId: otherFx.teacherId, body: 'Cross-school message attempt' })
        .expect(400);
    });

    it('only a TEACHER or PARENT may send a message — a STUDENT token is rejected', async () => {
      const fx = await buildClassroomFixture(app, adminToken);
      const { parentId } = await linkParent(app, adminToken, fx.studentId);

      await request(app.getHttpServer())
        .post('/v1/messages')
        .set('Authorization', `Bearer ${fx.studentToken}`)
        .send({ recipientId: parentId, body: 'Should not send' })
        .expect(403);
    });
  });

  describe('Notifications', () => {
    it("returns 200 with the caller's own (empty) log", async () => {
      const fx = await buildClassroomFixture(app, adminToken);
      const res = await request(app.getHttpServer())
        .get('/v1/notifications')
        .set('Authorization', `Bearer ${fx.teacherToken}`)
        .expect(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
