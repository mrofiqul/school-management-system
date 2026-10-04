import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignClassSubjectDto } from './dto/assign-class-subject.dto';

@Injectable()
export class ClassSubjectsService {
  constructor(private prisma: PrismaService) {}

  async assign(schoolId: string, classId: string, dto: AssignClassSubjectDto) {
    const klass = await this.prisma.class.findFirst({
      where: { id: classId, academicYear: { schoolId } },
    });
    if (!klass) throw new NotFoundException('Class not found');

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const teacher = await this.prisma.user.findFirst({
      where: { id: dto.teacherId, schoolId, role: Role.TEACHER },
    });
    if (!teacher) throw new BadRequestException('teacherId must be an active teacher at this school');

    const classSubject = await this.prisma.classSubject.create({
      data: { classId, subjectId: dto.subjectId, teacherId: dto.teacherId },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { fullName: true } },
      },
    });
    return { data: classSubject };
  }
}
