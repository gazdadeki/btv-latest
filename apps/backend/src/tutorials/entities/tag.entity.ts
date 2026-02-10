import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tutorial } from './tutorial.entity';

/**
 * Tag entity for categorizing tutorials.
 *
 * Tags are used to label tutorials with keywords for better organization
 * and searchability. Each tag has a unique name and slug.
 *
 * @property {number} id - Primary key
 * @property {string} name - Tag name (unique)
 * @property {string} slug - URL-friendly slug (unique, auto-generated)
 * @property {Date} createdAt - When the tag was created
 * @property {Date} updatedAt - When the tag was last updated
 * @property {Tutorial[]} tutorials - Tutorials associated with this tag
 */
@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Tutorial, (tutorial) => tutorial.tags)
  tutorials: Tutorial[];
}
