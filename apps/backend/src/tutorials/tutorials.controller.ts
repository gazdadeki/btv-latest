import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TutorialsService } from './tutorials.service';
import { CreateTutorialDto } from './dto/create-tutorial.dto';
import { UpdateTutorialDto } from './dto/update-tutorial.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { TutorialStatus } from './entities/tutorial.entity';

/**
 * Admin controller for managing tutorials, tags, and categories.
 *
 * All endpoints require admin role authentication.
 * Provides full CRUD operations for tutorials and management of tags/categories.
 */
@ApiTags('Admin Tutorials')
@ApiBearerAuth()
@Controller({ path: 'admin/tutorials', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TutorialsController {
  constructor(private readonly tutorialsService: TutorialsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tutorials with optional filters' })
  @ApiResponse({ status: 200, description: 'List of tutorials' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiQuery({ name: 'status', required: false, enum: TutorialStatus })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'tagId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('status') status?: TutorialStatus,
    @Query('featured') featured?: string,
    @Query('categoryId') categoryId?: string,
    @Query('tagId') tagId?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (featured !== undefined) filters.featured = featured === 'true';
    if (categoryId) filters.categoryId = parseInt(categoryId, 10);
    if (tagId) filters.tagId = parseInt(tagId, 10);
    if (search) filters.search = search;

    return this.tutorialsService.findAll(filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tutorial' })
  @ApiResponse({ status: 201, description: 'Tutorial created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Request() req: any,
    @Body() createTutorialDto: CreateTutorialDto,
  ) {
    const authorId = req.user?.id;
    return this.tutorialsService.create(createTutorialDto, authorId);
  }

  @Get('tags')
  @ApiOperation({ summary: 'List all tags' })
  @ApiResponse({ status: 200, description: 'List of tags' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAllTags() {
    return this.tutorialsService.findAllTags();
  }

  @Post('tags')
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({ status: 201, description: 'Tag created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createTag(@Body() createTagDto: CreateTagDto) {
    return this.tutorialsService.createTag(createTagDto);
  }

  @Put('tags/:id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiResponse({ status: 200, description: 'Tag updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async updateTag(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tutorialsService.updateTag(id, updateTagDto);
  }

  @Delete('tags/:id')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiResponse({ status: 200, description: 'Tag deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async removeTag(@Param('id', ParseIntPipe) id: number) {
    await this.tutorialsService.removeTag(id);
    return { message: 'Tag deleted successfully' };
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAllCategories() {
    return this.tutorialsService.findAllCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.tutorialsService.createCategory(createCategoryDto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.tutorialsService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category' })
  async removeCategory(@Param('id', ParseIntPipe) id: number) {
    await this.tutorialsService.removeCategory(id);
    return { message: 'Category deleted successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tutorial details by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tutorialsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tutorial' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTutorialDto: UpdateTutorialDto,
  ) {
    return this.tutorialsService.update(id, updateTutorialDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tutorial' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.tutorialsService.remove(id);
    return { message: 'Tutorial deleted successfully' };
  }
}
