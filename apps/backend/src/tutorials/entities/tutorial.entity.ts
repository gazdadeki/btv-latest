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
 * They support markdown content, tags, categories, view counts, and
 * draft/published status.
 *
 * @property {number} id - Primary key
 * @property {string} title - Tutorial title
 * @property {string} slug - URL-friendly slug (unique, auto-generated)
 * @property {string} body - Markdown content body
 * @property {string} excerpt - Short description/excerpt
 * @property {TutorialStatus} status - Publication status (DRAFT or PUBLISHED)
 * @property {number} viewCount - Number of times tutorial was viewed
 * @property {number} authorId - Foreign key to User (admin who created it)
 * @property {Date} createdAt - When the tutorial was created
 * @property {Date} updatedAt - When the tutorial was last updated
 * @property {User} author - The admin user who created this tutorial
 * @property {number} categoryId - Foreign key to Category (each tutorial belongs to one category)
 * @property {Category} category - The category this tutorial belongs to
 * @property {Tag[]} tags - Tags associated with this tutorial
 */
@Entity('tutorials')
@Index(['status'])
@Index(['authorId'])
@Index(['categoryId'])
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

  @Column({ type: 'varchar', length: 500, nullable: true })
  youtubeUrl: string | null;

  @Column({
    type: 'enum',
    enum: TutorialStatus,
    default: TutorialStatus.DRAFT,
  })
  status: TutorialStatus;

  @Column({ default: 0 })
  viewCount: number;

  @Column()
  authorId: number;

  @Column()
  categoryId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => Category, (category) => category.tutorials, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ManyToMany(() => Tag, (tag) => tag.tutorials, { cascade: false })
  @JoinTable({
    name: 'tutorial_tags',
    joinColumn: { name: 'tutorialId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];
}
