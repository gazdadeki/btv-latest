import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Entity representing a Stripe payment method linked to a user.
 * Tracks payment methods (cards, etc.) that users have added for payments.
 */
@Entity('stripe_payment_methods')
@Index('IDX_stripe_payment_methods_userId', ['userId'])
@Index('UQ_stripe_payment_methods_paymentMethodId', ['stripePaymentMethodId'], {
  unique: true,
})
export class StripePaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  stripePaymentMethodId: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  last4: string | null;

  @Column({ nullable: true })
  brand: string | null;

  @Column({ nullable: true })
  expMonth: number | null;

  @Column({ nullable: true })
  expYear: number | null;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.stripePaymentMethods)
  user: User;
}
