import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StripeProduct } from './stripe-product.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

export enum StripePaymentType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  COIN_PACK = 'COIN_PACK',
}

export enum StripePaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

@Entity('stripe_payments')
@Index(['userId'])
@Index(['status'])
@Index(['type'])
export class StripePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  stripeProductId: number;

  @Column({ unique: true })
  stripePaymentIntentId: string;

  @Column()
  stripeCustomerId: string;

  @Column({
    type: 'enum',
    enum: StripePaymentType,
  })
  type: StripePaymentType;

  @Column({
    type: 'enum',
    enum: StripePaymentStatus,
    default: StripePaymentStatus.PENDING,
  })
  status: StripePaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'usd' })
  currency: string;

  @Column({ nullable: true })
  coinsGranted: number | null;

  @Column({ nullable: true })
  subscriptionId: number | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.stripePayments)
  user: User;

  @ManyToOne(() => StripeProduct, (product) => product.stripePayments)
  stripeProduct: StripeProduct;

  @ManyToOne(() => Subscription, (subscription) => subscription.payments, {
    nullable: true,
  })
  subscription: Subscription | null;
}
