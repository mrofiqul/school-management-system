import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  controllers: [SchoolsController, PlansController],
  providers: [SchoolsService, PlansService],
})
export class PlatformModule {}
