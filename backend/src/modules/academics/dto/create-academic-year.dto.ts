import { IsDateString, IsString } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  label!: string; // e.g. "2025-2026" — not derived from the dates, see note in Campus Schema

  @IsDateString()
  startsOn!: string;

  @IsDateString()
  endsOn!: string;
}
