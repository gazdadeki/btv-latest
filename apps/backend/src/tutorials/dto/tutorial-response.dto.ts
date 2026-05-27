import { Tutorial, TutorialStatus } from '../entities/tutorial.entity';
import { AvatarsService } from '../../avatars/avatars.service';

export interface TutorialAuthorResponse {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface TutorialTagResponse {
  id: number;
  name: string;
  slug: string;
}

export interface TutorialCategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface TutorialResponse {
  id: number;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  youtubeUrl: string | null;
  status: TutorialStatus;
  viewCount: number;
  authorId: number;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
  author: TutorialAuthorResponse | null;
  category: TutorialCategoryResponse | null;
  tags: TutorialTagResponse[];
}

export function toTutorialResponse(tutorial: Tutorial): TutorialResponse {
  return {
    id: tutorial.id,
    title: tutorial.title,
    slug: tutorial.slug,
    body: tutorial.body,
    excerpt: tutorial.excerpt,
    youtubeUrl: tutorial.youtubeUrl,
    status: tutorial.status,
    viewCount: tutorial.viewCount,
    authorId: tutorial.authorId,
    categoryId: tutorial.categoryId,
    createdAt: tutorial.createdAt,
    updatedAt: tutorial.updatedAt,
    author: tutorial.author
      ? {
          id: tutorial.author.id,
          username: tutorial.author.username,
          avatarUrl: tutorial.author.avatar
            ? AvatarsService.buildUrl(tutorial.author.avatar.filename)
            : null,
        }
      : null,
    category: tutorial.category
      ? {
          id: tutorial.category.id,
          name: tutorial.category.name,
          slug: tutorial.category.slug,
          description: tutorial.category.description,
        }
      : null,
    tags: (tutorial.tags ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
    })),
  };
}
