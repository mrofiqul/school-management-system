import { IsIn, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  tier!: string;

  @IsInt()
  @Min(1)
  maxStudents!: number;

  @IsNumber()
  @Min(0)
  priceBdt!: number;

  @IsIn(['MONTHLY', 'YEARLY'])
  billingCycle!: 'MONTHLY' | 'YEARLY';
}
