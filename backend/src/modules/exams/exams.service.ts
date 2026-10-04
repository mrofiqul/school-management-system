import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { assertCanAccessStudent } from '../../common/utils/ownership';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamScheduleDto } from './dto/create-exam-schedule.dto';
import { BulkMarksDto } from './dto/bulk-marks.dto';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  /**
   * A teacher's own schedules to grade — matched by (classId, subjectId)
   * against their ClassSubject assignments, since ExamSchedule has no
   * teacherId of its own. Built from two scalar-equality queries, not a
   * nested relation filter, so there's no null-FK trap to worry about here.
   */
  async myExamSchedules(schoolId: string, teacherId: string) {
    const myClassSubjects = await this.prisma.classSubject.findMany({
      where: { teacherId, class: { academicYear: { schoolId } } },
      select: { classId: true, subjectId: true },
    });
    if (myClassSubjects.length === 0) return { data: [] };

    const schedules = await this.prisma.examSchedule.findMany({
      where: { OR: myClassSubjects.map((cs) => ({ classId: cs.classId, subjectId: cs.subjectId })) },
      include: {
        exam: { select: { id: true, name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { heldOn: 'desc' },
    });
    return { data: schedules };
  }

  async listExams(schoolId: string) {
    const exams = await this.prisma.exam.findMany({
      where: { academicYear: { schoolId } },
      orderBy: { startsOn: 'desc' },
    });
    return { data: exams };
  }

  async createExam(schoolId: string, dto: CreateExamDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const exam = await this.prisma.exam.create({
      data: {
        academicYearId: dto.academicYearId,
        name: dto.name,
        examType: dto.examType,
        startsOn: new Date(dto.startsOn),
        endsOn: new Date(dto.endsOn),
      },
    });
    return { data: exam };
  }

  async listSchedules(schoolId: string, examId: string) {
    await this.assertExamInSchool(schoolId, examId);
    const schedules = await this.prisma.examSchedule.findMany({
      where: { examId },
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
      orderBy: { heldOn: 'asc' },
    });
    return { data: schedules };
  }

  async createSchedule(schoolId: string, examId: string, dto: CreateExamScheduleDto) {
    await this.assertExamInSchool(schoolId, examId);

    const klass = await this.prisma.class.findFirst({
      where: { id: dto.classId, academicYear: { schoolId } },
    });
    if (!klass) throw new NotFoundException('Class not found');

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const schedule = await this.prisma.examSchedule.create({
      data: {
        examId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        heldOn: new Date(dto.heldOn),
        maxMarks: dto.maxMarks,
      },
    });
    return { data: schedule };
  }

  /** Existing marks for a schedule, so reopening marks entry isn't a blank form. */
  async listMarks(schoolId: string, scheduleId: string) {
    const schedule = await this.prisma.examSchedule.findFirst({
      where: { id: scheduleId, exam: { academicYear: { schoolId } } },
    });
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    const marks = await this.prisma.mark.findMany({ where: { examScheduleId: scheduleId } });
    return { data: marks };
  }

  async enterMarks(schoolId: string, scheduleId: string, dto: BulkMarksDto) {
    const schedule = await this.prisma.examSchedule.findFirst({
      where: { id: scheduleId, exam: { academicYear: { schoolId } } },
    });
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    const maxMarks = Number(schedule.maxMarks);
    const overLimit = dto.records.filter((r) => r.marksObtained > maxMarks);
    if (overLimit.length > 0) {
      throw new BadRequestException(`marksObtained cannot exceed maxMarks (${maxMarks})`);
    }

    const rosterIds = new Set(
      (
        await this.prisma.studentProfile.findMany({
          where: { section: { classId: schedule.classId } },
          select: { userId: true },
        })
      ).map((s) => s.userId),
    );
    const unknown = dto.records.filter((r) => !rosterIds.has(r.studentId));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Not enrolled in this class: ${unknown.map((r) => r.studentId).join(', ')}`,
      );
    }

    const results = await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.mark.upsert({
          where: { examScheduleId_studentId: { examScheduleId: scheduleId, studentId: r.studentId } },
          update: { marksObtained: r.marksObtained, gradeLetter: r.gradeLetter, remarks: r.remarks },
          create: {
            examScheduleId: scheduleId,
            studentId: r.studentId,
            marksObtained: r.marksObtained,
            gradeLetter: r.gradeLetter,
            remarks: r.remarks,
          },
        }),
      ),
    );
    return { data: results };
  }

  async reportCard(schoolId: string, user: AuthenticatedUser, studentId: string, examId?: string) {
    await assertCanAccessStudent(this.prisma, user, studentId);

    const marks = await this.prisma.mark.findMany({
      where: {
        studentId,
        student: { user: { schoolId } },
        examSchedule: examId ? { examId } : undefined,
      },
      include: {
        examSchedule: {
          select: {
            maxMarks: true,
            exam: { select: { id: true, name: true } },
            subject: { select: { name: true } },
          },
        },
      },
      orderBy: { examSchedule: { heldOn: 'asc' } },
    });

    const byExam = new Map<string, { examId: string; examName: string; subjects: unknown[]; total: number; maxTotal: number }>();
    for (const mark of marks) {
      const examId = mark.examSchedule.exam.id;
      if (!byExam.has(examId)) {
        byExam.set(examId, { examId, examName: mark.examSchedule.exam.name, subjects: [], total: 0, maxTotal: 0 });
      }
      const bucket = byExam.get(examId)!;
      const obtained = Number(mark.marksObtained);
      const max = Number(mark.examSchedule.maxMarks);
      bucket.subjects.push({
        subject: mark.examSchedule.subject.name,
        marksObtained: obtained,
        maxMarks: max,
        gradeLetter: mark.gradeLetter,
      });
      bucket.total += obtained;
      bucket.maxTotal += max;
    }

    const exams = Array.from(byExam.values()).map((e) => ({
      ...e,
      percentage: e.maxTotal === 0 ? null : Math.round((e.total / e.maxTotal) * 1000) / 10,
    }));

    return { data: { studentId, exams } };
  }

  private async assertExamInSchool(schoolId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, academicYear: { schoolId } },
    });
    if (!exam) throw new NotFoundException('Exam not found');
  }
}
