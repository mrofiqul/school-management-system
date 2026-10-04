import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { assertCanAccessStudent } from '../../common/utils/ownership';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markBulk(schoolId: string, teacherId: string, dto: MarkAttendanceDto) {
    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id: dto.timetableSlotId, section: { class: { academicYear: { schoolId } } } },
      select: { id: true, sectionId: true },
    });
    if (!slot) throw new NotFoundException('Timetable slot not found');

    // Every student marked must actually be a roster member of this slot's
    // section — otherwise a typo'd studentId would silently create an
    // attendance record for a student in no way connected to this class.
    const rosterIds = new Set(
      (
        await this.prisma.studentProfile.findMany({
          where: { sectionId: slot.sectionId },
          select: { userId: true },
        })
      ).map((s) => s.userId),
    );
    const unknown = dto.records.filter((r) => !rosterIds.has(r.studentId));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Not on this section's roster: ${unknown.map((r) => r.studentId).join(', ')}`,
      );
    }

    const onDate = new Date(dto.onDate);
    const results = await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            studentId_timetableSlotId_onDate: {
              studentId: r.studentId,
              timetableSlotId: dto.timetableSlotId,
              onDate,
            },
          },
          update: { status: r.status, markedBy: teacherId },
          create: {
            studentId: r.studentId,
            timetableSlotId: dto.timetableSlotId,
            onDate,
            status: r.status,
            markedBy: teacherId,
          },
        }),
      ),
    );
    return { data: results };
  }

  async list(
    schoolId: string,
    user: AuthenticatedUser,
    filters: { sectionId?: string; studentId?: string; from?: string; to?: string },
  ) {
    if (user.role === 'PARENT' && !filters.studentId) {
      throw new BadRequestException('studentId is required for the parent role');
    }
    if (filters.studentId) {
      await assertCanAccessStudent(this.prisma, user, filters.studentId);
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        student: { user: { schoolId } }, // required chain — safe to nest, see students.service.ts
        studentId: filters.studentId,
        timetableSlot: filters.sectionId ? { sectionId: filters.sectionId } : undefined,
        onDate: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      include: { student: { select: { user: { select: { fullName: true } } } } },
      orderBy: { onDate: 'desc' },
    });
    return { data: records };
  }

  async updateOne(schoolId: string, teacherId: string, id: string, dto: UpdateAttendanceDto) {
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { id, student: { user: { schoolId } } },
    });
    if (!existing) throw new NotFoundException('Attendance record not found');

    const updated = await this.prisma.attendanceRecord.update({
      where: { id },
      data: { status: dto.status, markedBy: teacherId },
    });
    return { data: updated };
  }

  async summary(schoolId: string, user: AuthenticatedUser, studentId: string) {
    await assertCanAccessStudent(this.prisma, user, studentId);

    const grouped = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { studentId, student: { user: { schoolId } } },
      _count: true,
    });

    const counts: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0 };
    for (const row of grouped) counts[row.status] = row._count;
    const total = counts.PRESENT + counts.ABSENT + counts.LATE;
    const presentPct = total === 0 ? null : Math.round(((counts.PRESENT + counts.LATE) / total) * 1000) / 10;

    return { data: { studentId, ...counts, total, presentPercentage: presentPct } };
  }
}
