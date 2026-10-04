import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

/**
 * Placeholder shape — not SSLCommerz's real callback payload. Swap this DTO
 * and the signature check in payments.service.ts once sandbox credentials
 * exist; see docs/specification.html §09 and backend/.env.example.
 */
export class PaymentWebhookDto {
  @IsUUID()
  invoiceId!: string;

  @IsString()
  gatewayRef!: string;

  @IsNumber()
  @Min(0.01)
  amountPaidBdt!: number;

  @IsString()
  signature!: string;
}
