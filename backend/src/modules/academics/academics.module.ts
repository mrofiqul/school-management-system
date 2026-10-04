import { Module } from '@nestjs/common';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYearsService } from './academic-years.service';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { ClassSubjectsController } from './class-subjects.controller';
import { ClassSubjectsService } from './class-subjects.service';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';

@Module({
  controllers: [
    AcademicYearsController,
    ClassesController,
    SubjectsController,
    ClassSubjectsController,
    TimetableController,
  ],
  providers: [
    AcademicYearsService,
    ClassesService,
    SubjectsService,
    ClassSubjectsService,
    TimetableService,
  ],
})
export class AcademicsModule {}
