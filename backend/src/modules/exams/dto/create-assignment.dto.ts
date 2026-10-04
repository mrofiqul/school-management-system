import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsDateString()
  dueOn!: string;
}
