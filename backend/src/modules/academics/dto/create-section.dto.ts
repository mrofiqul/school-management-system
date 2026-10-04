import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  name!: string; // e.g. "A"

  @IsOptional()
  @IsInt()
  @Min(1)
  seatCapacity?: number;
}
