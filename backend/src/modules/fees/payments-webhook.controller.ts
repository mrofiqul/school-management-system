import { Body, Controller, Param, Post } from '@nestjs/common';
import { FeesService } from './fees.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

// Campus API Table 06 — the one unauthenticated route in the whole API.
// Deliberately no JwtAuthGuard/RolesGuard here: trust comes from the
// signature verified inside FeesService.handleWebhook, not a bearer token.
@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(private service: FeesService) {}

  @Post(':gateway')
  handle(@Param('gateway') _gateway: string, @Body() dto: PaymentWebhookDto) {
    return this.service.handleWebhook(dto);
  }
}
