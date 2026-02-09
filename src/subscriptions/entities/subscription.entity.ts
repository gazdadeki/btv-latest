import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StripePayment } from '../../stripe/entities/stripe-payment.entity';

export enum SubscriptionTier {
  FREE = 'FREE',
  GOLD = 'GOLD',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  SIX_MONTHS = 'SIX_MONTHS',
  YEARLY = 'YEARLY',
}

@Entity('subscriptions')
@Index(['stripeSubscriptionId'], {
  unique: true,
  where: 'stripeSubscriptionId IS NOT NULL',
})
@Index(['status'])
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
  })
  tier: SubscriptionTier;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: BillingPeriod,
    nullable: true,
  })
  billingPeriod: BillingPeriod | null;

  @Column({ nullable: true })
  stripeSubscriptionId: string | null;

  @Column({ nullable: true })
  stripeCustomerId: string | null;

  @Column({ type: 'datetime', nullable: true })
  currentPeriodStart: Date | null;

  @Column({ type: 'datetime', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'datetime', nullable: true })
  canceledAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.subscription)
  @JoinColumn()
  user: User;

  @OneToMany(() => StripePayment, (payment) => payment.subscription)
  payments: StripePayment[];
}
