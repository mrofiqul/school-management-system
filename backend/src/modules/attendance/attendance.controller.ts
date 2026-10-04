import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

// Campus API Table 04 — Attendance. GET routes additionally allow STUDENT
// for self-access (narrower than the original table, widened deliberately —
// a student reading their own attendance is a safe addition given
// assertCanAccessStudent already enforces it's their own record).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Roles(Role.TEACHER)
  @Post('attendance')
  markBulk(@CurrentUser() user: AuthenticatedUser, @Body() dto: MarkAttendanceDto) {
    return this.service.markBulk(user.schoolId!, user.sub, dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @Get('attendance')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('sectionId') sectionId?: string,
    @Query('studentId') studentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list(user.schoolId!, user, { sectionId, studentId, from, to });
  }

  @Roles(Role.TEACHER)
  @Patch('attendance/:id')
  updateOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    return this.service.updateOne(user.schoolId!, user.sub, id, dto);
  }

  @Roles(Role.ADMIN, Role.PARENT, Role.STUDENT)
  @Get('students/:studentId/attendance-summary')
  summary(@CurrentUser() user: AuthenticatedUser, @Param('studentId') studentId: string) {
    return this.service.summary(user.schoolId!, user, studentId);
  }
}
