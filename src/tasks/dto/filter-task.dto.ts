import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterTaskDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['active', 'completed'], {
    message: 'status must be active or completed',
  })
  status?: 'active' | 'completed';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedUserId?: number;

  @IsOptional()
  @IsString()
  assignedUserName?: string;

  @IsOptional()
  @IsString()
  assignedUserEmail?: string;
}
