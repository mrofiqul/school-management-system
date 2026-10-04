import { IsOptional, IsString } from 'class-validator';

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsString()
  room?: string;
  // Day/time/class-subject changes are modeled as delete + re-create in this
  // slice, to avoid re-deriving conflict detection here — see
  // docs/specification.html for the "conflict detection" feature still open.
}
