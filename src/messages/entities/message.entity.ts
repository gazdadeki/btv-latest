import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Message entity representing a single message in a conversation.
 *
 * @property {number} id - Primary key
 * @property {number} conversationId - Foreign key to Conversation
 * @property {number} senderId - Foreign key to User (message sender)
 * @property {string} content - Message text content
 * @property {Date} createdAt - When the message was created
 * @property {Date} updatedAt - When the message was last updated
 * @property {Conversation} conversation - The conversation this message belongs to
 * @property {User} sender - The user who sent this message
 */
@Entity('messages')
@Index(['conversationId'])
@Index(['createdAt'])
@Index(['senderId'])
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @Column()
  senderId: number;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  sender: User;
}
