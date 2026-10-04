import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('platform/plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.list();
  }

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }
}
