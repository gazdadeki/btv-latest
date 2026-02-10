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
 * Category entity for organizing tutorials into groups.
 *
 * Categories provide a hierarchical organization system for tutorials.
 * Each category can have a description and is associated with multiple tutorials.
 *
 * @property {number} id - Primary key
 * @property {string} name - Category name (unique)
 * @property {string} slug - URL-friendly slug (unique, auto-generated)
 * @property {string} description - Category description (optional)
 * @property {Date} createdAt - When the category was created
 * @property {Date} updatedAt - When the category was last updated
 * @property {Tutorial[]} tutorials - Tutorials in this category
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Tutorial, (tutorial) => tutorial.categories)
  tutorials: Tutorial[];
}
