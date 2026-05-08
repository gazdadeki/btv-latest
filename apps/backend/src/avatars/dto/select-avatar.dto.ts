import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectAvatarDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  avatarId: number;
}
