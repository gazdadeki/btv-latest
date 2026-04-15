import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GameStatus } from './entities/game.entity';
import { UpdateGameDto } from './dto/update-game.dto';
import { PreAssignSlotDto } from './dto/pre-assign-slot.dto';

@ApiTags('Games')
@ApiBearerAuth()
@Controller({ path: 'admin/games', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  @ApiOperation({ summary: 'List all games' })
  @ApiQuery({ name: 'status', required: false, enum: GameStatus })
  @ApiQuery({ name: 'scheduleId', required: false, type: Number })
  @ApiQuery({ name: 'streamId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of games' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async findAll(
    @Query('status') status?: GameStatus,
    @Query('scheduleId') scheduleId?: string,
    @Query('streamId') streamId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (scheduleId) filters.scheduleId = parseInt(scheduleId, 10);
    if (streamId) filters.streamId = parseInt(streamId, 10);
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    return this.gamesService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get game details' })
  @ApiResponse({ status: 200, description: 'Game details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async findOne(@Param('id') id: string) {
    return this.gamesService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Manually create a game' })
  @ApiResponse({ status: 201, description: 'Game created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async create(@Body() body: any, @Request() req: any) {
    return this.gamesService.createManually(body, req.user.id);
  }

  @Post('cancel-all-active')
  @ApiOperation({
    summary: 'Cancel all active games (CREATED and IN_PROGRESS)',
  })
  @ApiResponse({ status: 200, description: 'All active games cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async cancelAllActive(@Request() req: any) {
    return this.gamesService.cancelAllActiveGames(req.user.id);
  }

  @Put(':id/start')
  @ApiOperation({ summary: 'Start game manually' })
  @ApiResponse({ status: 200, description: 'Game started' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async start(@Param('id') id: string, @Request() req: any) {
    return this.gamesService.start(+id, req.user.id);
  }

  @Put(':id/remake')
  @ApiOperation({ summary: 'Remake game (IN_PROGRESS → OPEN)' })
  @ApiResponse({ status: 200, description: 'Game remade' })
  @ApiResponse({ status: 400, description: 'Game is not in progress' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async remake(@Param('id') id: string, @Request() req: any) {
    return this.gamesService.remake(+id, req.user.id);
  }

  @Put(':id/finish')
  @ApiOperation({ summary: 'Finish game' })
  @ApiResponse({ status: 200, description: 'Game finished' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async finish(
    @Param('id') id: string,
    @Body() body: { winningTeam: 'A' | 'B'; mvpUserId?: number },
    @Request() req: any,
  ) {
    return this.gamesService.finish(+id, req.user.id, body);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel game (soft delete)' })
  @ApiResponse({ status: 200, description: 'Game cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.gamesService.cancel(+id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update game details' })
  @ApiResponse({ status: 200, description: 'Game updated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateGameDto,
    @Request() req: any,
  ) {
    return this.gamesService.updateGame(+id, body, req.user.id);
  }

  @Put(':id/slots/:slotId/assign')
  @ApiOperation({ summary: 'Assign user to slot' })
  @ApiResponse({ status: 200, description: 'User assigned to slot' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game or slot not found' })
  async assignUserToSlot(
    @Param('id') id: string,
    @Param('slotId') slotId: string,
    @Body() body: { userId: number },
    @Request() req: any,
  ) {
    return this.gamesService.assignUserToSlot(
      +id,
      +slotId,
      body.userId,
      req.user.id,
    );
  }

  @Put(':id/slots/:slotId/kick')
  @ApiOperation({ summary: 'Remove user from slot' })
  @ApiResponse({ status: 200, description: 'User removed from slot' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game or slot not found' })
  async kickUserFromSlot(
    @Param('id') id: string,
    @Param('slotId') slotId: string,
    @Request() req: any,
  ) {
    return this.gamesService.kickUserFromSlot(+id, +slotId, req.user.id);
  }

  @Put(':id/slots/:slotId/confirm')
  @ApiOperation({
    summary:
      'Admin confirm reservation for slot (bypasses confirmation window and costs)',
  })
  @ApiResponse({ status: 200, description: 'Reservation confirmed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game or slot not found' })
  async confirmSlotReservation(
    @Param('id') id: string,
    @Param('slotId') slotId: string,
    @Request() req: any,
  ) {
    return this.gamesService.confirmSlotReservation(+id, +slotId, req.user.id);
  }

  @Put(':id/slots/confirm-all')
  @ApiOperation({
    summary:
      'Admin confirm all reserved slots in a game (bypasses confirmation window and costs)',
  })
  @ApiResponse({ status: 200, description: 'All reservations confirmed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async confirmAllSlotReservations(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.gamesService.confirmAllSlotReservations(+id, req.user.id);
  }

  @Put(':id/slots/cancel-all-confirmations')
  @ApiOperation({
    summary: 'Admin cancel all confirmed reservations in a game',
  })
  @ApiResponse({ status: 200, description: 'All confirmations cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async cancelAllConfirmations(@Param('id') id: string, @Request() req: any) {
    return this.gamesService.cancelAllConfirmations(+id, req.user.id);
  }

  @Put(':id/slots/:slotId/pre-assign')
  @ApiOperation({ summary: 'Pre-assign or clear pre-assignment on a slot' })
  @ApiResponse({ status: 200, description: 'Pre-assignment updated' })
  @ApiResponse({ status: 400, description: 'Slot is already reserved' })
  async preAssignSlot(
    @Param('id') id: string,
    @Param('slotId') slotId: string,
    @Body() body: PreAssignSlotDto,
    @Request() req: any,
  ) {
    return this.gamesService.preAssignSlot(
      +id,
      +slotId,
      body.userId ?? null,
      req.user.id,
    );
  }

  @Post(':id/auto-start-next')
  @ApiOperation({ summary: 'Auto-start next game after delay' })
  @ApiResponse({ status: 200, description: 'Auto-start scheduled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async autoStartNext(
    @Param('id') id: string,
    @Body() body: { delayMinutes: number },
    @Request() req: any,
  ) {
    return this.gamesService.autoStartNextGame(
      +id,
      body.delayMinutes,
      req.user.id,
    );
  }

  @Post(':id/shuffle')
  @ApiOperation({
    summary:
      'Shuffle players in game (excludes admin users and gold-only slots)',
  })
  @ApiResponse({ status: 200, description: 'Players shuffled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async shufflePlayers(@Param('id') id: string, @Request() req: any) {
    return this.gamesService.shufflePlayers(+id, req.user.id);
  }
}
