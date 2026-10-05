import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, SchoolStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async list(status?: SchoolStatus) {
    const schools = await this.prisma.school.findMany({
      where: status ? { status } : undefined,
      include: {
        plan: { select: { tier: true, maxStudents: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: schools };
  }

  async findOne(id: string) {
    // findUnique + a manual check, not findUniqueOrThrow — that throws a raw
    // Prisma NotFoundError straight past Nest's exception filters as an
    // uncaught 500, instead of the clean 404 every other "not found" in this
    // API returns (see e.g. ClassesService.create's academic-year check).
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: { plan: true, _count: { select: { users: true } } },
    });
    if (!school) throw new NotFoundException('School not found');
    return { data: school };
  }

  /** Onboards a school and its first Admin user in one transaction. */
  async create(dto: CreateSchoolDto) {
    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

    const school = await this.prisma.$transaction(async (tx) => {
      const created = await tx.school.create({
        data: {
          name: dto.name,
          district: dto.district,
          planId: dto.planId,
          status: SchoolStatus.TRIAL,
        },
      });

      await tx.user.create({
        data: {
          schoolId: created.id,
          fullName: dto.adminName,
          email: dto.adminEmail,
          password: passwordHash,
          role: Role.ADMIN,
        },
      });

      return created;
    });

    return { data: school };
  }

  async updateStatus(id: string, status: SchoolStatus) {
    const existing = await this.prisma.school.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('School not found');

    const school = await this.prisma.school.update({ where: { id }, data: { status } });
    return { data: school };
  }
}
