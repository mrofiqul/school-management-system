import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(schoolId: string, sectionId: string, dto: CreateTimetableSlotDto) {
    await this.assertSectionInSchool(schoolId, sectionId);

    const classSubject = await this.prisma.classSubject.findFirst({
      where: { id: dto.classSubjectId, class: { academicYear: { schoolId } } },
    });
    if (!classSubject) throw new NotFoundException('Class-subject assignment not found');

    const slot = await this.prisma.timetableSlot.create({
      data: {
        sectionId,
        classSubjectId: dto.classSubjectId,
        dayOfWeek: dto.dayOfWeek,
        startsAt: timeStringToDate(dto.startsAt),
        endsAt: timeStringToDate(dto.endsAt),
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
