import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async list(schoolId: string, classSubjectId: string) {
    await this.assertClassSubjectInSchool(schoolId, classSubjectId);
    const assignments = await this.prisma.assignment.findMany({
      where: { classSubjectId },
      orderBy: { dueOn: 'desc' },
    });
    return { data: assignments };
  }

  async create(schoolId: string, teacherId: string, classSubjectId: string, dto: CreateAssignmentDto) {
    await this.assertOwnClassSubject(schoolId, teacherId, classSubjectId);
    const assignment = await this.prisma.assignment.create({
      data: {
        classSubjectId,
        title: dto.title,
        attachmentUrl: dto.attachmentUrl,
        dueOn: new Date(dto.dueOn),
      },
    });
    return { data: assignment };
  }

  async submit(schoolId: string, studentId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, classSubject: { class: { academicYear: { schoolId } } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: { fileUrl: dto.fileUrl, submittedAt: new Date() },
      create: { assignmentId, studentId, fileUrl: dto.fileUrl },
    });
    return { data: submission };
  }

  async listSubmissions(schoolId: string, teacherId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, classSubject: { teacherId, class: { academicYear: { schoolId } } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { student: { select: { user: { select: { fullName: true } } } } },
      orderBy: { submittedAt: 'desc' },
    });
    return { data: submissions };
  }

  async grade(schoolId: string, teacherId: string, submissionId: string, dto: GradeSubmissionDto) {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        id: submissionId,
        assignment: { classSubject: { teacherId, class: { academicYear: { schoolId } } } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const graded = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { marks: dto.marks, feedback: dto.feedback },
    });
    return { data: graded };
  }

  private async assertClassSubjectInSchool(schoolId: string, classSubjectId: string) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, class: { academicYear: { schoolId } } },
    });
    if (!cs) throw new NotFoundException('Class-subject not found');
  }

  private async assertOwnClassSubject(schoolId: string, teacherId: string, classSubjectId: string) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, class: { academicYear: { schoolId } } },
    });
    if (!cs) throw new NotFoundException('Class-subject not found');
    if (cs.teacherId !== teacherId) {
      throw new ForbiddenException('Only the assigned teacher may post work for this class-subject');
    }
  }
}
