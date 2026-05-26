import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireVerified } from '../common/decorators/require-verified.decorator';
import { VerifiedGuard } from '../auth/guards/verified.guard';
import { PlayersService } from './players.service';
import { Team } from '../games/entities/slot.entity';

@ApiTags('Players')
@ApiBearerAuth()
@Controller({ path: 'players', version: '1' })
@UseGuards(JwtAuthGuard, VerifiedGuard)
@RequireVerified()
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('games/available')
  @ApiOperation({ summary: 'List available games' })
  @ApiResponse({ status: 200, description: 'List of available games' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async getAvailableGames(@Request() req: any) {
    return this.playersService.getAvailableGames(req.user);
  }

  @Get('games/:id')
  @ApiOperation({ summary: 'Get game details' })
  @ApiResponse({ status: 200, description: 'Game details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getGame(@Param('id') id: string, @Request() req: any) {
    return this.playersService.getGameDetails(+id, req.user);
  }

  @Get('games/:id/slots')
  @ApiOperation({ summary: 'Get available slots for game' })
  @ApiResponse({ status: 200, description: 'Available slots for game' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getGameSlots(@Param('id') id: string, @Request() req: any) {
    return this.playersService.getGameSlots(+id, req.user);
  }

  @Post('games/:id/slots/:slotId/reserve')
  @ApiOperation({ summary: 'Reserve a slot (player-side validation)' })
  @ApiResponse({ status: 201, description: 'Slot reserved' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or slot unavailable',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Game or slot not found' })
  async reserveSlot(
    @Param('id') id: string,
    @Param('slotId') slotId: string,
    @Body() body: { team: Team; useInstantReservation?: boolean },
    @Request() req: any,
  ) {
    return this.playersService.reserveSlot(
      +id,
      +slotId,
      body.team,
      req.user,
      body.useInstantReservation || false,
    );
  }

  @Get('schedules/today')
  @ApiOperation({
    summary: 'Get schedules with games for today, grouped by schedule',
  })
  @ApiResponse({ status: 200, description: 'Schedules with games for today' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiQuery({
    name: 'includeCreated',
    required: false,
    type: Boolean,
    description: 'Include games with CREATED status (default: true)',
  })
  @ApiQuery({
    name: 'includeOpen',
    required: false,
    type: Boolean,
    description: 'Include games with OPEN status (default: true)',
  })
  @ApiQuery({
    name: 'includeInProgress',
    required: false,
    type: Boolean,
    description: 'Include games with IN_PROGRESS status (default: true)',
  })
  @ApiQuery({
    name: 'includeFinished',
    required: false,
    type: Boolean,
    description: 'Include games with FINISHED status (default: true)',
  })
  @ApiQuery({
    name: 'includeCancelled',
    required: false,
    type: Boolean,
    description: 'Include games with CANCELLED status (default: false)',
  })
  async getSchedulesForToday(
    @Request() req: any,
    @Query('includeCreated') includeCreated?: string,
    @Query('includeOpen') includeOpen?: string,
    @Query('includeInProgress') includeInProgress?: string,
    @Query('includeFinished') includeFinished?: string,
    @Query('includeCancelled') includeCancelled?: string,
  ) {
    // Parse boolean query parameters (default: show all except cancelled)
    const filters = {
      includeCreated: includeCreated !== 'false',
      includeOpen: includeOpen !== 'false',
      includeInProgress: includeInProgress !== 'false',
      includeFinished: includeFinished !== 'false',
      includeCancelled: includeCancelled === 'true',
    };

    return this.playersService.getSchedulesForToday(req.user, filters);
  }

  @Get('stream/active')
  @ApiOperation({ summary: 'Get the active stream with its games' })
  @ApiResponse({
    status: 200,
    description: 'Active stream with games, or null if none',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'includeCreated',
    required: false,
    type: Boolean,
    description: 'Include games with CREATED status (default: true)',
  })
  @ApiQuery({
    name: 'includeOpen',
    required: false,
    type: Boolean,
    description: 'Include games with OPEN status (default: true)',
  })
  @ApiQuery({
    name: 'includeInProgress',
    required: false,
    type: Boolean,
    description: 'Include games with IN_PROGRESS status (default: true)',
  })
  @ApiQuery({
    name: 'includeFinished',
    required: false,
    type: Boolean,
    description: 'Include games with FINISHED status (default: true)',
  })
  @ApiQuery({
    name: 'includeCancelled',
    required: false,
    type: Boolean,
    description: 'Include games with CANCELLED status (default: false)',
  })
  async getActiveStream(
    @Request() req: any,
    @Query('includeCreated') includeCreated?: string,
    @Query('includeOpen') includeOpen?: string,
    @Query('includeInProgress') includeInProgress?: string,
    @Query('includeFinished') includeFinished?: string,
    @Query('includeCancelled') includeCancelled?: string,
  ) {
    const filters = {
      includeCreated: includeCreated !== 'false',
      includeOpen: includeOpen !== 'false',
      includeInProgress: includeInProgress !== 'false',
      includeFinished: includeFinished !== 'false',
      includeCancelled: includeCancelled === 'true',
    };

    return this.playersService.getActiveStream(req.user, filters);
  }
}
