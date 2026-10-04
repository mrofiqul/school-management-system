import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async list(schoolId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
    return { data: subjects };
  }

  async create(schoolId: string, dto: CreateSubjectDto) {
    const subject = await this.prisma.subject.create({
      data: { schoolId, name: dto.name, code: dto.code },
    });
    return { data: subject };
  }
}
