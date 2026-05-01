import { IsOptional, IsString, IsEnum } from 'class-validator';

export class FilterUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(['admin', 'member'], { message: 'role must be admin or member' })
  role?: 'admin' | 'member';
}
