import { IsDateString, IsEnum, IsString, IsUUID } from 'class-validator';
import { ExamType } from '@prisma/client';

export class CreateExamDto {
  @IsUUID()
  academicYearId!: string;

  @IsString()
  name!: string;

  @IsEnum(ExamType)
  examType!: ExamType;

  @IsDateString()
  startsOn!: string;

  @IsDateString()
  endsOn!: string;
}
