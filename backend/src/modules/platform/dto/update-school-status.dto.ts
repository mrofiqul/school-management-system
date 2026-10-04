import { IsIn } from 'class-validator';

export class UpdateSchoolStatusDto {
  @IsIn(['ACTIVE', 'TRIAL', 'SUSPENDED'])
  status!: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
}
