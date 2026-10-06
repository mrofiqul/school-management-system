import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';
import { buildClassroomFixture, login } from './classroom-fixture';

const ADMIN_EMAIL = 'admin@scholarsacademy.test';
const ADMIN_PASSWORD = 'ChangeMe123!';

/**
 * Regression coverage for the timetable conflict-detection gap flagged
 * since Round 2 (backend/README.md): TimetableService.create() used to
 * happily create overlapping slots for the same section, or double-book
 * a teacher across two different sections at the same time.
 */
describe('Timetable conflict detection (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    adminToken = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a slot, and a non-overlapping slot on the same day coexists fine', async () => {
    const fx = await buildClassroomFixture(app, adminToken);

    await request(app.getHttpServer())
      .post(`/v1/sections/${fx.sectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classSubjectId: fx.classSubjectId, dayOfWeek: 'MON', startsAt: '09:00', endsAt: '09:45' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/sections/${fx.sectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classSubjectId: fx.classSubjectId, dayOfWeek: 'MON', startsAt: '09:45', endsAt: '10:30' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/v1/sections/${fx.sectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.data).toHaveLength(2);
  });

  it('rejects an overlapping slot for the same section', async () => {
    const fx = await buildClassroomFixture(app, adminToken);

    await request(app.getHttpServer())
      .post(`/v1/sections/${fx.sectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classSubjectId: fx.classSubjectId, dayOfWeek: 'TUE', startsAt: '09:00', endsAt: '09:45' })
      .expect(201);

    // Starts mid-way through the existing slot — a real overlap, not a touch.
    await request(app.getHttpServer())
      .post(`/v1/sections/${fx.sectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classSubjectId: fx.classSubjectId, dayOfWeek: 'TUE', startsAt: '09:30', endsAt: '10:15' })
      .expect(409);

    // A different day at the same time is unaffected.
    await request(app.getHttpServer())
      .post(`/v1/sections/${fx.sectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classSubjectId: fx.classSubjectId, dayOfWeek: 'WED', startsAt: '09:00', endsAt: '09:45' })
      .expect(201);
  });

  it('rejects double-booking the same teacher across two different sections', async () => {
    const fx = await buildClassroomFixture(app, adminToken);

    const secondSection = await request(app.getHttpServer())
      .post(`/v1/classes/${fx.classId}/sections`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'B' })
      .expect(201);
    const secondSectionId = secondSection.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/v1/sections/${fx.sectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classSubjectId: fx.classSubjectId, dayOfWeek: 'THU', startsAt: '11:00', endsAt: '11:45' })
      .expect(201);

    // Same teacher (fx.classSubjectId -> fx.teacherId), different section,
    // overlapping time — the teacher can't be in two rooms at once.
    await request(app.getHttpServer())
      .post(`/v1/sections/${secondSectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classSubjectId: fx.classSubjectId, dayOfWeek: 'THU', startsAt: '11:15', endsAt: '12:00' })
      .expect(409);
  });

  it('rejects endsAt at or before startsAt', async () => {
    const fx = await buildClassroomFixture(app, adminToken);

    await request(app.getHttpServer())
      .post(`/v1/sections/${fx.sectionId}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classSubjectId: fx.classSubjectId, dayOfWeek: 'FRI', startsAt: '10:00', endsAt: '09:00' })
      .expect(400);
  });
});
