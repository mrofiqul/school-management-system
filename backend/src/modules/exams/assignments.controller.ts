import { Body, Controller, Get, Param, Post, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssignmentsController {
  constructor(private service: AssignmentsService) {}

  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN)
  @Get('class-subjects/:classSubjectId/assignments')
  list(@CurrentUser() user: AuthenticatedUser, @Param('classSubjectId') classSubjectId: string) {
    return this.service.list(user.schoolId!, classSubjectId);
  }

  @Roles(Role.TEACHER)
  @Post('class-subjects/:classSubjectId/assignments')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classSubjectId') classSubjectId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.service.create(user.schoolId!, user.sub, classSubjectId, dto);
  }

  @Roles(Role.STUDENT)
  @Post('assignments/:assignmentId/submissions')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.service.submit(user.schoolId!, user.sub, assignmentId, dto);
  }

  @Roles(Role.TEACHER)
  @Get('assignments/:assignmentId/submissions')
  listSubmissions(@CurrentUser() user: AuthenticatedUser, @Param('assignmentId') assignmentId: string) {
    return this.service.listSubmissions(user.schoolId!, user.sub, assignmentId);
  }

  @Roles(Role.TEACHER)
  @Patch('submissions/:submissionId')
  grade(
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.service.grade(user.schoolId!, user.sub, submissionId, dto);
  }
}
