import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for adding an admin to a conversation.
 */
export class AddAdminDto {
  @ApiProperty({ description: 'ID of the admin to add to the conversation' })
  @IsNumber()
  @IsNotEmpty()
  adminId: number;
}
