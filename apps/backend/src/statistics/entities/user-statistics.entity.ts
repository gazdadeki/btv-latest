import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_statistics')
export class UserStatistics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({ default: 0 })
  totalWins: number;

  @Column({ default: 0 })
  totalLosses: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCoinsSpent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCoinsEarned: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.statistics)
  @JoinColumn()
  user: User;
}
