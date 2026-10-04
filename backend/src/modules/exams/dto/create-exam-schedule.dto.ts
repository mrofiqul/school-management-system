import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateExamScheduleDto {
  @IsUUID()
  classId!: string;

  @IsUUID()
  subjectId!: string;

  @IsDateString()
  heldOn!: string;

  @IsNumber()
  @Min(1)
  maxMarks!: number;
}
