import type { GameStatus } from '../games/entities/game.entity';
import type { ReservationStatus } from '../reservations/entities/reservation.entity';

export const WebsocketEvents = {
  GameCreated: 'game:created',
  GameUpdated: 'game:updated',
  GameStatusChanged: 'game:status_changed',
  GameStarted: 'game:started',
  GameFirstStarted: 'game:first_started',
  GameLastStarted: 'game:last_started',
  GameFinished: 'game:finished',
  GameFirstFinished: 'game:first_finished',
  GameLastFinished: 'game:last_finished',
  GamePlayersShuffled: 'game:players_shuffled',
  GamesBatchChanged: 'games:batch_changed',
  SlotAvailabilityChanged: 'slot:availability_changed',
  ReservationCreated: 'reservation:created',
  ReservationConfirmed: 'reservation:confirmed',
  ReservationCancelled: 'reservation:cancelled',
  ReservationStatusChanged: 'reservation:status_changed',
  MessageNew: 'message:new',
} as const;

export type WebsocketEventName =
  (typeof WebsocketEvents)[keyof typeof WebsocketEvents];

export type GamePosition = 'first' | 'last' | 'other';

export interface WebsocketEnvelope<TPayload> {
  type: WebsocketEventName;
  version: 'v1';
  timestamp: string;
  correlationId: string;
  payload: TPayload;
}

export interface GameStatusChangedPayload {
  gameId: number;
  status: GameStatus;
  winningTeam?: 'A' | 'B';
}

export interface GameStartedPayload {
  gameId: number;
  scheduleId: number;
  url: string;
  teamAName: string;
  teamBName: string;
  scheduledStartTime: string;
  position: GamePosition;
}

export interface GameFinishedPayload {
  gameId: number;
  scheduleId: number;
  url: string;
  winningTeam: 'A' | 'B' | null;
  teamAName: string;
  teamBName: string;
  actualEndTime: string | null;
  position: GamePosition;
}

export interface GameUpdatedPayload {
  gameId: number;
}

export interface GamePlayersShuffledPayload {
  gameId: number;
  shuffledCount: number;
}

export interface GamesBatchChangedPayload {
  action: 'generated' | 'cancelled' | 'updated';
  scheduleId?: number;
  date?: string;
  generationBatchId?: string;
  counts: {
    created: number;
    cancelled: number;
    updated: number;
  };
  affectedGameIds?: number[];
}

export interface SlotAvailabilityChangedPayload {
  gameId: number;
  slotId: number;
}

export interface ReservationConfirmedPayload {
  reservationId: number;
  gameId: number;
}

export interface ReservationStatusChangedPayload {
  reservationId: number;
  gameId: number;
  status: ReservationStatus;
}
