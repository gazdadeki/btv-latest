import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({ default: true })
  eventReminders: boolean;

  @Column({ default: true })
  confirmationDeadlines: boolean;

  @Column({ default: true })
  subscriptionUpdates: boolean;

  @Column({ default: true })
  reservationUpdates: boolean;

  @Column({ default: false })
  adminAlerts: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.notificationPreference)
  @JoinColumn()
  user: User;
}
