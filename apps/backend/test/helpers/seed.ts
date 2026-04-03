import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User, UserRole, SubscriptionTier } from '@/users/entities/user.entity';
import { Wallet } from '@/wallet/entities/wallet.entity';
import {
  RecurrenceType,
  RefundPolicy,
  Schedule,
} from '@/schedules/entities/schedule.entity';
import { SlotConfig } from '@/schedules/entities/slot-config.entity';
import { Game, GameStatus } from '@/games/entities/game.entity';
import { Slot, Team } from '@/games/entities/slot.entity';

export const DEFAULT_TEST_PASSWORD = 'Password123!';

const uniqueValue = () => `${Date.now()}_${Math.floor(Math.random() * 10_000)}`;

export async function createUser(
  dataSource: DataSource,
  overrides: Partial<User> & { password?: string } = {},
): Promise<{ user: User; password: string }> {
  const userRepository = dataSource.getRepository(User);
  const password = overrides.password ?? DEFAULT_TEST_PASSWORD;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = userRepository.create({
    email: overrides.email ?? `user_${uniqueValue()}@test.local`,
    username: overrides.username ?? `user_${uniqueValue()}`,
    password: hashedPassword,
    role: overrides.role ?? UserRole.PLAYER,
    subscriptionTier: overrides.subscriptionTier ?? SubscriptionTier.FREE,
    isVerified: overrides.isVerified ?? true,
    isBanned: overrides.isBanned ?? false,
    bannedUntil: overrides.bannedUntil ?? null,
  });

  return { user: await userRepository.save(user), password };
}

export async function createWallet(
  dataSource: DataSource,
  userId: number,
  balance = 1_000,
): Promise<Wallet> {
  const walletRepository = dataSource.getRepository(Wallet);
  const wallet = walletRepository.create({ userId, balance });
  return walletRepository.save(wallet);
}

export async function createUserWithWallet(
  dataSource: DataSource,
  overrides: Partial<User> & { password?: string; balance?: number } = {},
) {
  const { password, balance, ...userOverrides } = overrides;
  const result = await createUser(dataSource, {
    ...userOverrides,
    password,
  });
  const wallet = await createWallet(
    dataSource,
    result.user.id,
    balance ?? 1_000,
  );
  return { user: result.user, wallet, password: result.password };
}

export async function createSchedule(
  dataSource: DataSource,
  overrides: Partial<Schedule>,
): Promise<Schedule> {
  const scheduleRepository = dataSource.getRepository(Schedule);
  const today = new Date();

  const schedule = scheduleRepository.create({
    name: overrides.name ?? `Schedule ${uniqueValue()}`,
    description: overrides.description ?? null,
    createdBy: overrides.createdBy!,
    recurrenceType: overrides.recurrenceType ?? RecurrenceType.WEEKLY,
    recurrenceDays: overrides.recurrenceDays ?? [today.getDay()],
    recurrencePattern: overrides.recurrencePattern ?? null,
    slotsPerGame: overrides.slotsPerGame ?? 10,
    reservationCost: overrides.reservationCost ?? 100,
    instantReservationCost: overrides.instantReservationCost ?? null,
    confirmationWindowMinutes: overrides.confirmationWindowMinutes ?? 30,
    refundPolicy: overrides.refundPolicy ?? RefundPolicy.NONE,
    refundPercentage: overrides.refundPercentage ?? null,
    isExclusiveToGold: overrides.isExclusiveToGold ?? false,
    firstGameStartTime: overrides.firstGameStartTime ?? '10:00',
    gamesPerDay: overrides.gamesPerDay ?? 2,
    teamAName: overrides.teamAName ?? 'Sentinel',
    teamBName: overrides.teamBName ?? 'Scourge',
    preAssignedUsers: overrides.preAssignedUsers ?? null,
    reminderMinutesBefore: overrides.reminderMinutesBefore ?? null,
    isActive: overrides.isActive ?? true,
    deletedAt: overrides.deletedAt ?? null,
    deletedBy: overrides.deletedBy ?? null,
  });

  return scheduleRepository.save(schedule);
}

export async function createSlotConfigs(
  dataSource: DataSource,
  scheduleId: number,
  slotsPerGame: number,
): Promise<SlotConfig[]> {
  const slotConfigRepository = dataSource.getRepository(SlotConfig);
  const slotsPerTeam = slotsPerGame / 2;
  const configs: Partial<SlotConfig>[] = [];

  for (let i = 1; i <= slotsPerTeam; i++) {
    configs.push({
      scheduleId,
      slotNumber: i,
      team: Team.A,
      isGoldOnly: false,
      coinsCost: null,
      preAssignedUserId: null,
    });
  }

  for (let i = 1; i <= slotsPerTeam; i++) {
    configs.push({
      scheduleId,
      slotNumber: slotsPerTeam + i,
      team: Team.B,
      isGoldOnly: false,
      coinsCost: null,
      preAssignedUserId: null,
    });
  }

  return slotConfigRepository.save(slotConfigRepository.create(configs));
}

export async function createGameWithSlots(
  dataSource: DataSource,
  schedule: Schedule,
  overrides: Partial<Game> = {},
): Promise<{ game: Game; slots: Slot[] }> {
  const gameRepository = dataSource.getRepository(Game);
  const slotRepository = dataSource.getRepository(Slot);
  const scheduledStartTime =
    overrides.scheduledStartTime ?? new Date(Date.now() + 60 * 60 * 1000);

  const game = gameRepository.create({
    scheduleId: schedule.id,
    status: overrides.status ?? GameStatus.CREATED,
    scheduledStartTime,
    teamAName: overrides.teamAName ?? schedule.teamAName,
    teamBName: overrides.teamBName ?? schedule.teamBName,
    isExclusiveToGold:
      overrides.isExclusiveToGold ?? schedule.isExclusiveToGold,
    generationBatchId: overrides.generationBatchId ?? null,
    gameIndex: overrides.gameIndex ?? null,
  });

  const savedGame = await gameRepository.save(game);
  const slots: Slot[] = [];
  const slotsPerTeam = schedule.slotsPerGame / 2;

  for (let i = 1; i <= schedule.slotsPerGame; i++) {
    slots.push(
      slotRepository.create({
        gameId: savedGame.id,
        slotNumber: i,
        team: i <= slotsPerTeam ? Team.A : Team.B,
        isReserved: false,
        reservedByUserId: null,
        isPreAssigned: false,
        preAssignedUserId: null,
      }),
    );
  }

  const savedSlots = await slotRepository.save(slots);
  return { game: savedGame, slots: savedSlots };
}
