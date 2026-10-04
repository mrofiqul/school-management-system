import { IsDateString, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateFeeStructureDto {
  @IsUUID()
  classId!: string;

  @IsUUID()
  academicYearId!: string;

  @IsString()
  feeType!: string; // e.g. "Tuition — Monthly"

  @IsNumber()
  @Min(0)
  amountBdt!: number;

  @IsDateString()
  dueOn!: string;
}
