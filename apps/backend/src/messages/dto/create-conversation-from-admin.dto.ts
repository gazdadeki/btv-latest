import { IsNumber, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a conversation from admin to any user(s).
 */
export class CreateConversationFromAdminDto {
  @ApiProperty({
    description: 'Array of user IDs to start conversation with',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @IsNumber({}, { each: true })
  @IsNotEmpty({ each: true })
  targetUserIds: number[];
}
