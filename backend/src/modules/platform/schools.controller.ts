import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role, SchoolStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';

// Matches Campus API Table 01 — Platform. Super Admin only: no school_id
// on this token means no route here ever resolves for anyone else.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('platform/schools')
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  @Get()
  list(@Query('status') status?: SchoolStatus) {
    return this.schoolsService.list(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSchoolStatusDto) {
    return this.schoolsService.updateStatus(id, dto.status);
  }
}
