import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSectionDto } from './dto/create-section.dto';

// Campus API Table 03 — Academics.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller()
export class ClassesController {
  constructor(private service: ClassesService) {}

  @Get('classes')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.schoolId!);
  }

  @Post('classes')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClassDto) {
    return this.service.create(user.schoolId!, dto);
  }

  @Get('classes/:classId/sections')
  listSections(@CurrentUser() user: AuthenticatedUser, @Param('classId') classId: string) {
    return this.service.listSections(user.schoolId!, classId);
  }

  @Post('classes/:classId/sections')
  createSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.service.createSection(user.schoolId!, classId, dto);
  }
}
