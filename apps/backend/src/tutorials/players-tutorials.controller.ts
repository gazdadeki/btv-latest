import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireVerified } from '../common/decorators/require-verified.decorator';
import { RequireNotBanned } from '../common/decorators/require-not-banned.decorator';
import { VerifiedGuard } from '../auth/guards/verified.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';
import { TutorialsService } from './tutorials.service';
import { TutorialStatus } from './entities/tutorial.entity';

/**
 * Player controller for accessing published tutorials.
 *
 * All endpoints require authentication, verification, and user not banned.
 * Only returns published tutorials (not drafts).
 * Viewing a tutorial increments its view count.
 */
@ApiTags('Players Tutorials')
@ApiBearerAuth()
@Controller({ path: 'players/tutorials', version: '1' })
@UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
@RequireVerified()
@RequireNotBanned()
export class PlayersTutorialsController {
  constructor(private readonly tutorialsService: TutorialsService) {}

  @Get()
  @ApiOperation({ summary: 'List all published tutorials' })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'tagId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('featured') featured?: string,
    @Query('categoryId') categoryId?: string,
    @Query('tagId') tagId?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {
      status: TutorialStatus.PUBLISHED, // Only published tutorials
    };
    if (featured !== undefined) filters.featured = featured === 'true';
    if (categoryId) filters.categoryId = parseInt(categoryId, 10);
    if (tagId) filters.tagId = parseInt(tagId, 10);
    if (search) filters.search = search;

    return this.tutorialsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get published tutorial by ID (increments view count)',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const tutorial = await this.tutorialsService.findOne(id);

    // Only allow access to published tutorials
    if (tutorial.status !== TutorialStatus.PUBLISHED) {
      throw new NotFoundException('Tutorial not found');
    }

    // Increment view count
    return this.tutorialsService.incrementViewCount(id);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get published tutorial by slug (increments view count)',
  })
  async findBySlug(@Param('slug') slug: string) {
    const tutorial = await this.tutorialsService.findBySlug(slug);

    // Only allow access to published tutorials
    if (tutorial.status !== TutorialStatus.PUBLISHED) {
      throw new NotFoundException('Tutorial not found');
    }

    // Increment view count
    return this.tutorialsService.incrementViewCount(tutorial.id);
  }
}
