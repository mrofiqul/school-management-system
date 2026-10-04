import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsUUID()
  planId!: string;

  // First School Admin account, created in the same transaction.
  @IsString()
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}
