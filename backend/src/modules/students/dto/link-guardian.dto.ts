import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { GuardianRelation } from '@prisma/client';

export class LinkGuardianDto {
  @IsEnum(GuardianRelation)
  relation!: GuardianRelation;

  // Link an existing parent account at this school...
  @IsOptional()
  @IsUUID()
  parentId?: string;

  // ...or create a new one in the same request. Exactly one of parentId or
  // (fullName + email + password) must be given — enforced in the service.
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
