import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function login(app: INestApplication, email: string, password: string): Promise<string> {
  const res = await request(app.getHttpServer()).post('/v1/auth/login').send({ email, password }).expect(201);
  return res.body.accessToken;
}

export interface ClassroomFixture {
  suffix: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  classSubjectId: string;
  teacherId: string;
  teacherToken: string;
  studentId: string;
  studentToken: string;
}

/**
 * Builds one class with a section, a subject taught by a freshly-created
 * teacher, and one student admitted into that section — the common setup
 * Attendance and Exams tests both need before they can do anything.
 * Mirrors the full chain backend/README.md says was verified by hand:
 * "admit a student into a section -> assign a teacher -> build a
 * timetable slot -> mark attendance -> run an exam -> enter marks...".
 * Every name/email includes a random suffix so this is safe to call
 * repeatedly against the same persistent test database.
 */
export async function buildClassroomFixture(app: INestApplication, adminToken: string): Promise<ClassroomFixture> {
  const suffix = randomUUID();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const year = await request(app.getHttpServer())
    .post('/v1/academic-years')
    .set(auth(adminToken))
    .send({ label: `Test Year ${suffix}`, startsOn: '2026-01-01', endsOn: '2026-12-31' })
    .expect(201);

  const klass = await request(app.getHttpServer())
    .post('/v1/classes')
    .set(auth(adminToken))
    .send({ academicYearId: year.body.data.id, name: `Class ${suffix}` })
    .expect(201);
  const classId = klass.body.data.id as string;

  const section = await request(app.getHttpServer())
    .post(`/v1/classes/${classId}/sections`)
    .set(auth(adminToken))
    .send({ name: 'A' })
    .expect(201);
  const sectionId = section.body.data.id as string;

  const subject = await request(app.getHttpServer())
    .post('/v1/subjects')
    .set(auth(adminToken))
    .send({ name: `Subject ${suffix}` })
    .expect(201);
  const subjectId = subject.body.data.id as string;

  const teacherEmail = `teacher-${suffix}@fixture.example`;
  const teacherPassword = 'ChangeMe123!';
  const staff = await request(app.getHttpServer())
    .post('/v1/staff')
    .set(auth(adminToken))
    .send({
      fullName: 'Test Teacher',
      email: teacherEmail,
      password: teacherPassword,
      designation: 'Teacher',
      employeeNo: `EMP-${suffix}`,
      role: 'TEACHER',
    })
    .expect(201);
  const teacherId = staff.body.data.userId as string;
  const teacherToken = await login(app, teacherEmail, teacherPassword);

  const classSubject = await request(app.getHttpServer())
    .post(`/v1/classes/${classId}/subjects`)
    .set(auth(adminToken))
    .send({ subjectId, teacherId })
    .expect(201);
  const classSubjectId = classSubject.body.data.id as string;

  const studentEmail = `student-${suffix}@fixture.example`;
  const studentPassword = 'ChangeMe123!';
  const student = await request(app.getHttpServer())
    .post('/v1/students')
    .set(auth(adminToken))
    .send({
      fullName: 'Test Student',
      email: studentEmail,
      password: studentPassword,
      dob: '2012-05-01',
      admissionNo: `ADM-${suffix}`,
      sectionId,
    })
    .expect(201);
  const studentId = student.body.data.userId as string;
  const studentToken = await login(app, studentEmail, studentPassword);

  return {
    suffix,
    academicYearId: year.body.data.id as string,
    classId,
    sectionId,
    subjectId,
    classSubjectId,
    teacherId,
    teacherToken,
    studentId,
    studentToken,
  };
}

export interface LinkedParent {
  parentId: string;
  parentToken: string;
}

/** Creates a new Parent account and links it as a guardian of the given student. */
export async function linkParent(
  app: INestApplication,
  adminToken: string,
  studentId: string,
): Promise<LinkedParent> {
  const suffix = randomUUID();
  const parentEmail = `parent-${suffix}@fixture.example`;
  const parentPassword = 'ChangeMe123!';

  const link = await request(app.getHttpServer())
    .post(`/v1/students/${studentId}/guardians`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ relation: 'MOTHER', fullName: 'Test Parent', email: parentEmail, password: parentPassword })
    .expect(201);

  const parentToken = await login(app, parentEmail, parentPassword);
  return { parentId: link.body.data.parentId as string, parentToken };
}
