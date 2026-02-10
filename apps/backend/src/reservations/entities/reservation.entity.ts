import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Slot } from '../../games/entities/slot.entity';
import { User } from '../../users/entities/user.entity';
import { Game } from '../../games/entities/game.entity';

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('reservations')
@Index(['userId'])
@Index(['gameId'])
@Index(['status'])
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  slotId: number;

  @Column()
  userId: number;

  @Column()
  gameId: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.RESERVED,
  })
  status: ReservationStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reservationCostPaid: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  confirmationCostPaid: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalCostPaid: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountApplied: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalCost: number | null;

  @Column({ type: 'datetime' })
  reservedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expiredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Slot, (slot) => slot.reservation)
  slot: Slot;

  @ManyToOne(() => User, (user) => user.reservations)
  user: User;

  @ManyToOne(() => Game, (game) => game.reservations)
  game: Game;
}
