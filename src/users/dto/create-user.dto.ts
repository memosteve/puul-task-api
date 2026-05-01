import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(['admin', 'member'], { message: 'role must be admin or member' })
  @IsNotEmpty()
  role: 'admin' | 'member';
}
