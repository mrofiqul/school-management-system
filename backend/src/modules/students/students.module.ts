import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';

@Module({
  controllers: [StudentsController, StaffController, ParentsController],
  providers: [StudentsService, StaffService, ParentsService],
})
export class StudentsModule {}
