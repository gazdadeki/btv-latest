import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'johndoe',
    description:
      'Username (3-14 characters; letters, numbers, and . - _ [ ] ( ) only)',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(14)
  @Matches(/^[A-Za-z0-9._\-()[\]]+$/, {
    message: 'Username can only contain letters, numbers, and . - _ [ ] ( )',
  })
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;
}
