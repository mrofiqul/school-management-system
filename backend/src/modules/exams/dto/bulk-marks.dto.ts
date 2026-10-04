import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class MarkEntryDto {
  @IsUUID()
  studentId!: string;

  @IsNumber()
  @Min(0)
  marksObtained!: number;

  @IsOptional()
  @IsString()
  gradeLetter?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkMarksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MarkEntryDto)
  records!: MarkEntryDto[];
}
