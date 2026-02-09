import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { MessagesGatewayService } from './messages.gateway.service';
import { AuditService } from '../audit/audit.service';

/**
 * Service for managing conversations and messages between players and admins.
 *
 * Handles:
 * - Conversation creation and management
 * - Message sending and retrieval
 * - Unread message tracking
 * - Conversation participant management
 */
@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepository: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
    private messagesGatewayService: MessagesGatewayService,
    private auditService: AuditService,
  ) {}

  /**
   * Get list of admin users for player to search when creating conversations.
   * Returns only essential information (id, username, email) without sensitive data.
   *
   * @param search - Optional search term to filter by username or email
   * @returns List of admin users
   */
  async getAdminUsers(search?: string): Promise<
    Array<{
      id: number;
      username: string | null;
      email: string;
    }>
  > {
    const admins = await this.usersService.findAll({
      role: UserRole.ADMIN,
      search,
    });

    return admins.map((admin) => ({
      id: admin.id,
      username: admin.username,
      email: admin.email,
    }));
  }

  /**
   * Create a new conversation between a player and an admin.
   * Prevents duplicate conversations between the same player-admin pair.
   *
   * @param playerId - ID of the player creating the conversation
   * @param adminId - ID of the admin to start conversation with
   * @returns Created conversation entity
   * @throws NotFoundException if player or admin not found
   * @throws BadRequestException if admin is not an admin or if conversation already exists
   */
  async createConversation(
    playerId: number,
    adminId: number,
  ): Promise<Conversation> {
    const player = await this.userRepository.findOne({
      where: { id: playerId },
    });
    if (!player || player.role !== UserRole.PLAYER) {
      throw new NotFoundException('Player not found');
    }

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    // Check if conversation already exists between this player and admin
    const existingPlayerParticipant = await this.participantRepository.findOne({
      where: { userId: playerId },
      relations: ['conversation', 'conversation.conversationParticipants'],
    });

    if (existingPlayerParticipant) {
      const existingConv = existingPlayerParticipant.conversation;
      if (existingConv.type === ConversationType.DIRECT) {
        const hasAdmin = existingConv.conversationParticipants.some(
          (p) => p.userId === adminId,
        );
        if (hasAdmin) {
          throw new BadRequestException(
            'Conversation already exists between this player and admin',
          );
        }
      }
    }

    // Create conversation
    const conversation = this.conversationRepository.create({
      type: ConversationType.DIRECT,
    });
    const savedConversation =
      await this.conversationRepository.save(conversation);

    // Create participant records
    const now = new Date();
    await this.participantRepository.save([
      {
        conversationId: savedConversation.id,
        userId: playerId,
        joinedAt: now,
        lastReadAt: null,
      },
      {
        conversationId: savedConversation.id,
        userId: adminId,
        joinedAt: now,
        lastReadAt: null,
      },
    ]);

    await this.auditService.log({
      userId: playerId,
      userEmail: player.email,
      action: 'CREATE',
      entityType: 'Conversation',
      entityId: savedConversation.id.toString(),
      details: { adminId, type: ConversationType.DIRECT },
    });

    // Broadcast conversation created event
    const conversationData = await this.getConversation(
      savedConversation.id,
      playerId,
    );
    this.messagesGatewayService.broadcastConversationCreated(
      savedConversation.id,
      [playerId, adminId],
      conversationData,
    );

    this.logger.log(
      `Created conversation ${savedConversation.id} between player ${playerId} and admin ${adminId}`,
    );

    return savedConversation;
  }

  /**
   * Create a conversation from an admin to one or more users (players or admins).
   * Used when admins initiate conversations from the dashboard.
   *
   * @param adminId - ID of the admin creating the conversation
   * @param targetUserIds - Array of user IDs to start conversation with
   * @returns Created or existing conversation entity
   * @throws NotFoundException if admin or any target user not found
   * @throws BadRequestException if admin is not an admin or if duplicate users provided
   */
  async createConversationFromAdmin(
    adminId: number,
    targetUserIds: number[],
  ): Promise<Conversation> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    // Remove duplicates and admin from target list
    const uniqueTargetIds = [...new Set(targetUserIds)].filter(
      (id) => id !== adminId,
    );
    if (uniqueTargetIds.length === 0) {
      throw new BadRequestException(
        'At least one recipient (other than yourself) is required',
      );
    }

    // Verify all target users exist
    const targetUsers = await this.userRepository.find({
      where: uniqueTargetIds.map((id) => ({ id })),
    });

    if (targetUsers.length !== uniqueTargetIds.length) {
      const foundIds = targetUsers.map((u) => u.id);
      const missingIds = uniqueTargetIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Users not found: ${missingIds.join(', ')}`);
    }

    // Sort user IDs for consistent checking
    const sortedTargetIds = [...uniqueTargetIds].sort((a, b) => a - b);
    const allParticipantIds = [adminId, ...sortedTargetIds].sort(
      (a, b) => a - b,
    );

    // Check if conversation already exists with exact same participants
    const adminParticipants = await this.participantRepository.find({
      where: { userId: adminId },
      relations: ['conversation', 'conversation.conversationParticipants'],
    });

    for (const adminParticipant of adminParticipants) {
      const conv = adminParticipant.conversation;
      const convParticipantIds = conv.conversationParticipants
        .map((p) => p.userId)
        .sort((a, b) => a - b);

      // Check if this conversation has the exact same participants
      if (
        convParticipantIds.length === allParticipantIds.length &&
        convParticipantIds.every((id, idx) => id === allParticipantIds[idx])
      ) {
        this.logger.debug(
          `Conversation already exists with participants [${allParticipantIds.join(', ')}]: ${conv.id}`,
        );
        return conv;
      }
    }

    // Determine conversation type: GROUP if more than 2 total participants or any admin in targets
    const hasAdminInTargets = targetUsers.some(
      (u) => u.role === UserRole.ADMIN,
    );
    const conversationType =
      allParticipantIds.length > 2 || hasAdminInTargets
        ? ConversationType.GROUP
        : ConversationType.DIRECT;

    // Create conversation
    const conversation = this.conversationRepository.create({
      type: conversationType,
    });
    const savedConversation =
      await this.conversationRepository.save(conversation);

    // Create participant records
    const now = new Date();
    const participants = [
      {
        conversationId: savedConversation.id,
        userId: adminId,
        joinedAt: now,
        lastReadAt: null,
      },
      ...sortedTargetIds.map((userId) => ({
        conversationId: savedConversation.id,
        userId,
        joinedAt: now,
        lastReadAt: null,
      })),
    ];

    await this.participantRepository.save(participants);

    await this.auditService.log({
      userId: adminId,
      userEmail: admin.email,
      action: 'CREATE',
      entityType: 'Conversation',
      entityId: savedConversation.id.toString(),
      details: { targetUserIds: sortedTargetIds, type: conversationType },
    });

    // Broadcast conversation created event to all participants
    const conversationData = await this.getConversation(
      savedConversation.id,
      adminId,
    );
    this.messagesGatewayService.broadcastConversationCreated(
      savedConversation.id,
      allParticipantIds,
      conversationData,
    );

    this.logger.log(
      `Created conversation ${savedConversation.id} from admin ${adminId} to users [${sortedTargetIds.join(', ')}]`,
    );

    return savedConversation;
  }

  /**
   * Add an admin to an existing conversation, converting it to a group chat if needed.
   *
   * @param conversationId - ID of the conversation
   * @param adminId - ID of the admin to add
   * @returns Updated conversation entity
   * @throws NotFoundException if conversation or admin not found
   * @throws BadRequestException if admin is already a participant
   * @throws ForbiddenException if user is not authorized to add admins
   */
  async addAdminToConversation(
    conversationId: number,
    adminId: number,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['conversationParticipants', 'conversationParticipants.user'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    // Check if admin is already a participant
    const isParticipant = conversation.conversationParticipants.some(
      (p) => p.userId === adminId,
    );
    if (isParticipant) {
      throw new BadRequestException(
        'Admin is already a participant in this conversation',
      );
    }

    // Convert to GROUP if currently DIRECT
    if (conversation.type === ConversationType.DIRECT) {
      conversation.type = ConversationType.GROUP;
      await this.conversationRepository.save(conversation);
    }

    // Add admin as participant
    await this.participantRepository.save({
      conversationId,
      userId: adminId,
      joinedAt: new Date(),
      lastReadAt: null,
    });

    await this.auditService.log({
      userId: adminId,
      userEmail: admin.email,
      action: 'UPDATE',
      entityType: 'Conversation',
      entityId: conversationId.toString(),
      details: { action: 'add_admin', type: conversation.type },
    });

    this.logger.log(`Added admin ${adminId} to conversation ${conversationId}`);

    const updatedConversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['conversationParticipants', 'conversationParticipants.user'],
    });

    // Broadcast conversation updated event to all participants
    const participants = await this.participantRepository.find({
      where: { conversationId },
    });
    const allParticipantIds = participants.map((p) => p.userId);
    const conversationData = await this.getConversation(
      conversationId,
      adminId,
    );
    this.messagesGatewayService.broadcastConversationUpdated(
      conversationId,
      allParticipantIds,
      conversationData,
    );

    return updatedConversation;
  }

  /**
   * Send a message in a conversation.
   * Updates lastMessageAt and broadcasts to all participants via WebSocket.
   *
   * @param conversationId - ID of the conversation
   * @param senderId - ID of the user sending the message
   * @param content - Message content
   * @returns Created message entity
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if sender is not a participant
   */
  async sendMessage(
    conversationId: number,
    senderId: number,
    content: string,
  ): Promise<Message> {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // Validate conversation access
    await this.validateConversationAccess(conversationId, senderId);

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Create message
    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content: content.trim(),
    });
    const savedMessage = await this.messageRepository.save(message);

    // Update conversation lastMessageAt
    conversation.lastMessageAt = new Date();
    await this.conversationRepository.save(conversation);

    // Load message with relations for broadcasting
    const messageWithRelations = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'conversation'],
    });

    // Broadcast to all participants
    await this.messagesGatewayService.broadcastMessage(
      conversationId,
      messageWithRelations,
    );

    // Get all participants to update their unread counts
    const participants = await this.participantRepository.find({
      where: { conversationId },
    });

    // Update unread counts for all participants except sender
    const participantIds = participants
      .map((p) => p.userId)
      .filter((id) => id !== senderId);
    for (const participantId of participantIds) {
      const unreadCount = await this.getUnreadCount(participantId);
      this.messagesGatewayService.broadcastUnreadCount(
        participantId,
        unreadCount,
      );
    }

    // Broadcast conversation updated event to all participants
    const conversationData = await this.getConversation(
      conversationId,
      senderId,
    );
    const allParticipantIds = participants.map((p) => p.userId);
    this.messagesGatewayService.broadcastConversationUpdated(
      conversationId,
      allParticipantIds,
      conversationData,
    );

    await this.auditService.log({
      userId: senderId,
      action: 'CREATE',
      entityType: 'Message',
      entityId: savedMessage.id.toString(),
      details: { conversationId },
    });

    this.logger.debug(
      `Message ${savedMessage.id} sent in conversation ${conversationId} by user ${senderId}`,
    );

    return messageWithRelations;
  }

  /**
   * Get all conversations for a user, ordered by lastMessageAt (most recent first).
   *
   * @param userId - ID of the user
   * @returns Array of conversations with participant and last message info
   */
  async getUserConversations(userId: number): Promise<any[]> {
    const participants = await this.participantRepository.find({
      where: { userId },
      relations: [
        'conversation',
        'conversation.conversationParticipants',
        'conversation.conversationParticipants.user',
      ],
    });

    const conversationIds = participants.map((p) => p.conversationId);
    if (conversationIds.length === 0) {
      return [];
    }

    const conversations = await this.conversationRepository.find({
      where: { id: In(conversationIds) },
      relations: ['conversationParticipants', 'conversationParticipants.user'],
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });

    // Get last message for each conversation
    const lastMessages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId IN (:...ids)', { ids: conversationIds })
      .andWhere(
        'message.id IN (SELECT MAX(m.id) FROM messages m WHERE m.conversationId = message.conversationId)',
      )
      .leftJoinAndSelect('message.sender', 'sender')
      .getMany();

    const lastMessageMap = new Map(
      lastMessages.map((m) => [m.conversationId, m]),
    );

    // Get unread counts for each conversation
    const unreadCounts = await this.getUnreadCountsForConversations(
      userId,
      conversationIds,
    );

    return conversations.map((conversation) => {
      const participant = participants.find(
        (p) => p.conversationId === conversation.id,
      );
      const otherParticipants = conversation.conversationParticipants
        .filter((p) => p.userId !== userId)
        .map((p) => p.user);
      const lastMessage = lastMessageMap.get(conversation.id) || null;

      return {
        id: conversation.id,
        type: conversation.type,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessageAt: conversation.lastMessageAt,
        participants: otherParticipants.map((p) => ({
          id: p.id,
          email: p.email,
          role: p.role,
        })),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              sender: {
                id: lastMessage.sender.id,
                email: lastMessage.sender.email,
              },
              createdAt: lastMessage.createdAt,
            }
          : null,
        lastReadAt: participant?.lastReadAt || null,
        unreadCount: unreadCounts[conversation.id] || 0,
      };
    });
  }

  /**
   * Get paginated messages for a conversation.
   *
   * @param conversationId - ID of the conversation
   * @param userId - ID of the user requesting messages (for access validation)
   * @param page - Page number (1-based)
   * @param limit - Number of messages per page
   * @returns Paginated messages with sender info
   */
  async getConversationMessages(
    conversationId: number,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: any[]; total: number; page: number; limit: number }> {
    // Validate access
    await this.validateConversationAccess(conversationId, userId);

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Reverse to show oldest first
    const reversedMessages = messages.reverse().map((message) => ({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      sender: {
        id: message.sender.id,
        email: message.sender.email,
        role: message.sender.role,
      },
      createdAt: message.createdAt,
    }));

    return {
      messages: reversedMessages,
      total,
      page,
      limit,
    };
  }

  /**
   * Mark a conversation as read for a user.
   * Updates lastReadAt timestamp for the participant.
   *
   * @param conversationId - ID of the conversation
   * @param userId - ID of the user marking as read
   * @returns Updated participant record
   */
  async markAsRead(
    conversationId: number,
    userId: number,
  ): Promise<ConversationParticipant> {
    await this.validateConversationAccess(conversationId, userId);

    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.lastReadAt = new Date();
    const savedParticipant = await this.participantRepository.save(participant);

    // Update unread count for this user
    const unreadCount = await this.getUnreadCount(userId);
    this.messagesGatewayService.broadcastUnreadCount(userId, unreadCount);

    // Broadcast conversation updated event
    const conversationData = await this.getConversation(conversationId, userId);
    const participants = await this.participantRepository.find({
      where: { conversationId },
    });
    const allParticipantIds = participants.map((p) => p.userId);
    this.messagesGatewayService.broadcastConversationUpdated(
      conversationId,
      allParticipantIds,
      conversationData,
    );

    return savedParticipant;
  }

  /**
   * Get total unread message count for a user across all conversations.
   *
   * @param userId - ID of the user
   * @returns Total number of unread messages
   */
  async getUnreadCount(userId: number): Promise<number> {
    const participants = await this.participantRepository.find({
      where: { userId },
    });

    if (participants.length === 0) {
      return 0;
    }

    const conversationIds = participants.map((p) => p.conversationId);
    const counts = await this.getUnreadCountsForConversations(
      userId,
      conversationIds,
    );

    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Validate that a user has access to a conversation (is a participant).
   *
   * @param conversationId - ID of the conversation
   * @param userId - ID of the user to validate
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user is not a participant
   */
  async validateConversationAccess(
    conversationId: number,
    userId: number,
  ): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      // Verify conversation exists
      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }
  }

  /**
   * Get unread message counts for multiple conversations.
   *
   * @param userId - ID of the user
   * @param conversationIds - Array of conversation IDs
   * @returns Object mapping conversationId to unread count
   */
  private async getUnreadCountsForConversations(
    userId: number,
    conversationIds: number[],
  ): Promise<Record<number, number>> {
    if (conversationIds.length === 0) {
      return {};
    }

    const participants = await this.participantRepository.find({
      where: {
        conversationId: In(conversationIds),
        userId,
      },
    });

    const counts: Record<number, number> = {};

    for (const participant of participants) {
      const query = this.messageRepository
        .createQueryBuilder('message')
        .where('message.conversationId = :conversationId', {
          conversationId: participant.conversationId,
        });

      if (participant.lastReadAt) {
        query.andWhere('message.createdAt > :lastReadAt', {
          lastReadAt: participant.lastReadAt,
        });
      }

      const count = await query.getCount();
      counts[participant.conversationId] = count;
    }

    return counts;
  }

  /**
   * Get conversation details by ID.
   *
   * @param conversationId - ID of the conversation
   * @param userId - ID of the user requesting (for access validation)
   * @returns Conversation entity with participants
   */
  async getConversation(conversationId: number, userId: number): Promise<any> {
    await this.validateConversationAccess(conversationId, userId);

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['conversationParticipants', 'conversationParticipants.user'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const otherParticipants = conversation.conversationParticipants
      .filter((p) => p.userId !== userId)
      .map((p) => p.user);

    return {
      id: conversation.id,
      type: conversation.type,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
      participants: otherParticipants.map((p) => ({
        id: p.id,
        email: p.email,
        role: p.role,
      })),
    };
  }
}
