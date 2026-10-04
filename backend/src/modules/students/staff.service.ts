import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async list(schoolId: string) {
    const staff = await this.prisma.staffProfile.findMany({
      where: { user: { schoolId } },
      include: { user: { select: { fullName: true, email: true, role: true, status: true } } },
      orderBy: { employeeNo: 'asc' },
    });
    return { data: staff };
  }

  async create(schoolId: string, dto: CreateStaffDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const staff = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          password: passwordHash,
          role: dto.role === 'TEACHER' ? Role.TEACHER : Role.ACCOUNTANT,
        },
      });

      return tx.staffProfile.create({
        data: {
          userId: user.id,
          employeeNo: dto.employeeNo,
          designation: dto.designation,
          joinedOn: new Date(),
        },
        include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
      });
    });

    return { data: staff };
  }
}
