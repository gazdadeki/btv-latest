import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index(['userId'])
@Index(['expiresAt'])
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  /**
   * SHA-256 hash (64-char hex) of the refresh token — the plaintext token is
   * never stored, only its digest, so a DB leak yields no usable tokens. The
   * fixed length lets us put a real UNIQUE index on it, which also enforces
   * one-row-per-token and is the backstop for future reuse detection.
   */
  @Index('UQ_refresh_tokens_token', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  token: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens)
  user: User;
}
