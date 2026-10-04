import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { TimetableService } from './timetable.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';

// Campus API Table 03. GET is open to AD+TC (viewing); building the grid is AD-only.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TimetableController {
  constructor(private service: TimetableService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get('sections/:sectionId/timetable')
  list(@CurrentUser() user: AuthenticatedUser, @Param('sectionId') sectionId: string) {
    return this.service.list(user.schoolId!, sectionId);
  }

  @Roles(Role.ADMIN)
  @Post('sections/:sectionId/timetable')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateTimetableSlotDto,
  ) {
    return this.service.create(user.schoolId!, sectionId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('timetable-slots/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTimetableSlotDto) {
    return this.service.update(user.schoolId!, id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('timetable-slots/:id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.schoolId!, id);
  }
}
