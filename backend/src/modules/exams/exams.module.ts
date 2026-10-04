import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  controllers: [ExamsController, AssignmentsController],
  providers: [ExamsService, AssignmentsService],
})
export class ExamsModule {}
