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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  async create(@Body() body: any, @Request() req: any) {
    return this.schedulesService.create(body, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all schedules' })
  async findAll() {
    return this.schedulesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule details' })
  async findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update schedule' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateScheduleDto,
    @Request() req: any,
  ) {
    return this.schedulesService.update(+id, body, req.user.id);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate a schedule, deactivating all others' })
  async activate(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.activate(+id, req.user.id);
  }

  @Put(':id/cancel-games')
  @ApiOperation({ summary: 'Cancel all CREATED games for a schedule' })
  async cancelGames(@Param('id') id: string, @Request() req: any) {
    const cancelledCount = await this.schedulesService.cancelScheduleGames(
      +id,
      req.user.id,
    );
    return { cancelledCount };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule (soft delete)' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.remove(+id, req.user.id);
  }

  @Post(':id/generate-games')
  @ApiOperation({
    summary: 'Manually generate games for a schedule on a specific date',
  })
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
