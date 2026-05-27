import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Avatar } from '../../avatars/entities/avatar.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { UserStatistics } from '../../statistics/entities/user-statistics.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { VerificationCode } from '../../verification/entities/verification-code.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { StripePayment } from '../../stripe/entities/stripe-payment.entity';
import { StripePaymentMethod } from '../../stripe/entities/stripe-payment-method.entity';
import { DeviceToken } from '../../firebase/entities/device-token.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';

export enum UserRole {
  ADMIN = 'admin',
  PLAYER = 'player',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  GOLD = 'GOLD',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Index('IDX_users_username')
  username: string;

  @Exclude({ toPlainOnly: true })
  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PLAYER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  subscriptionTier: SubscriptionTier;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'datetime', nullable: true })
  bannedUntil: Date | null;

  @Column({ default: false })
  isVoided: boolean;

  @Column({ nullable: true })
  voidedBy: number | null;

  @Column({ type: 'datetime', nullable: true })
  voidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  voidReason: string | null;

  /**
   * DB-enforcement plumbing for "at most one ACTIVE account per username".
   * Holds `username` while the account is active (voidedAt IS NULL) and NULL
   * once voided. The UQ_users_username_active unique index over it collides on
   * two active rows sharing a name, while voided rows (all NULL — distinct in
   * MySQL) free the name for reuse. MySQL has no partial/filtered unique index,
   * hence this STORED generated column. Derived entirely from `username` +
   * `voidedAt`; never read or written by application code. See migration
   * 1786000000000-EnforceSingleActiveUsername.
   */
  @Exclude({ toPlainOnly: true })
  @Index('UQ_users_username_active', { unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
    // Read-only: the DB computes this. TypeORM does NOT auto-exclude
    // asExpression columns from INSERT/UPDATE, so mark it explicitly or it
    // gets written (MySQL then rejects any non-DEFAULT value on a generated
    // column).
    insert: false,
    update: false,
    asExpression: 'CASE WHEN `voidedAt` IS NULL THEN `username` ELSE NULL END',
    generatedType: 'STORED',
  })
  usernameActive: string | null;

  @Column({ nullable: true })
  fullName: string | null;

  @Column({ nullable: true })
  addressLine1: string | null;

  @Column({ nullable: true })
  addressLine2: string | null;

  @Column({ nullable: true })
  city: string | null;

  @Column({ nullable: true })
  state: string | null;

  @Column({ nullable: true })
  country: string | null;

  @Column({ nullable: true })
  zipcode: string | null;

  @Column({ nullable: true })
  stripeCustomerId: string | null;

  @Column({ nullable: true })
  avatarId: number | null;

  @ManyToOne(() => Avatar, { nullable: true, eager: true })
  @JoinColumn({ name: 'avatarId' })
  avatar: Avatar | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];

  @OneToOne(() => UserStatistics, (statistics) => statistics.user)
  statistics: UserStatistics;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => VerificationCode, (code) => code.user)
  verificationCodes: VerificationCode[];

  @OneToOne(() => Subscription, (subscription) => subscription.user)
  subscription: Subscription;

  @OneToMany(() => StripePayment, (payment) => payment.user)
  stripePayments: StripePayment[];

  @OneToMany(() => StripePaymentMethod, (paymentMethod) => paymentMethod.user)
  stripePaymentMethods: StripePaymentMethod[];

  @OneToMany(() => DeviceToken, (token) => token.user)
  deviceTokens: DeviceToken[];

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs: AuditLog[];
}
