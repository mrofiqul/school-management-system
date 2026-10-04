import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { ClassSubjectsService } from './class-subjects.service';
import { AssignClassSubjectDto } from './dto/assign-class-subject.dto';

// Campus API Table 03 — "assigns a subject and its teacher to a class."
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('classes/:classId/subjects')
export class ClassSubjectsController {
  constructor(private service: ClassSubjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('classId') classId: string) {
    return this.service.listForClass(user.schoolId!, classId);
  }

  @Post()
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Body() dto: AssignClassSubjectDto,
  ) {
    return this.service.assign(user.schoolId!, classId, dto);
  }
}
