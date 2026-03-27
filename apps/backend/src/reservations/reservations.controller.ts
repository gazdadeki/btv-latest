import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireVerified } from '../common/decorators/require-verified.decorator';
import { RequireNotBanned } from '../common/decorators/require-not-banned.decorator';
import { VerifiedGuard } from '../auth/guards/verified.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';
import { Team } from '@/games/entities/slot.entity';

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller({ path: 'players/reservations', version: '1' })
@UseGuards(JwtAuthGuard, VerifiedGuard, NotBannedGuard)
@RequireVerified()
@RequireNotBanned()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Reserve a slot' })
  @ApiResponse({ status: 201, description: 'Slot reserved successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or slot unavailable',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Game or slot not found' })
  async create(
    @Request() req: any,
    @Body()
    body: {
      gameId: number;
      slotId: number;
      team: Team;
      useInstantReservation?: boolean;
    },
  ) {
    return this.reservationsService.create(
      req.user.id,
      body.gameId,
      body.slotId,
      body.team,
      body.useInstantReservation || false,
      false,
    );
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm reservation' })
  @ApiResponse({ status: 200, description: 'Reservation confirmed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async confirm(@Param('id') id: string, @Request() req: any) {
    return this.reservationsService.confirm(+id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel reservation' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.reservationsService.cancel(+id, req.user.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my reservations' })
  @ApiResponse({ status: 200, description: 'List of user reservations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async getMyReservations(@Request() req: any) {
    return this.reservationsService.findUserReservations(req.user.id);
  }
}
