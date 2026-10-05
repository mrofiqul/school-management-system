import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';
import { buildClassroomFixture, ClassroomFixture, login } from './classroom-fixture';

const ADMIN_EMAIL = 'admin@scholarsacademy.test';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function createExam(app: INestApplication, adminToken: string, academicYearId: string) {
  const res = await request(app.getHttpServer())
    .post('/v1/exams')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      academicYearId,
      name: `Term Test ${randomUUID()}`,
      examType: 'TERM',
      startsOn: '2026-06-01',
      endsOn: '2026-06-10',
    })
    .expect(201);
  return res.body.data.id as string;
}

async function createSchedule(
  app: INestApplication,
  adminToken: string,
  examId: string,
  fx: ClassroomFixture,
  maxMarks = 100,
) {
  const res = await request(app.getHttpServer())
    .post(`/v1/exams/${examId}/schedules`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ classId: fx.classId, subjectId: fx.subjectId, heldOn: '2026-06-03', maxMarks })
    .expect(201);
  return res.body.data.id as string;
}

describe('Exams, marks & report cards (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    adminToken = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  it('full chain: schedule an exam, a teacher enters marks, and the report card computes a percentage', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const examId = await createExam(app, adminToken, fx.academicYearId);
    const scheduleId = await createSchedule(app, adminToken, examId, fx, 100);

    const mine = await request(app.getHttpServer())
      .get('/v1/exam-schedules/mine')
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .expect(200);
    expect(mine.body.data.map((s: { id: string }) => s.id)).toContain(scheduleId);

    await request(app.getHttpServer())
      .post(`/v1/exam-schedules/${scheduleId}/marks`)
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({ records: [{ studentId: fx.studentId, marksObtained: 85, gradeLetter: 'A' }] })
      .expect(201);

    const marks = await request(app.getHttpServer())
      .get(`/v1/exam-schedules/${scheduleId}/marks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(marks.body.data).toHaveLength(1);
    expect(Number(marks.body.data[0].marksObtained)).toBe(85);

    // Re-entering marks for the same (schedule, student) updates, not duplicates.
    await request(app.getHttpServer())
      .post(`/v1/exam-schedules/${scheduleId}/marks`)
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({ records: [{ studentId: fx.studentId, marksObtained: 90, gradeLetter: 'A+' }] })
      .expect(201);
    const marksAfterUpdate = await request(app.getHttpServer())
      .get(`/v1/exam-schedules/${scheduleId}/marks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(marksAfterUpdate.body.data).toHaveLength(1);
    expect(Number(marksAfterUpdate.body.data[0].marksObtained)).toBe(90);

    const reportCard = await request(app.getHttpServer())
      .get(`/v1/students/${fx.studentId}/report-card`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(reportCard.body.data.exams).toHaveLength(1);
    expect(reportCard.body.data.exams[0].percentage).toBe(90);
  });

  it('rejects marks above the schedule\'s maxMarks', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const examId = await createExam(app, adminToken, fx.academicYearId);
    const scheduleId = await createSchedule(app, adminToken, examId, fx, 50);

    await request(app.getHttpServer())
      .post(`/v1/exam-schedules/${scheduleId}/marks`)
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({ records: [{ studentId: fx.studentId, marksObtained: 75 }] })
      .expect(400);
  });

  it('rejects marks for a student not enrolled in the scheduled class', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const examId = await createExam(app, adminToken, fx.academicYearId);
    const scheduleId = await createSchedule(app, adminToken, examId, fx, 100);

    await request(app.getHttpServer())
      .post(`/v1/exam-schedules/${scheduleId}/marks`)
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({ records: [{ studentId: randomUUID(), marksObtained: 50 }] })
      .expect(400);
  });

  it('only an ADMIN may create exams or schedules — a TEACHER token is rejected', async () => {
    const fx = await buildClassroomFixture(app, adminToken);

    await request(app.getHttpServer())
      .post('/v1/exams')
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({
        academicYearId: fx.academicYearId,
        name: 'Should not be creatable',
        examType: 'TERM',
        startsOn: '2026-06-01',
        endsOn: '2026-06-10',
      })
      .expect(403);
  });

  it('a student can read their own report card but never another student\'s', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const examId = await createExam(app, adminToken, fx.academicYearId);
    const scheduleId = await createSchedule(app, adminToken, examId, fx, 100);
    await request(app.getHttpServer())
      .post(`/v1/exam-schedules/${scheduleId}/marks`)
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({ records: [{ studentId: fx.studentId, marksObtained: 70 }] })
      .expect(201);

    const ownReportCard = await request(app.getHttpServer())
      .get(`/v1/students/${fx.studentId}/report-card`)
      .set('Authorization', `Bearer ${fx.studentToken}`)
      .expect(200);
    expect(ownReportCard.body.data.exams).toHaveLength(1);

    const otherFx = await buildClassroomFixture(app, adminToken);
    await request(app.getHttpServer())
      .get(`/v1/students/${fx.studentId}/report-card`)
      .set('Authorization', `Bearer ${otherFx.studentToken}`)
      .expect(403);
  });
});
