import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  async list(schoolId: string) {
    const years = await this.prisma.academicYear.findMany({
      where: { schoolId }, // AcademicYear.schoolId is a direct scalar — no relation hop needed
      orderBy: { startsOn: 'desc' },
    });
    return { data: years };
  }

  async create(schoolId: string, dto: CreateAcademicYearDto) {
    const year = await this.prisma.academicYear.create({
      data: {
        schoolId,
        label: dto.label,
        startsOn: new Date(dto.startsOn),
        endsOn: new Date(dto.endsOn),
      },
    });
    return { data: year };
  }
}
