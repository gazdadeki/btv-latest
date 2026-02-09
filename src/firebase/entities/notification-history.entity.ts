import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DeviceToken } from './device-token.entity';

export enum NotificationType {
  EVENT_REMINDER = 'EVENT_REMINDER',
  CONFIRMATION_DEADLINE = 'CONFIRMATION_DEADLINE',
  SUBSCRIPTION_UPDATE = 'SUBSCRIPTION_UPDATE',
  RESERVATION_UPDATE = 'RESERVATION_UPDATE',
  ADMIN_ALERT = 'ADMIN_ALERT',
  SCHEDULE_START = 'SCHEDULE_START',
  SCHEDULE_FINISHED = 'SCHEDULE_FINISHED',
  FIRST_GAME_START = 'FIRST_GAME_START',
  GAME_START = 'GAME_START',
  LAST_GAME_START = 'LAST_GAME_START',
  FIRST_GAME_FINISH = 'FIRST_GAME_FINISH',
  GAME_FINISH = 'GAME_FINISH',
  LAST_GAME_FINISH = 'LAST_GAME_FINISH',
}

export enum NotificationStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

@Entity('notification_history')
@Index(['userId'])
@Index(['type'])
@Index(['status'])
@Index(['createdAt'])
export class NotificationHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ nullable: true })
  deviceTokenId: number | null;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ nullable: true })
  fcmMessageId: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'datetime', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => DeviceToken, { nullable: true })
  deviceToken: DeviceToken | null;
}
