import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';

/**
 * ConversationParticipant entity representing the join table between conversations and users.
 *
 * Tracks when a user joined a conversation and their last read timestamp for unread message tracking.
 *
 * @property {number} id - Primary key
 * @property {number} conversationId - Foreign key to Conversation
 * @property {number} userId - Foreign key to User
 * @property {Date} joinedAt - When the user joined the conversation
 * @property {Date} lastReadAt - Timestamp of the last message read by this user (null if unread)
 * @property {Conversation} conversation - The conversation this participant belongs to
 * @property {User} user - The user participating in the conversation
 */
@Entity('conversation_participants')
@Index(['conversationId'])
@Index(['userId'])
@Index(['lastReadAt'])
@Unique(['conversationId', 'userId'])
export class ConversationParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @Column()
  userId: number;

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastReadAt: Date | null;

  @ManyToOne(
    () => Conversation,
    (conversation) => conversation.conversationParticipants,
    {
      onDelete: 'CASCADE',
    },
  )
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
