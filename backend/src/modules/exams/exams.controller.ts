import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamScheduleDto } from './dto/create-exam-schedule.dto';
import { BulkMarksDto } from './dto/bulk-marks.dto';

// Campus API Table 05 — Exams, Grades & Assignments.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ExamsController {
  constructor(private service: ExamsService) {}

  @Roles(Role.ADMIN)
  @Get('exams')
  listExams(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listExams(user.schoolId!);
  }

  @Roles(Role.ADMIN)
  @Post('exams')
  createExam(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExamDto) {
    return this.service.createExam(user.schoolId!, dto);
  }

  @Roles(Role.ADMIN)
  @Get('exams/:examId/schedules')
  listSchedules(@CurrentUser() user: AuthenticatedUser, @Param('examId') examId: string) {
    return this.service.listSchedules(user.schoolId!, examId);
  }

  @Roles(Role.ADMIN)
  @Post('exams/:examId/schedules')
  createSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('examId') examId: string,
    @Body() dto: CreateExamScheduleDto,
  ) {
    return this.service.createSchedule(user.schoolId!, examId, dto);
  }

  @Roles(Role.TEACHER)
  @Post('exam-schedules/:scheduleId/marks')
  enterMarks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: BulkMarksDto,
  ) {
    return this.service.enterMarks(user.schoolId!, scheduleId, dto);
  }

  @Roles(Role.ADMIN, Role.PARENT, Role.STUDENT)
  @Get('students/:studentId/report-card')
  reportCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query('examId') examId?: string,
  ) {
    return this.service.reportCard(user.schoolId!, user, studentId, examId);
  }
}
