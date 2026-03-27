import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EventGenerationService } from '../scheduler/event-generation.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller({ path: 'admin/schedules', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    @Inject(forwardRef(() => EventGenerationService))
    private readonly eventGenerationService: EventGenerationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async create(@Body() body: any, @Request() req: any) {
    return this.schedulesService.create(body, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all schedules' })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async findAll() {
    return this.schedulesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule details' })
  @ApiResponse({ status: 200, description: 'Schedule details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateScheduleDto,
    @Request() req: any,
  ) {
    return this.schedulesService.update(+id, body, req.user.id);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate a schedule, deactivating all others' })
  @ApiResponse({ status: 200, description: 'Schedule activated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async activate(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.activate(+id, req.user.id);
  }

  @Put(':id/cancel-games')
  @ApiOperation({ summary: 'Cancel all CREATED games for a schedule' })
  @ApiResponse({ status: 200, description: 'Games cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async cancelGames(@Param('id') id: string, @Request() req: any) {
    const cancelledCount = await this.schedulesService.cancelScheduleGames(
      +id,
      req.user.id,
    );
    return { cancelledCount };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule (soft delete)' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.remove(+id, req.user.id);
  }

  @Post(':id/generate-games')
  @ApiOperation({
    summary: 'Manually generate games for a schedule on a specific date',
  })
  @ApiResponse({ status: 201, description: 'Games generated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async generateGames(
    @Param('id') id: string,
    @Body() body: { date: string },
    @Request() req: any,
  ) {
    if (!body.date) {
      throw new BadRequestException('Date is required');
    }

    const date = new Date(body.date);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const gamesCount = await this.eventGenerationService.generateGamesForDate(
      +id,
      date,
      req.user?.id,
    );
    return { gamesCreated: gamesCount, date: body.date };
  }
}
