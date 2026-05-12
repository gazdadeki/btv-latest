import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SlotConfig } from './slot-config.entity';

export enum RecurrenceType {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ONCE = 'ONCE',
}

export enum RefundPolicy {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  NONE = 'NONE',
}

@Entity('schedules')
@Index(['createdBy'])
@Index(['isActive'])
@Index(['deletedAt'])
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  createdBy: number;

  @Column({
    type: 'enum',
    enum: RecurrenceType,
  })
  recurrenceType: RecurrenceType;

  @Column({ type: 'json', nullable: true })
  recurrenceDays: number[] | null;

  @Column({ type: 'json', nullable: true })
  recurrencePattern: { year?: number; month: number; day: number } | null;

  @Column()
  slotsPerGame: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reservationCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  instantReservationCost: number | null;

  @Column()
  confirmationWindowMinutes: number;

  @Column({
    type: 'enum',
    enum: RefundPolicy,
    default: RefundPolicy.NONE,
  })
  refundPolicy: RefundPolicy;

  @Column({ type: 'int', nullable: true })
  refundPercentage: number | null;

  @Column({ default: false })
  isExclusiveToGold: boolean;

  @Column({ type: 'time' })
  firstGameStartTime: string;

  @Column({ type: 'time', default: '06:00' })
  gameCreationTime: string;

  @Column({ type: 'time', nullable: true })
  reservationOpenTime: string | null;

  @Column({ default: false })
  requiresConfirmation: boolean;

  @Column({ default: 1 })
  gamesPerDay: number;

  @Column()
  teamAName: string;

  @Column()
  teamBName: string;

  @Column({ type: 'json', nullable: true })
  preAssignedUsers: Array<{
    userId: number;
    slotNumber: number;
    team: 'A' | 'B';
  }> | null;

  @Column({ type: 'json', nullable: true })
  reminderMinutesBefore: number[] | null;

  @Column({ type: 'date', nullable: true })
  scheduleStartDate: string | null;

  @Column({ type: 'date', nullable: true })
  scheduleEndDate: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ nullable: true })
  deletedBy: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  createdByUser: User;

  @OneToMany(() => SlotConfig, (slotConfig) => slotConfig.schedule)
  slotConfigs: SlotConfig[];
}
