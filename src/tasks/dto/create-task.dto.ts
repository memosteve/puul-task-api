import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  Min,
  Max,
  MaxLength,
  IsOptional,
} from 'class-validator';

const MAX_NUMERIC_10_2 = 99999999.99;

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(MAX_NUMERIC_10_2)
  estimatedHours: number;

  @IsDateString()
  dueDate: string;

  @IsEnum(['active', 'completed'], {
    message: 'status must be active or completed',
  })
  status: 'active' | 'completed';

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user must be assigned' })
  @ArrayMaxSize(100, { message: 'No more than 100 users can be assigned' })
  @ArrayUnique({ message: 'assignedUserIds must not contain duplicates' })
  @IsInt({ each: true, message: 'Each assignedUserId must be an integer' })
  @Min(1, {
    each: true,
    message: 'Each assignedUserId must be a positive number',
  })
  assignedUserIds: number[];

  @IsNumber()
  @Min(0)
  @Max(MAX_NUMERIC_10_2)
  cost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_NUMERIC_10_2)
  actualHours?: number;
}
