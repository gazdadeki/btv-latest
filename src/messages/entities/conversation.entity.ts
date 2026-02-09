import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Message } from './message.entity';
import { ConversationParticipant } from './conversation-participant.entity';

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

/**
 * Conversation entity representing a chat conversation between users.
 *
 * A conversation can be:
 * - DIRECT: One-on-one conversation between a player and an admin
 * - GROUP: Multiple participants (player + multiple admins)
 *
 * @property {number} id - Primary key
 * @property {ConversationType} type - Type of conversation (DIRECT or GROUP)
 * @property {Date} createdAt - When the conversation was created
 * @property {Date} updatedAt - When the conversation was last updated
 * @property {Date} lastMessageAt - Timestamp of the last message (for sorting)
 * @property {User[]} participants - All users participating in the conversation
 * @property {Message[]} messages - All messages in the conversation
 * @property {ConversationParticipant[]} conversationParticipants - Join table entries
 */
@Entity('conversations')
@Index(['lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @OneToMany(
    () => ConversationParticipant,
    (participant) => participant.conversation,
  )
  conversationParticipants: ConversationParticipant[];
}
