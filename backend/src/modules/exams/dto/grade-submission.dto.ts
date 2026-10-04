import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  marks!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
