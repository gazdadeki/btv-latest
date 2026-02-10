import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new conversation.
 */
export class CreateConversationDto {
  @ApiProperty({ description: 'ID of the admin to start conversation with' })
  @IsNumber()
  @IsNotEmpty()
  adminId: number;
}
