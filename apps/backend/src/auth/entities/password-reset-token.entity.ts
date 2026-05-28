import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Entity for storing password reset tokens.
 * Tokens are unique, expire after a configured time, and can be used only once.
 */
@Entity('password_reset_tokens')
@Index(['userId'])
@Index(['expiresAt'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  /**
   * SHA-256 hash (64-char hex) of the password reset token. The plaintext token
   * is emailed to the user and never persisted — a DB read leak yields only hashes.
   */
  @Column({ unique: true, length: 64 })
  token: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  user: User;
}
