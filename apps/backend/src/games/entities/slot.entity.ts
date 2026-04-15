import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Game } from './game.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { User } from '../../users/entities/user.entity';

export enum Team {
  A = 'A',
  B = 'B',
}

export const TEAM_NAMES: Record<Team, string> = {
  [Team.A]: 'Sentinel',
  [Team.B]: 'Scourge',
};

@Entity('slots')
@Index(['gameId'])
@Index(['team'])
export class Slot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gameId: number;

  @Column()
  slotNumber: number;

  @Column({
    type: 'enum',
    enum: Team,
  })
  team: Team;

  @Column({ default: false })
  isReserved: boolean;

  @Column({ nullable: true })
  reservedByUserId: number | null;

  @Column({ default: false })
  isPreAssigned: boolean;

  @Column({ nullable: true })
  preAssignedUserId: number | null;

  @Column({ default: false })
  isGoldOnly: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Game, (game) => game.slots)
  game: Game;

  @ManyToOne(() => User, { nullable: true })
  reservedByUser: User | null;

  @ManyToOne(() => User, { nullable: true })
  preAssignedUser: User | null;

  @OneToOne(() => Reservation, (reservation) => reservation.slot, {
    nullable: true,
  })
  reservation: Reservation | null;
}
