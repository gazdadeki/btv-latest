import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tutorial, TutorialStatus } from './entities/tutorial.entity';
import { Tag } from './entities/tag.entity';
import { Category } from './entities/category.entity';
import { CreateTutorialDto } from './dto/create-tutorial.dto';
import { UpdateTutorialDto } from './dto/update-tutorial.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * Service for managing tutorials, tags, and categories.
 *
 * Provides CRUD operations for tutorials with support for:
 * - Slug generation and uniqueness validation
 * - Tag and category associations
 * - View count tracking
 * - Status management (DRAFT/PUBLISHED)
 *
 * @property {Logger} logger - Logger instance for this service
 */
@Injectable()
export class TutorialsService {
  private readonly logger = new Logger(TutorialsService.name);

  constructor(
    @InjectRepository(Tutorial)
    private tutorialsRepository: Repository<Tutorial>,
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  /**
   * Generate a URL-friendly slug from a string.
   *
   * Converts text to lowercase, replaces spaces and special characters
   * with hyphens, and removes consecutive hyphens.
   *
   * @param text - Text to convert to slug
   * @returns URL-friendly slug string
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Generate a unique slug by appending a number if the slug already exists.
   *
   * @param baseSlug - Base slug to make unique
   * @param excludeId - Optional tutorial ID to exclude from uniqueness check (for updates)
   * @returns Unique slug string
   */
  private async generateUniqueSlug(
    baseSlug: string,
    excludeId?: number,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.tutorialsRepository.findOne({
        where: { slug },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Generate a unique tag slug by appending a number if the slug already exists.
   *
   * @param baseSlug - Base slug to make unique
   * @param excludeId - Optional tag ID to exclude from uniqueness check (for updates)
   * @returns Unique slug string
   */
  private async generateUniqueTagSlug(
    baseSlug: string,
    excludeId?: number,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.tagsRepository.findOne({
        where: { slug },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Generate a unique category slug by appending a number if the slug already exists.
   *
   * @param baseSlug - Base slug to make unique
   * @param excludeId - Optional category ID to exclude from uniqueness check (for updates)
   * @returns Unique slug string
   */
  private async generateUniqueCategorySlug(
    baseSlug: string,
    excludeId?: number,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.categoriesRepository.findOne({
        where: { slug },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Create a new tutorial.
   *
   * @param createTutorialDto - Tutorial creation data
   * @param authorId - ID of admin user creating the tutorial
   * @returns Created tutorial entity with relations
   * @throws ConflictException if slug already exists
   * @throws BadRequestException if tags or categories don't exist
   */
  async create(
    createTutorialDto: CreateTutorialDto,
    authorId: number,
  ): Promise<Tutorial> {
    // Generate slug if not provided
    let slug = createTutorialDto.slug;
    if (!slug) {
      slug = this.generateSlug(createTutorialDto.title);
    } else {
      slug = this.generateSlug(slug);
    }

    // Ensure slug is unique
    slug = await this.generateUniqueSlug(slug);

    // Load tags and categories if provided
    let tags: Tag[] = [];
    let categories: Category[] = [];

    if (createTutorialDto.tagIds && createTutorialDto.tagIds.length > 0) {
      tags = await this.tagsRepository.findBy({
        id: In(createTutorialDto.tagIds),
      });
      if (tags.length !== createTutorialDto.tagIds.length) {
        throw new BadRequestException('One or more tags not found');
      }
    }

    if (
      createTutorialDto.categoryIds &&
      createTutorialDto.categoryIds.length > 0
    ) {
      categories = await this.categoriesRepository.findBy({
        id: In(createTutorialDto.categoryIds),
      });
      if (categories.length !== createTutorialDto.categoryIds.length) {
        throw new BadRequestException('One or more categories not found');
      }
    }

    // Create tutorial
    const tutorial = this.tutorialsRepository.create({
      title: createTutorialDto.title,
      slug,
      body: createTutorialDto.body,
      excerpt: createTutorialDto.excerpt || null,
      status: createTutorialDto.status || TutorialStatus.DRAFT,
      featured: createTutorialDto.featured || false,
      authorId,
      tags,
      categories,
    });

    const saved = await this.tutorialsRepository.save(tutorial);

    this.logger.log(`Created tutorial: ${saved.id} - ${saved.title}`);

    return this.findOne(saved.id);
  }

  /**
   * Find all tutorials with optional filters.
   *
   * @param filters - Optional filters (status, featured, categoryId, tagId, search)
   * @returns Array of tutorial entities
   */
  async findAll(filters?: {
    status?: TutorialStatus;
    featured?: boolean;
    categoryId?: number;
    tagId?: number;
    search?: string;
  }): Promise<Tutorial[]> {
    const queryBuilder = this.tutorialsRepository
      .createQueryBuilder('tutorial')
      .leftJoinAndSelect('tutorial.author', 'author')
      .leftJoinAndSelect('tutorial.tags', 'tags')
      .leftJoinAndSelect('tutorial.categories', 'categories')
      .orderBy('tutorial.createdAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('tutorial.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.featured !== undefined) {
      queryBuilder.andWhere('tutorial.featured = :featured', {
        featured: filters.featured,
      });
    }

    if (filters?.categoryId) {
      queryBuilder.andWhere('categories.id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.tagId) {
      queryBuilder.andWhere('tags.id = :tagId', { tagId: filters.tagId });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(tutorial.title LIKE :search OR tutorial.excerpt LIKE :search OR tutorial.body LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return queryBuilder.getMany();
  }

  /**
   * Find a single tutorial by ID.
   *
   * @param id - Tutorial ID
   * @returns Tutorial entity with relations
   * @throws NotFoundException if tutorial not found
   */
  async findOne(id: number): Promise<Tutorial> {
    const tutorial = await this.tutorialsRepository.findOne({
      where: { id },
      relations: ['author', 'tags', 'categories'],
    });

    if (!tutorial) {
      throw new NotFoundException(`Tutorial with ID ${id} not found`);
    }

    return tutorial;
  }

  /**
   * Find a tutorial by slug.
   *
   * @param slug - Tutorial slug
   * @returns Tutorial entity with relations
   * @throws NotFoundException if tutorial not found
   */
  async findBySlug(slug: string): Promise<Tutorial> {
    const tutorial = await this.tutorialsRepository.findOne({
      where: { slug },
      relations: ['author', 'tags', 'categories'],
    });

    if (!tutorial) {
      throw new NotFoundException(`Tutorial with slug "${slug}" not found`);
    }

    return tutorial;
  }

  /**
   * Increment view count for a tutorial.
   *
   * @param id - Tutorial ID
   * @returns Updated tutorial entity
   */
  async incrementViewCount(id: number): Promise<Tutorial> {
    await this.tutorialsRepository.increment({ id }, 'viewCount', 1);
    return this.findOne(id);
  }

  /**
   * Update an existing tutorial.
   *
   * @param id - Tutorial ID
   * @param updateTutorialDto - Update data
   * @returns Updated tutorial entity
   * @throws NotFoundException if tutorial not found
   * @throws ConflictException if new slug already exists
   * @throws BadRequestException if tags or categories don't exist
   */
  async update(
    id: number,
    updateTutorialDto: UpdateTutorialDto,
  ): Promise<Tutorial> {
    const tutorial = await this.findOne(id);

    // Handle slug update
    if (updateTutorialDto.slug !== undefined) {
      const newSlug = this.generateSlug(updateTutorialDto.slug);
      tutorial.slug = await this.generateUniqueSlug(newSlug, id);
    } else if (updateTutorialDto.title !== undefined) {
      // Regenerate slug if title changed but slug wasn't explicitly provided
      const newSlug = this.generateSlug(updateTutorialDto.title);
      tutorial.slug = await this.generateUniqueSlug(newSlug, id);
    }

    // Update basic fields
    if (updateTutorialDto.title !== undefined) {
      tutorial.title = updateTutorialDto.title;
    }
    if (updateTutorialDto.body !== undefined) {
      tutorial.body = updateTutorialDto.body;
    }
    if (updateTutorialDto.excerpt !== undefined) {
      tutorial.excerpt = updateTutorialDto.excerpt;
    }
    if (updateTutorialDto.status !== undefined) {
      tutorial.status = updateTutorialDto.status;
    }
    if (updateTutorialDto.featured !== undefined) {
      tutorial.featured = updateTutorialDto.featured;
    }

    // Handle tags update
    if (updateTutorialDto.tagIds !== undefined) {
      if (updateTutorialDto.tagIds.length === 0) {
        tutorial.tags = [];
      } else {
        const tags = await this.tagsRepository.findBy({
          id: In(updateTutorialDto.tagIds),
        });
        if (tags.length !== updateTutorialDto.tagIds.length) {
          throw new BadRequestException('One or more tags not found');
        }
        tutorial.tags = tags;
      }
    }

    // Handle categories update
    if (updateTutorialDto.categoryIds !== undefined) {
      if (updateTutorialDto.categoryIds.length === 0) {
        tutorial.categories = [];
      } else {
        const categories = await this.categoriesRepository.findBy({
          id: In(updateTutorialDto.categoryIds),
        });
        if (categories.length !== updateTutorialDto.categoryIds.length) {
          throw new BadRequestException('One or more categories not found');
        }
        tutorial.categories = categories;
      }
    }

    const saved = await this.tutorialsRepository.save(tutorial);

    this.logger.log(`Updated tutorial: ${saved.id} - ${saved.title}`);

    return this.findOne(saved.id);
  }

  /**
   * Delete a tutorial.
   *
   * @param id - Tutorial ID
   * @throws NotFoundException if tutorial not found
   */
  async remove(id: number): Promise<void> {
    const tutorial = await this.findOne(id);
    await this.tutorialsRepository.remove(tutorial);
    this.logger.log(`Deleted tutorial: ${id} - ${tutorial.title}`);
  }

  /**
   * Create a new tag.
   *
   * @param createTagDto - Tag creation data
   * @returns Created tag entity
   * @throws ConflictException if tag name already exists
   */
  async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    const slug = this.generateSlug(createTagDto.name);

    // Check if tag with same name or slug exists
    const existing = await this.tagsRepository.findOne({
      where: [{ name: createTagDto.name }, { slug }],
    });

    if (existing) {
      throw new ConflictException(
        `Tag with name "${createTagDto.name}" or slug "${slug}" already exists`,
      );
    }

    const tag = this.tagsRepository.create({
      name: createTagDto.name,
      slug,
    });

    const saved = await this.tagsRepository.save(tag);
    this.logger.log(`Created tag: ${saved.id} - ${saved.name}`);
    return saved;
  }

  /**
   * Find all tags.
   *
   * @returns Array of tag entities
   */
  async findAllTags(): Promise<Tag[]> {
    return this.tagsRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Create a new category.
   *
   * @param createCategoryDto - Category creation data
   * @returns Created category entity
   * @throws ConflictException if category name already exists
   */
  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const slug = this.generateSlug(createCategoryDto.name);

    // Check if category with same name or slug exists
    const existing = await this.categoriesRepository.findOne({
      where: [{ name: createCategoryDto.name }, { slug }],
    });

    if (existing) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" or slug "${slug}" already exists`,
      );
    }

    const category = this.categoriesRepository.create({
      name: createCategoryDto.name,
      slug,
      description: createCategoryDto.description || null,
    });

    const saved = await this.categoriesRepository.save(category);
    this.logger.log(`Created category: ${saved.id} - ${saved.name}`);
    return saved;
  }

  /**
   * Find all categories.
   *
   * @returns Array of category entities
   */
  async findAllCategories(): Promise<Category[]> {
    return this.categoriesRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Update an existing tag.
   *
   * @param id - Tag ID
   * @param updateTagDto - Update data
   * @returns Updated tag entity
   * @throws NotFoundException if tag not found
   * @throws ConflictException if new name/slug already exists
   */
  async updateTag(id: number, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.tagsRepository.findOne({ where: { id } });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Handle name update
    if (updateTagDto.name !== undefined) {
      const newSlug = this.generateSlug(updateTagDto.name);

      // Check for conflicts (name or slug)
      const existing = await this.tagsRepository.findOne({
        where: [{ name: updateTagDto.name }, { slug: newSlug }],
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Tag with name "${updateTagDto.name}" or slug "${newSlug}" already exists`,
        );
      }

      tag.name = updateTagDto.name;
      tag.slug = await this.generateUniqueTagSlug(newSlug, id);
    }

    const saved = await this.tagsRepository.save(tag);
    this.logger.log(`Updated tag: ${saved.id} - ${saved.name}`);

    return saved;
  }

  /**
   * Delete a tag.
   *
   * @param id - Tag ID
   * @throws NotFoundException if tag not found
   * @throws BadRequestException if tag is used by any tutorials
   */
  async removeTag(id: number): Promise<void> {
    const tag = await this.tagsRepository.findOne({
      where: { id },
      relations: ['tutorials'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Check if tag is used by any tutorials
    if (tag.tutorials && tag.tutorials.length > 0) {
      throw new BadRequestException(
        `Cannot delete tag "${tag.name}" because it is used by ${tag.tutorials.length} tutorial(s)`,
      );
    }

    await this.tagsRepository.remove(tag);
    this.logger.log(`Deleted tag: ${id} - ${tag.name}`);
  }

  /**
   * Update an existing category.
   *
   * @param id - Category ID
   * @param updateCategoryDto - Update data
   * @returns Updated category entity
   * @throws NotFoundException if category not found
   * @throws ConflictException if new name/slug already exists
   */
  async updateCategory(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Handle name update
    if (updateCategoryDto.name !== undefined) {
      const newSlug = this.generateSlug(updateCategoryDto.name);

      // Check for conflicts (name or slug)
      const existing = await this.categoriesRepository.findOne({
        where: [{ name: updateCategoryDto.name }, { slug: newSlug }],
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" or slug "${newSlug}" already exists`,
        );
      }

      category.name = updateCategoryDto.name;
      category.slug = await this.generateUniqueCategorySlug(newSlug, id);
    }

    // Handle description update
    if (updateCategoryDto.description !== undefined) {
      category.description = updateCategoryDto.description || null;
    }

    const saved = await this.categoriesRepository.save(category);
    this.logger.log(`Updated category: ${saved.id} - ${saved.name}`);

    return saved;
  }

  /**
   * Delete a category.
   *
   * @param id - Category ID
   * @throws NotFoundException if category not found
   * @throws BadRequestException if category is used by any tutorials
   */
  async removeCategory(id: number): Promise<void> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['tutorials'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category is used by any tutorials
    if (category.tutorials && category.tutorials.length > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it is used by ${category.tutorials.length} tutorial(s)`,
      );
    }

    await this.categoriesRepository.remove(category);
    this.logger.log(`Deleted category: ${id} - ${category.name}`);
  }
}
