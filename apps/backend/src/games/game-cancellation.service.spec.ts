import { GameCancellationService } from './game-cancellation.service';
import { GameStatus } from './entities/game.entity';
import { ReservationStatus } from '../reservations/entities/reservation.entity';
import { RefundPolicy } from '../schedules/entities/schedule.entity';

describe('GameCancellationService', () => {
  it('cancels games, refunds reservations, and frees slots', async () => {
    const game = {
      id: 1,
      streamId: 50,
      status: GameStatus.CREATED,
      stream: {
        id: 50,
        scheduleId: 10,
        schedule: { refundPolicy: RefundPolicy.FULL },
      },
    };

    const reservation = {
      id: 55,
      gameId: 1,
      status: ReservationStatus.RESERVED,
      totalCostPaid: 120,
      userId: 2,
      user: { wallet: { id: 7 } },
      slotId: 99,
    };

    const slot = {
      id: 99,
      isReserved: true,
      reservedByUserId: 2,
    };

    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([game]),
    };

    const gameRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      save: jest.fn().mockResolvedValue(game),
    };
    const reservationRepository = {
      find: jest.fn().mockResolvedValue([reservation]),
      save: jest.fn().mockResolvedValue(reservation),
    };
    const slotRepository = {
      findOne: jest.fn().mockResolvedValue(slot),
      save: jest.fn().mockResolvedValue(slot),
    };
    const walletService = { deposit: jest.fn() };
    const auditService = { log: jest.fn() };
    const websocketService = { broadcast: jest.fn() };

    const service = new GameCancellationService(
      gameRepository as any,
      reservationRepository as any,
      slotRepository as any,
      walletService as any,
      auditService as any,
      websocketService as any,
    );

    const cancelledCount = await service.cancelCreatedGamesForSchedule(10, {
      adminId: 1,
      audit: true,
      emitWebsocket: true,
    });

    expect(cancelledCount).toBe(1);
    expect(game.status).toBe(GameStatus.CANCELLED);
    expect(reservation.status).toBe(ReservationStatus.CANCELLED);
    expect(slot.isReserved).toBe(false);
    expect(slot.reservedByUserId).toBeNull();
    expect(walletService.deposit).toHaveBeenCalledWith(
      7,
      120,
      'Refund for cancelled game 1',
    );
  });
});
