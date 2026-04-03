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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Game, (game) => game.slots)
  game: Game;

  @OneToOne(() => Reservation, (reservation) => reservation.slot, {
    nullable: true,
  })
  reservation: Reservation | null;
}
