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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireVerified } from '../common/decorators/require-verified.decorator';
import { RequireNotBanned } from '../common/decorators/require-not-banned.decorator';
import { VerifiedGuard } from '../auth/guards/verified.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';
import { PlayersService } from './players.service';
import { Team } from '../games/entities/slot.entity';

@ApiTags('Players')
@ApiBearerAuth()
@Controller({ path: 'players', version: '1' })
@UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
@RequireVerified()
@RequireNotBanned()
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('games/available')
  @ApiOperation({ summary: 'List available games' })
  async getAvailableGames(@Request() req: any) {
    return this.playersService.getAvailableGames(req.user);
  }

  @Get('games/:id')
  @ApiOperation({ summary: 'Get game details' })
  async getGame(@Param('id') id: string, @Request() req: any) {
    return this.playersService.getGameDetails(+id, req.user);
  }

  @Get('games/:id/slots')
  @ApiOperation({ summary: 'Get available slots for game' })
  async getGameSlots(@Param('id') id: string, @Request() req: any) {
    return this.playersService.getGameSlots(+id, req.user);
  }

  @Post('games/:id/slots/:slotId/reserve')
  @ApiOperation({ summary: 'Reserve a slot (player-side validation)' })
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
  @ApiQuery({
    name: 'includeCreated',
    required: false,
    type: Boolean,
    description: 'Include games with CREATED status (default: true)',
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
    @Query('includeInProgress') includeInProgress?: string,
    @Query('includeFinished') includeFinished?: string,
    @Query('includeCancelled') includeCancelled?: string,
  ) {
    // Parse boolean query parameters (default: show all except cancelled)
    const filters = {
      includeCreated: includeCreated !== 'false',
      includeInProgress: includeInProgress !== 'false',
      includeFinished: includeFinished !== 'false',
      includeCancelled: includeCancelled === 'true',
    };

    return this.playersService.getSchedulesForToday(req.user, filters);
  }
}
