import { Controller, Get } from '@nestjs/common';

// Unauthenticated on purpose — used by the hosting platform's health check,
// which can't carry a JWT. Mirrors the webhook controller's reasoning for
// being the other deliberately-open route in this API.
@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'campus-api' };
  }
}
