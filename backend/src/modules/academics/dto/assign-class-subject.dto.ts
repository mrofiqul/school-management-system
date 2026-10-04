import { IsUUID } from 'class-validator';

export class AssignClassSubjectDto {
  @IsUUID()
  subjectId!: string;

  @IsUUID()
  teacherId!: string;
}
