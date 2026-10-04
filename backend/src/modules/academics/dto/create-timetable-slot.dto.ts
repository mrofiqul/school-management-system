import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { DayOfWeek } from '@prisma/client';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/; // "HH:mm", 24-hour

export class CreateTimetableSlotDto {
  @IsUUID()
  classSubjectId!: string;

  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @Matches(TIME_PATTERN, { message: 'startsAt must be "HH:mm"' })
  startsAt!: string;

  @Matches(TIME_PATTERN, { message: 'endsAt must be "HH:mm"' })
  endsAt!: string;

  @IsOptional()
  @IsString()
  room?: string;
}
