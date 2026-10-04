import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { LinkGuardianDto } from './dto/link-guardian.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * schoolId always comes from the caller's JWT — see CurrentUser in the controller.
   *
   * Scoped via the student's own User.schoolId (always set), not via
   * section → class → academicYear → school. A nested relation filter on
   * `section` would silently drop every student with no section yet —
   * which is every student right after admission — because Prisma treats
   * `section: { ... }` as "a matching related row must exist," the same
   * way an inner join excludes a null foreign key.
   */
  async list(schoolId: string, sectionId?: string, classId?: string) {
    const students = await this.prisma.studentProfile.findMany({
      where: {
        user: { schoolId },
        sectionId: sectionId ?? undefined, // plain scalar filter — never excludes a null section
        // Unlike sectionId above, filtering by classId genuinely does mean
        // "must belong to a section of this class" — a student with no
        // section at all has no class either, so excluding them here is
        // correct, not the null-FK trap from the comment above.
        section: classId ? { classId } : undefined,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, status: true } },
        section: { select: { id: true, name: true, class: { select: { name: true } } } },
      },
      orderBy: { admissionNo: 'asc' },
    });
    return { data: students };
  }

  async create(schoolId: string, dto: CreateStudentDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          password: passwordHash,
          role: Role.STUDENT,
        },
      });

      return tx.studentProfile.create({
        data: {
          userId: user.id,
          admissionNo: dto.admissionNo,
          dob: new Date(dto.dob),
          sectionId: dto.sectionId,
        },
        include: { user: { select: { id: true, fullName: true, email: true } } },
      });
    });

    return { data: student };
  }

  async linkGuardian(schoolId: string, studentId: string, dto: LinkGuardianDto) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentId, user: { schoolId } },
    });
    if (!student) throw new NotFoundException('Student not found');

    let parentId = dto.parentId;

    if (parentId) {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: parentId, user: { schoolId } },
      });
      if (!parent) throw new NotFoundException('Parent not found at this school');
    } else {
      if (!dto.fullName || !dto.email || !dto.password) {
        throw new BadRequestException('Provide parentId, or fullName + email + password to create one');
      }
      const passwordHash = await bcrypt.hash(dto.password, 12);
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { schoolId, fullName: dto.fullName!, email: dto.email!, password: passwordHash, role: Role.PARENT },
        });
        return tx.parentProfile.create({ data: { userId: user.id } });
      });
      parentId = created.userId;
    }

    const link = await this.prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: { relation: dto.relation },
      create: { parentId, studentId, relation: dto.relation },
    });
    return { data: link };
  }
}
