import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

class AttendanceMarkDto {
  @IsUUID()
  studentId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class MarkAttendanceDto {
  @IsUUID()
  timetableSlotId!: string;

  @IsDateString()
  onDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceMarkDto)
  records!: AttendanceMarkDto[];
}
