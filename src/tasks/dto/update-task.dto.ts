import {
  IsString,
  IsNumber,
  IsInt,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  Min,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(['active', 'completed'], {
    message: 'status must be active or completed',
  })
  status?: 'active' | 'completed';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user must be assigned' })
  @IsInt({ each: true, message: 'Each assignedUserId must be an integer' })
  @Min(1, {
    each: true,
    message: 'Each assignedUserId must be a positive number',
  })
  assignedUserIds?: number[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;
}
