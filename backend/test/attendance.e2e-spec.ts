import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';
import { buildClassroomFixture, login } from './classroom-fixture';

const ADMIN_EMAIL = 'admin@scholarsacademy.test';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function createTimetableSlot(
  app: INestApplication,
  adminToken: string,
  sectionId: string,
  classSubjectId: string,
) {
  const res = await request(app.getHttpServer())
    .post(`/v1/sections/${sectionId}/timetable`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ classSubjectId, dayOfWeek: 'MON', startsAt: '09:00', endsAt: '09:45' })
    .expect(201);
  return res.body.data.id as string;
}

describe('Attendance (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    adminToken = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  it('a teacher marks bulk attendance, and an admin/teacher/the student themself can all read it back', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const slotId = await createTimetableSlot(app, adminToken, fx.sectionId, fx.classSubjectId);

    const marked = await request(app.getHttpServer())
      .post('/v1/attendance')
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({
        timetableSlotId: slotId,
        onDate: '2026-02-02',
        records: [{ studentId: fx.studentId, status: 'PRESENT' }],
      })
      .expect(201);
    expect(marked.body.data).toHaveLength(1);
    const recordId = marked.body.data[0].id as string;

    const asAdmin = await request(app.getHttpServer())
      .get(`/v1/attendance?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(asAdmin.body.data).toHaveLength(1);
    expect(asAdmin.body.data[0].status).toBe('PRESENT');

    const asStudent = await request(app.getHttpServer())
      .get(`/v1/attendance?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${fx.studentToken}`)
      .expect(200);
    expect(asStudent.body.data).toHaveLength(1);

    // Re-marking the same (student, slot, date) is an update, not a duplicate.
    await request(app.getHttpServer())
      .post('/v1/attendance')
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({
        timetableSlotId: slotId,
        onDate: '2026-02-02',
        records: [{ studentId: fx.studentId, status: 'LATE' }],
      })
      .expect(201);
    const afterRemark = await request(app.getHttpServer())
      .get(`/v1/attendance?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(afterRemark.body.data).toHaveLength(1);
    expect(afterRemark.body.data[0].status).toBe('LATE');

    const updated = await request(app.getHttpServer())
      .patch(`/v1/attendance/${recordId}`)
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({ status: 'ABSENT' })
      .expect(200);
    expect(updated.body.data.status).toBe('ABSENT');

    const summary = await request(app.getHttpServer())
      .get(`/v1/students/${fx.studentId}/attendance-summary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(summary.body.data.total).toBe(1);
    expect(summary.body.data.ABSENT).toBe(1);
    expect(summary.body.data.presentPercentage).toBe(0);
  });

  it('rejects marking a student who is not on that section\'s roster', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const slotId = await createTimetableSlot(app, adminToken, fx.sectionId, fx.classSubjectId);

    await request(app.getHttpServer())
      .post('/v1/attendance')
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({
        timetableSlotId: slotId,
        onDate: '2026-02-02',
        records: [{ studentId: randomUUID(), status: 'PRESENT' }],
      })
      .expect(400);
  });

  it('only a TEACHER may mark attendance — an ADMIN token on the same route is rejected', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const slotId = await createTimetableSlot(app, adminToken, fx.sectionId, fx.classSubjectId);

    await request(app.getHttpServer())
      .post('/v1/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        timetableSlotId: slotId,
        onDate: '2026-02-02',
        records: [{ studentId: fx.studentId, status: 'PRESENT' }],
      })
      .expect(403);
  });

  it('a student omitting studentId does not get every student\'s attendance back', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const slotId = await createTimetableSlot(app, adminToken, fx.sectionId, fx.classSubjectId);
    await request(app.getHttpServer())
      .post('/v1/attendance')
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({
        timetableSlotId: slotId,
        onDate: '2026-02-02',
        records: [{ studentId: fx.studentId, status: 'PRESENT' }],
      })
      .expect(201);

    // Without a studentId filter this used to return every student's
    // attendance records at the school — `studentId: undefined` is a no-op
    // in a Prisma where-clause, not "match nothing". See attendance.service.ts.
    await request(app.getHttpServer())
      .get('/v1/attendance')
      .set('Authorization', `Bearer ${fx.studentToken}`)
      .expect(400);

    const withOwnId = await request(app.getHttpServer())
      .get(`/v1/attendance?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${fx.studentToken}`)
      .expect(200);
    expect(withOwnId.body.data).toHaveLength(1);
  });

  it('a student can never read another student\'s attendance summary', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const intruderSuffix = randomUUID();
    const intruder = await request(app.getHttpServer())
      .post('/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Intruder Student',
        email: `intruder-${intruderSuffix}@fixture.example`,
        password: 'ChangeMe123!',
        dob: '2012-05-01',
        admissionNo: `ADM-${intruderSuffix}`,
      })
      .expect(201);
    const intruderToken = await login(app, `intruder-${intruderSuffix}@fixture.example`, 'ChangeMe123!');

    await request(app.getHttpServer())
      .get(`/v1/students/${fx.studentId}/attendance-summary`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .expect(403);
  });

  it("a parent must specify studentId, and can only ever read their own child's attendance", async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const slotId = await createTimetableSlot(app, adminToken, fx.sectionId, fx.classSubjectId);
    await request(app.getHttpServer())
      .post('/v1/attendance')
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({
        timetableSlotId: slotId,
        onDate: '2026-02-02',
        records: [{ studentId: fx.studentId, status: 'PRESENT' }],
      })
      .expect(201);

    const parentEmail = `parent-${fx.suffix}@fixture.example`;
    await request(app.getHttpServer())
      .post(`/v1/students/${fx.studentId}/guardians`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ relation: 'MOTHER', fullName: 'Test Parent', email: parentEmail, password: 'ChangeMe123!' })
      .expect(201);
    const parentToken = await login(app, parentEmail, 'ChangeMe123!');

    await request(app.getHttpServer())
      .get('/v1/attendance')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(400);

    const asParent = await request(app.getHttpServer())
      .get(`/v1/attendance?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(asParent.body.data).toHaveLength(1);

    const otherSuffix = randomUUID();
    const otherStudent = await request(app.getHttpServer())
      .post('/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Unrelated Student',
        email: `unrelated-${otherSuffix}@fixture.example`,
        password: 'ChangeMe123!',
        dob: '2012-05-01',
        admissionNo: `ADM-${otherSuffix}`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/v1/attendance?studentId=${otherStudent.body.data.userId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);
  });
});
