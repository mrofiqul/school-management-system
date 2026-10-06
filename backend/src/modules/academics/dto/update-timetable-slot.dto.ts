import { IsOptional, IsString } from 'class-validator';

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsString()
  room?: string;
  // Day/time/class-subject changes are modeled as delete + re-create, not an
  // update — the re-create goes through TimetableService.create()'s conflict
  // check, so there's no separate conflict-detection path to maintain here.
}
