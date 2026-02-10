import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { WebsocketService } from '../websocket/websocket.service';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationType } from '../firebase/entities/notification-history.entity';
import { GameBatchService } from './game-batch.service';
import { WebsocketEvents } from '../websocket/events';

@Injectable()
export class GameNotificationService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private websocketService: WebsocketService,
    private firebaseService: FirebaseService,
    private gameBatchService: GameBatchService,
  ) {}

  async publishGameStarted(
    game: Game,
    position: 'first' | 'last' | 'other',
    gameUrl: string,
  ): Promise<void> {
    const wsEventData = {
      gameId: game.id,
      scheduleId: game.scheduleId,
      url: gameUrl,
      teamAName: game.teamAName,
      teamBName: game.teamBName,
      scheduledStartTime: game.scheduledStartTime.toISOString(),
      position,
    };

    if (position === 'first') {
      this.websocketService.broadcast(
        WebsocketEvents.GameFirstStarted,
        wsEventData,
      );
    } else if (position === 'last') {
      this.websocketService.broadcast(
        WebsocketEvents.GameLastStarted,
        wsEventData,
      );
    } else {
      this.websocketService.broadcast(WebsocketEvents.GameStarted, wsEventData);
    }

    this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
      gameId: game.id,
      status: GameStatus.IN_PROGRESS,
    });

    await this.sendGameStartNotification(game, position, gameUrl);
  }

  async publishGameFinished(
    game: Game,
    position: 'first' | 'last' | 'other',
    gameUrl: string,
    winningTeamName: string,
    isLastGame: boolean,
  ): Promise<void> {
    const wsEventData = {
      gameId: game.id,
      scheduleId: game.scheduleId,
      url: gameUrl,
      winningTeam: game.winningTeam,
      teamAName: game.teamAName,
      teamBName: game.teamBName,
      actualEndTime: game.actualEndTime?.toISOString() || null,
      position,
    };

    if (position === 'first') {
      this.websocketService.broadcast(
        WebsocketEvents.GameFirstFinished,
        wsEventData,
      );
    } else if (position === 'last') {
      this.websocketService.broadcast(
        WebsocketEvents.GameLastFinished,
        wsEventData,
      );
    } else {
      this.websocketService.broadcast(
        WebsocketEvents.GameFinished,
        wsEventData,
      );
    }

    this.websocketService.broadcast(WebsocketEvents.GameStatusChanged, {
      gameId: game.id,
      status: GameStatus.FINISHED,
      winningTeam: game.winningTeam,
    });

    await this.sendGameFinishNotification(
      game,
      position,
      gameUrl,
      winningTeamName,
    );

    if (isLastGame) {
      await this.sendScheduleFinishedNotification(game);
    }
  }

  private async sendGameStartNotification(
    game: Game,
    position: 'first' | 'last' | 'other',
    gameUrl: string,
  ): Promise<void> {
    if (!game.schedule) {
      return;
    }

    const totalGames = await this.gameBatchService.getTotalGamesInBatch(
      game.generationBatchId,
    );
    const gameIndex = game.gameIndex || 1;

    let notificationType: NotificationType;
    let title: string;
    let body: string;

    if (position === 'first') {
      notificationType = NotificationType.FIRST_GAME_START;
      title = `First Game Started: ${game.schedule.name}`;
      body = `Game ${gameIndex} of ${totalGames} has started!`;
    } else if (position === 'last') {
      notificationType = NotificationType.LAST_GAME_START;
      title = `Last Game Started: ${game.schedule.name}`;
      body = `Game ${gameIndex} of ${totalGames} (final game) has started!`;
    } else {
      notificationType = NotificationType.GAME_START;
      title = `Game Started: ${game.schedule.name}`;
      body = `Game ${gameIndex} of ${totalGames} has started!`;
    }

    await this.firebaseService.sendBroadcastNotification({
      type: notificationType,
      title,
      body,
      data: {
        scheduleId: game.scheduleId.toString(),
        gameId: game.id.toString(),
        url: gameUrl,
        gameIndex: gameIndex.toString(),
        totalGames: totalGames.toString(),
      },
    });
  }

  private async sendGameFinishNotification(
    game: Game,
    position: 'first' | 'last' | 'other',
    gameUrl: string,
    winningTeamName: string,
  ): Promise<void> {
    if (!game.schedule) {
      return;
    }

    const totalGames = await this.gameBatchService.getTotalGamesInBatch(
      game.generationBatchId,
    );
    const gameIndex = game.gameIndex || 1;
    const nextGame = await this.gameBatchService.getNextGameInBatch(game);

    let notificationType: NotificationType;
    let title: string;
    let body: string;

    if (position === 'first') {
      notificationType = NotificationType.FIRST_GAME_FINISH;
      title = `First Game Finished: ${game.schedule.name}`;
      body = `Game ${gameIndex} of ${totalGames} finished! Winner: ${winningTeamName}`;
    } else if (position === 'last') {
      notificationType = NotificationType.LAST_GAME_FINISH;
      title = `Last Game Finished: ${game.schedule.name}`;
      body = `Game ${gameIndex} of ${totalGames} (final) finished! Winner: ${winningTeamName}`;
    } else {
      notificationType = NotificationType.GAME_FINISH;
      title = `Game Finished: ${game.schedule.name}`;
      body = `Game ${gameIndex} of ${totalGames} finished! Winner: ${winningTeamName}`;
    }

    const notificationData: Record<string, string> = {
      scheduleId: game.scheduleId.toString(),
      gameId: game.id.toString(),
      url: gameUrl,
      gameIndex: gameIndex.toString(),
      totalGames: totalGames.toString(),
      winningTeam: game.winningTeam || '',
      winningTeamName: winningTeamName,
    };

    if (nextGame) {
      notificationData.nextGameId = nextGame.id.toString();
      notificationData.nextGameStartTime =
        nextGame.scheduledStartTime.toISOString();
    }

    await this.firebaseService.sendBroadcastNotification({
      type: notificationType,
      title,
      body,
      data: notificationData,
    });
  }

  private async sendScheduleFinishedNotification(game: Game): Promise<void> {
    if (!game.schedule) {
      return;
    }

    const scheduleUrl = game.schedule.url || 'https://youtube.com';
    const reservations = await this.reservationRepository.find({
      where: {
        gameId: game.id,
        status: ReservationStatus.CONFIRMED,
      },
      relations: ['user'],
    });

    const userIds = [...new Set(reservations.map((r) => r.userId))];

    for (const userId of userIds) {
      await this.firebaseService.sendNotification(userId, {
        type: NotificationType.SCHEDULE_FINISHED,
        title: `Schedule Finished: ${game.schedule.name}`,
        body: `The schedule "${game.schedule.name}" has finished! Winning team: ${game.winningTeam === 'A' ? game.teamAName : game.teamBName}`,
        data: {
          scheduleId: game.scheduleId.toString(),
          gameId: game.id.toString(),
          url: scheduleUrl,
          winningTeam: game.winningTeam || '',
        },
      });
    }
  }
}
