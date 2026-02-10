import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutorial } from './entities/tutorial.entity';
import { Tag } from './entities/tag.entity';
import { Category } from './entities/category.entity';
import { TutorialsService } from './tutorials.service';
import { TutorialsController } from './tutorials.controller';
import { PlayersTutorialsController } from './players-tutorials.controller';

/**
 * Tutorials module for managing tutorials, tags, and categories.
 *
 * Provides:
 * - Full CRUD operations for admins
 * - Read-only access for players (published tutorials only)
 * - Tag and category management
 * - View count tracking
 *
 * All admin endpoints require admin role authentication.
 * Player endpoints require authentication, verification, and user not banned.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Tutorial, Tag, Category])],
  controllers: [TutorialsController, PlayersTutorialsController],
  providers: [TutorialsService],
  exports: [TutorialsService],
})
export class TutorialsModule {}
