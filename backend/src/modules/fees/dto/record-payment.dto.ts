import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsNumber()
  @Min(0.01)
  amountPaidBdt!: number;

  @IsIn(['CASH', 'BANK_TRANSFER'])
  method!: 'CASH' | 'BANK_TRANSFER'; // admin-recorded only — gateway payments arrive via the webhook

  @IsOptional()
  @IsString()
  note?: string;
}
