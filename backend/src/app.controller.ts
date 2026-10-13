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

  // Checked by the mobile app right after login/session-restore (see
  // mobile/lib/core/app_update.dart) so an upgrade nudge is just an env var
  // change on Render, never a code change or app-side release. Unauthenticated
  // for the same reason as /health — this runs before the app necessarily has
  // a valid session to call it with.
  @Get('app-version')
  appVersion() {
    return {
      latestVersion: process.env.APP_LATEST_VERSION ?? '1.0.0',
      minSupportedVersion: process.env.APP_MIN_SUPPORTED_VERSION ?? '1.0.0',
      downloadUrl:
        process.env.APP_DOWNLOAD_URL ??
        'https://github.com/mrofiqul/school-management-system/releases/download/v1.0.0-android/app-release.apk',
    };
  }
}
