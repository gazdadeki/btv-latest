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
import { Game } from '../../games/entities/game.entity';

export enum StreamStatus {
  PENDING = 'PENDING',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
}

@Entity('streams')
@Index(['status'])
@Index(['scheduleId'])
export class Stream {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  scheduleId: number;

  @Column({
    type: 'enum',
    enum: StreamStatus,
    default: StreamStatus.PENDING,
  })
  status: StreamStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Schedule)
  schedule: Schedule;

  @OneToMany(() => Game, (game) => game.stream)
  games: Game[];
}
