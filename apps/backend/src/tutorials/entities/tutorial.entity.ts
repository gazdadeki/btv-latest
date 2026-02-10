import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tag } from './tag.entity';
import { Category } from './category.entity';

/**
 * Tutorial status enumeration.
 *
 * DRAFT: Tutorial is being worked on and not visible to players
 * PUBLISHED: Tutorial is live and visible to players
 */
export enum TutorialStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

/**
 * Tutorial entity representing a tutorial/post/article.
 *
 * Tutorials are content pieces that admins can create and manage.
 * They support markdown content, tags, categories, and have features
 * like featured flag, view counts, and draft/published status.
 *
 * @property {number} id - Primary key
 * @property {string} title - Tutorial title
 * @property {string} slug - URL-friendly slug (unique, auto-generated)
 * @property {string} body - Markdown content body
 * @property {string} excerpt - Short description/excerpt
 * @property {TutorialStatus} status - Publication status (DRAFT or PUBLISHED)
 * @property {boolean} featured - Whether tutorial is featured/pinned
 * @property {number} viewCount - Number of times tutorial was viewed
 * @property {number} authorId - Foreign key to User (admin who created it)
 * @property {Date} createdAt - When the tutorial was created
 * @property {Date} updatedAt - When the tutorial was last updated
 * @property {User} author - The admin user who created this tutorial
 * @property {Tag[]} tags - Tags associated with this tutorial
 * @property {Category[]} categories - Categories this tutorial belongs to
 */
@Entity('tutorials')
@Index(['status'])
@Index(['featured'])
@Index(['authorId'])
@Index(['createdAt'])
export class Tutorial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  @Column({
    type: 'enum',
    enum: TutorialStatus,
    default: TutorialStatus.DRAFT,
  })
  status: TutorialStatus;

  @Column({ default: false })
  featured: boolean;

  @Column({ default: 0 })
  viewCount: number;

  @Column()
  authorId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToMany(() => Tag, (tag) => tag.tutorials, { cascade: false })
  @JoinTable({
    name: 'tutorial_tags',
    joinColumn: { name: 'tutorialId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @ManyToMany(() => Category, (category) => category.tutorials, {
    cascade: false,
  })
  @JoinTable({
    name: 'tutorial_categories',
    joinColumn: { name: 'tutorialId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];
}
