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
import { Schedule } from '../../schedules/entities/schedule.entity';
import { Stream } from '../../streams/entities/stream.entity';
import { Slot } from './slot.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

export enum GameStatus {
  CREATED = 'CREATED',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

@Entity('games')
@Index(['scheduleId'])
@Index(['status'])
@Index(['scheduledStartTime'])
@Index(['generationBatchId'])
@Index(['streamId'])
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  scheduleId: number;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.CREATED,
  })
  status: GameStatus;

  @Column({ type: 'datetime' })
  scheduledStartTime: Date;

  @Column({ type: 'datetime', nullable: true })
  actualStartTime: Date | null;

  @Column({ type: 'datetime', nullable: true })
  actualEndTime: Date | null;

  @Column({ nullable: true })
  durationMinutes: number | null;

  @Column()
  teamAName: string;

  @Column()
  teamBName: string;

  @Column({ default: false })
  isExclusiveToGold: boolean;

  @Column({ type: 'enum', enum: ['A', 'B'], nullable: true })
  winningTeam: 'A' | 'B' | null;

  @Column({ nullable: true })
  mvpUserId: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string | null;

  /**
   * UUID to group games generated in the same batch.
   * All games created during a single generation run share the same batch ID.
   */
  @Column({ type: 'varchar', length: 36, nullable: true })
  generationBatchId: string | null;

  /**
   * Index of this game within the generation batch (1, 2, 3...).
   * Indicates the order of the game within the batch.
   */
  @Column({ type: 'int', nullable: true })
  gameIndex: number | null;

  @Column({ type: 'int', nullable: true })
  streamId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Schedule, (schedule) => schedule.games)
  schedule: Schedule;

  @ManyToOne(() => Stream, (stream) => stream.games, { nullable: true })
  stream: Stream | null;

  @OneToMany(() => Slot, (slot) => slot.game)
  slots: Slot[];

  @OneToMany(() => Reservation, (reservation) => reservation.game)
  reservations: Reservation[];
}
