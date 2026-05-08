import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AvatarTier {
  FREE = 'FREE',
  GOLD = 'GOLD',
  ADMIN = 'ADMIN',
}

@Entity('avatars')
export class Avatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 64 })
  key: string;

  @Column({ length: 128 })
  filename: string;

  @Column({
    type: 'enum',
    enum: AvatarTier,
  })
  tier: AvatarTier;

  @Column({ type: 'varchar', length: 64, nullable: true })
  displayName: string | null;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
