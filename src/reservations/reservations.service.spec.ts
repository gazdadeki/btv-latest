import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { GameStatus } from '../games/entities/game.entity';
import { Team } from '../games/entities/slot.entity';
import { SubscriptionTier } from '../users/entities/user.entity';
import { ReservationStatus } from './entities/reservation.entity';

describe('ReservationsService', () => {
  const buildQueryBuilder = (count: number) => ({
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
  });

  const buildService = (overrides: Partial<any> = {}) => {
    const queryBuilder = buildQueryBuilder(0);
    const reservationRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ id: 99, ...data })),
    };
    const slotRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 5,
        gameId: 1,
        team: Team.A,
        isReserved: false,
      }),
      find: jest
        .fn()
        .mockResolvedValue([{ isReserved: true }, { isReserved: false }]),
    };
    const gameRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        status: GameStatus.CREATED,
        schedule: {
          reservationCost: 100,
          instantReservationCost: 200,
          slotsPerGame: 4,
          confirmationWindowMinutes: 30,
          refundPolicy: 'FULL',
        },
        isExclusiveToGold: false,
      }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 42,
        isVerified: true,
        isBanned: false,
        subscriptionTier: SubscriptionTier.FREE,
        wallet: { id: 7 },
      }),
    };
    const walletService = {
      getBalance: jest.fn().mockResolvedValue(500),
      withdraw: jest.fn(),
    };
    const configService = {
      getGoldDiscountPercentage: jest.fn().mockReturnValue(20),
    };
    const auditService = { log: jest.fn() };
    const websocketService = { broadcast: jest.fn() };
    const statisticsService = {
      incrementReservations: jest.fn(),
      addCoinsSpent: jest.fn(),
    };
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager: {
        save: jest.fn(async (entity) => entity),
      },
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    const dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    return new ReservationsService(
      {
        ...reservationRepository,
        ...(overrides.reservationRepository || {}),
      } as any,
      { ...slotRepository, ...(overrides.slotRepository || {}) } as any,
      { ...gameRepository, ...(overrides.gameRepository || {}) } as any,
      { ...userRepository, ...(overrides.userRepository || {}) } as any,
      { ...walletService, ...(overrides.walletService || {}) } as any,
      { ...configService, ...(overrides.configService || {}) } as any,
      { ...auditService, ...(overrides.auditService || {}) } as any,
      { ...websocketService, ...(overrides.websocketService || {}) } as any,
      { ...statisticsService, ...(overrides.statisticsService || {}) } as any,
      { ...dataSource, ...(overrides.dataSource || {}) } as any,
    );
  };

  it('applies gold discount for standard reservations', async () => {
    const service = buildService({
      userRepository: {
        findOne: jest.fn().mockResolvedValue({
          id: 42,
          isVerified: true,
          isBanned: false,
          subscriptionTier: SubscriptionTier.GOLD,
          wallet: { id: 7 },
        }),
      },
    });

    await service.create(42, 1, 5, Team.A, false, false);
    const walletService = (service as any).walletService;
    expect(walletService.withdraw).toHaveBeenCalledWith(
      7,
      80,
      'Reservation for game 1',
    );
  });

  it('uses instant reservation cost when requested', async () => {
    const service = buildService({
      userRepository: {
        findOne: jest.fn().mockResolvedValue({
          id: 42,
          isVerified: true,
          isBanned: false,
          subscriptionTier: SubscriptionTier.GOLD,
          wallet: { id: 7 },
        }),
      },
    });

    await service.create(42, 1, 5, Team.A, true, false);
    const walletService = (service as any).walletService;
    expect(walletService.withdraw).toHaveBeenCalledWith(
      7,
      160,
      'Instant reservation for game 1',
    );
  });

  it('blocks non-gold users from exclusive games', async () => {
    const service = buildService({
      gameRepository: {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          status: GameStatus.CREATED,
          schedule: {
            reservationCost: 100,
            instantReservationCost: 200,
            slotsPerGame: 4,
            confirmationWindowMinutes: 30,
            refundPolicy: 'FULL',
          },
          isExclusiveToGold: true,
        }),
      },
      userRepository: {
        findOne: jest.fn().mockResolvedValue({
          id: 42,
          isVerified: true,
          isBanned: false,
          subscriptionTier: SubscriptionTier.FREE,
          wallet: { id: 7 },
        }),
      },
    });

    await expect(
      service.create(42, 1, 5, Team.A, false, false),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects reservations when team is full', async () => {
    const service = buildService({
      slotRepository: {
        find: jest
          .fn()
          .mockResolvedValue([{ isReserved: true }, { isReserved: true }]),
      },
    });

    await expect(
      service.create(42, 1, 5, Team.A, false, false),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates reserved status for non-instant reservations', async () => {
    const service = buildService();
    const result = await service.create(42, 1, 5, Team.A, false, false);
    expect(result.status).toBe(ReservationStatus.RESERVED);
  });
});
