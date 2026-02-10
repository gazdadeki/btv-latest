import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VerifiedGuard } from '../auth/guards/verified.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireVerified } from '../common/decorators/require-verified.decorator';
import { RequireNotBanned } from '../common/decorators/require-not-banned.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MessagesService } from './messages.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateConversationFromAdminDto } from './dto/create-conversation-from-admin.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AddAdminDto } from './dto/add-admin.dto';

/**
 * Controller for messaging functionality.
 *
 * Handles:
 * - Conversation creation and management
 * - Message sending and retrieval
 * - Unread message tracking
 */
@ApiTags('Messages')
@ApiBearerAuth()
@Controller({ path: 'messages', version: '1' })
@UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard, RolesGuard)
@RequireVerified()
@RequireNotBanned()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation (player only)' })
  @Roles(UserRole.PLAYER)
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req: any,
  ) {
    return this.messagesService.createConversation(
      req.user.id,
      createConversationDto.adminId,
    );
  }

  @Post('conversations/from-admin')
  @ApiOperation({
    summary:
      'Create a new conversation from admin to one or more users (admin only)',
  })
  @Roles(UserRole.ADMIN)
  async createConversationFromAdmin(
    @Body() createConversationDto: CreateConversationFromAdminDto,
    @Request() req: any,
  ) {
    return this.messagesService.createConversationFromAdmin(
      req.user.id,
      createConversationDto.targetUserIds,
    );
  }

  @Post('conversations/:id/admins')
  @ApiOperation({ summary: 'Add an admin to a conversation (admin only)' })
  @Roles(UserRole.ADMIN)
  async addAdminToConversation(
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() addAdminDto: AddAdminDto,
  ) {
    return this.messagesService.addAdminToConversation(
      conversationId,
      addAdminDto.adminId,
    );
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations' })
  async getConversations(@Request() req: any) {
    return this.messagesService.getUserConversations(req.user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details' })
  async getConversation(
    @Param('id', ParseIntPipe) conversationId: number,
    @Request() req: any,
  ) {
    return this.messagesService.getConversation(conversationId, req.user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get paginated messages for a conversation' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Messages per page (default: 50)',
  })
  async getConversationMessages(
    @Param('id', ParseIntPipe) conversationId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.messagesService.getConversationMessages(
      conversationId,
      req.user.id,
      pageNum,
      limitNum,
    );
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async sendMessage(
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.messagesService.sendMessage(
      conversationId,
      req.user.id,
      sendMessageDto.content,
    );
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark a conversation as read' })
  async markAsRead(
    @Param('id', ParseIntPipe) conversationId: number,
    @Request() req: any,
  ) {
    return this.messagesService.markAsRead(conversationId, req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread messages count' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.messagesService.getUnreadCount(req.user.id);
    return { count };
  }

  @Get('admins')
  @ApiOperation({
    summary: 'Get list of admin users for conversation creation (player only)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter by username or email',
  })
  @Roles(UserRole.PLAYER)
  async getAdmins(@Query('search') search?: string) {
    return this.messagesService.getAdminUsers(search);
  }
}
