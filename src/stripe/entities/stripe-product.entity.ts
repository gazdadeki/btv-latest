import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { StripePayment } from './stripe-payment.entity';

export enum StripeProductType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  COIN_PACK = 'COIN_PACK',
}

@Entity('stripe_products')
@Index(['type'])
@Index(['isActive'])
export class StripeProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  stripeProductId: string;

  @Column({ nullable: true })
  stripePriceId: string | null;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: StripeProductType,
  })
  type: StripeProductType;

  @Column({ type: 'json' })
  productData: {
    tier?: string;
    billingPeriod?: string;
    coins?: number;
    price: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => StripePayment, (payment) => payment.stripeProduct)
  stripePayments: StripePayment[];
}
