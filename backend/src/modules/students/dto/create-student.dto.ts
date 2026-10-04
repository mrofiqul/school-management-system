import { IsDateString, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

// Note: deliberately has no schoolId field — it never could. The service
// reads the admin's own schoolId off the JWT (see Campus API Figure A).
export class CreateStudentDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string; // initial password, communicated to the guardian out-of-band

  @IsDateString()
  dob!: string;

  @IsString()
  admissionNo!: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;
}
