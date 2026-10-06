import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import { timeStringToDate, dateToTimeString } from '../../common/utils/time';

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  async list(schoolId: string, sectionId: string) {
    await this.assertSectionInSchool(schoolId, sectionId);
    const slots = await this.prisma.timetableSlot.findMany({
      where: { sectionId },
      include: {
        classSubject: {
          select: { subject: { select: { name: true } }, teacher: { select: { fullName: true } } },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }],
    });
    return { data: slots.map(this.serialize) };
  }

  /**
   * A teacher's own weekly schedule, across every section they teach —
   * the entry point a Teacher needs to even get to "mark attendance for
   * this period" without already knowing a sectionId. classSubject is a
   * required relation here, so nesting the filter through it is safe
   * (see the note on students.service.ts for why that distinction matters).
   */
  async myTimetable(teacherId: string) {
    const slots = await this.prisma.timetableSlot.findMany({
      where: { classSubject: { teacherId } },
      include: {
        section: { select: { id: true, name: true, class: { select: { name: true } } } },
        classSubject: { select: { subject: { select: { name: true } } } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }],
    });
    return { data: slots.map(this.serialize) };
  }

  async create(schoolId: string, sectionId: string, dto: CreateTimetableSlotDto) {
    await this.assertSectionInSchool(schoolId, sectionId);

    const classSubject = await this.prisma.classSubject.findFirst({
      where: { id: dto.classSubjectId, class: { academicYear: { schoolId } } },
    });
    if (!classSubject) throw new NotFoundException('Class-subject assignment not found');

    const startsAt = timeStringToDate(dto.startsAt);
    const endsAt = timeStringToDate(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt');

    // Two kinds of double-booking: the section is in two places at once, or
    // the teacher is. Checked separately (not one combined query) so the
    // error names which one it actually is — previously neither was caught
    // at all, see backend/README.md's known-gaps history.
    const overlapWindow = { dayOfWeek: dto.dayOfWeek, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } };

    const sectionConflict = await this.prisma.timetableSlot.findFirst({
      where: { ...overlapWindow, sectionId },
    });
    if (sectionConflict) {
      throw new ConflictException('This section already has a class scheduled at an overlapping time');
    }

    const teacherConflict = await this.prisma.timetableSlot.findFirst({
      where: { ...overlapWindow, classSubject: { teacherId: classSubject.teacherId } },
    });
    if (teacherConflict) {
      throw new ConflictException('This teacher is already teaching another section at an overlapping time');
    }

    const slot = await this.prisma.timetableSlot.create({
      data: {
        sectionId,
        classSubjectId: dto.classSubjectId,
        dayOfWeek: dto.dayOfWeek,
        startsAt,
        endsAt,
        room: dto.room,
      },
    });
    return { data: this.serialize(slot) };
  }

  async update(schoolId: string, slotId: string, dto: UpdateTimetableSlotDto) {
    await this.assertSlotInSchool(schoolId, slotId);
    const slot = await this.prisma.timetableSlot.update({
      where: { id: slotId },
      data: { room: dto.room },
    });
    return { data: this.serialize(slot) };
  }

  async remove(schoolId: string, slotId: string) {
    await this.assertSlotInSchool(schoolId, slotId);
    await this.prisma.timetableSlot.delete({ where: { id: slotId } });
    return { data: { id: slotId, deleted: true } };
  }

  private serialize(slot: { startsAt: Date; endsAt: Date; [key: string]: unknown }) {
    return { ...slot, startsAt: dateToTimeString(slot.startsAt), endsAt: dateToTimeString(slot.endsAt) };
  }

  private async assertSectionInSchool(schoolId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, class: { academicYear: { schoolId } } },
    });
    if (!section) throw new NotFoundException('Section not found');
  }

  private async assertSlotInSchool(schoolId: string, slotId: string) {
    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id: slotId, section: { class: { academicYear: { schoolId } } } },
    });
    if (!slot) throw new NotFoundException('Timetable slot not found');
  }
}
