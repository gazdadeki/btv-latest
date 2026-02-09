import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Schedule } from './schedule.entity';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../games/entities/slot.entity';

@Entity('slot_configs')
@Index(['scheduleId'])
@Index(['slotNumber'])
@Index(['team'])
@Unique(['scheduleId', 'slotNumber', 'team'])
export class SlotConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  scheduleId: number;

  @Column()
  slotNumber: number;

  @Column({
    type: 'enum',
    enum: ['A', 'B'],
  })
  team: Team;

  @Column({ default: false })
  isGoldOnly: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  coinsCost: number | null;

  @Column({ nullable: true })
  preAssignedUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Schedule, (schedule) => schedule.slotConfigs, {
    onDelete: 'CASCADE',
  })
  schedule: Schedule;

  @ManyToOne(() => User, { nullable: true })
  preAssignedUser: User | null;
}
