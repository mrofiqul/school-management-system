import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { LinkGuardianDto } from './dto/link-guardian.dto';

// Matches Campus API Table 02 — Tenancy & People. Every handler below reads
// schoolId off the token (CurrentUser), never off the request — this is the
// school-scoped counterpart to the Platform module's Super-Admin-only routes.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('sectionId') sectionId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.studentsService.list(user.schoolId!, sectionId, classId);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(user.schoolId!, dto);
  }

  @Roles(Role.ADMIN)
  @Post(':id/guardians')
  linkGuardian(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') studentId: string,
    @Body() dto: LinkGuardianDto,
  ) {
    return this.studentsService.linkGuardian(user.schoolId!, studentId, dto);
  }
}
