import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { FeesService } from './fees.service';

@Module({
  controllers: [FeesController, PaymentsWebhookController],
  providers: [FeesService],
})
export class FeesModule {}
