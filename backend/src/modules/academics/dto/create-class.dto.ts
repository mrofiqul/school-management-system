import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateClassDto {
  @IsUUID()
  academicYearId!: string;

  @IsString()
  name!: string; // e.g. "Class 6"

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
