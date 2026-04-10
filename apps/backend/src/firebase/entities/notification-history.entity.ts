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
  STREAM_START = 'STREAM_START',
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
