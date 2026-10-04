import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AudienceScope, Role } from '@prisma/client';

export class CreateNoticeDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsEnum(AudienceScope)
  audienceScope!: AudienceScope;

  @IsOptional()
  @IsUUID()
  targetClassId?: string; // required when audienceScope === CLASS

  @IsOptional()
  @IsUUID()
  targetSectionId?: string; // required when audienceScope === SECTION

  @IsOptional()
  @IsEnum(Role)
  targetRole?: Role; // required when audienceScope === ROLE
}
