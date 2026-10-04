import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  designation!: string; // e.g. "Senior Teacher — Mathematics"

  @IsString()
  employeeNo!: string;

  // Only TEACHER and ACCOUNTANT are created through this route — ADMIN
  // accounts are created once, during school onboarding (Campus API Table 01).
  @IsIn(['TEACHER', 'ACCOUNTANT'])
  role!: 'TEACHER' | 'ACCOUNTANT';
}
