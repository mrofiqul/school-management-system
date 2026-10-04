import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async list(schoolId: string) {
    const classes = await this.prisma.class.findMany({
      where: { academicYear: { schoolId } }, // academicYear is a required relation — safe to nest
      include: { sections: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { data: classes };
  }

  async create(schoolId: string, dto: CreateClassDto) {
    // The referenced academic year must belong to the caller's own school —
    // otherwise a client could create a class under another school's year
    // just by knowing its id. This check, not the create itself, is what
    // keeps tenant isolation real on every write that takes a parent id.
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const created = await this.prisma.class.create({
      data: {
        academicYearId: dto.academicYearId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return { data: created };
  }

  async listSections(schoolId: string, classId: string) {
    await this.assertClassInSchool(schoolId, classId);
    const sections = await this.prisma.section.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
    });
    return { data: sections };
  }

  async createSection(schoolId: string, classId: string, dto: CreateSectionDto) {
    await this.assertClassInSchool(schoolId, classId);
    const section = await this.prisma.section.create({
      data: { classId, name: dto.name, seatCapacity: dto.seatCapacity },
    });
    return { data: section };
  }

  private async assertClassInSchool(schoolId: string, classId: string) {
    const klass = await this.prisma.class.findFirst({
      where: { id: classId, academicYear: { schoolId } },
    });
    if (!klass) throw new NotFoundException('Class not found');
  }
}
