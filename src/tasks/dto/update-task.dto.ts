import {
  IsString,
  IsNumber,
  IsInt,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  Min,
  MaxLength,
  IsOptional,
  ValidateIf,
} from 'class-validator';

// Skips validators only when the field is undefined.
// null still reaches @IsString/@IsNumber/etc. and fails — so non-nullable
// fields return 400 instead of crashing the DB with a NOT NULL violation.
const IfDefined = () => ValidateIf((_o, v) => v !== undefined);

export class UpdateTaskDto {
  @IfDefined()
  @IsString()
  @MaxLength(255)
  title?: string;

  // description IS nullable in the DB; null means "clear the description"
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IfDefined()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IfDefined()
  @IsDateString()
  dueDate?: string;

  @IfDefined()
  @IsEnum(['active', 'completed'], {
    message: 'status must be active or completed',
  })
  status?: 'active' | 'completed';

  @IfDefined()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user must be assigned' })
  @ArrayMaxSize(100, { message: 'No more than 100 users can be assigned' })
  @ArrayUnique({ message: 'assignedUserIds must not contain duplicates' })
  @IsInt({ each: true, message: 'Each assignedUserId must be an integer' })
  @Min(1, {
    each: true,
    message: 'Each assignedUserId must be a positive number',
  })
  assignedUserIds?: number[];

  @IfDefined()
  @IsNumber()
  @Min(0)
  cost?: number;

  // actualHours IS nullable in the DB; null means "clear the actual hours"
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number | null;
}
