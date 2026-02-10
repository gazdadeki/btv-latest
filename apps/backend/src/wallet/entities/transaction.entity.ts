import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { StripePayment } from '../../stripe/entities/stripe-payment.entity';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  RESERVATION_COST = 'RESERVATION_COST',
  CONFIRMATION_COST = 'CONFIRMATION_COST',
  REFUND = 'REFUND',
  REWARD = 'REWARD',
  STRIPE_PURCHASE = 'STRIPE_PURCHASE',
}

@Entity('transactions')
@Index(['walletId'])
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  walletId: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ nullable: true })
  reservationId: number | null;

  @Column({ nullable: true })
  stripePaymentId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  wallet: Wallet;

  @ManyToOne(() => Reservation, { nullable: true })
  reservation: Reservation | null;

  @ManyToOne(() => StripePayment, { nullable: true })
  stripePayment: StripePayment | null;
}
