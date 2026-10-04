import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform/platform.module';
import { StudentsModule } from './modules/students/students.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ExamsModule } from './modules/exams/exams.module';
import { FeesModule } from './modules/fees/fees.module';
import { CommunicationModule } from './modules/communication/communication.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global baseline rate limit. docs/specification.html §08 flags that this
    // should become per-school and tier-sized — this is the floor, not the plan.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    PlatformModule,
    StudentsModule,
    AcademicsModule,
    AttendanceModule,
    ExamsModule,
    FeesModule,
    CommunicationModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
