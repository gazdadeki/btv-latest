import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Game } from '../games/entities/game.entity';
import { Slot } from '../games/entities/slot.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { SlotConfig } from '../schedules/entities/slot-config.entity';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class GamePreAssignmentService {
  constructor(
    @InjectRepository(Slot)
    private slotRepository: Repository<Slot>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private walletService: WalletService,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  async applyPreAssignments(
    game: Game,
    slotConfigs: SlotConfig[],
    schedule: Schedule,
  ): Promise<void> {
    const preAssignments = slotConfigs.filter(
      (slotConfig) => !!slotConfig.preAssignedUserId,
    );
    if (preAssignments.length === 0) {
      return;
    }

    const userIds = Array.from(
      new Set(preAssignments.map((config) => config.preAssignedUserId!)),
    );
    const [users, wallets] = await Promise.all([
      this.usersService.findByIds(userIds),
      this.walletService.getWalletsByUserIds(userIds),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const walletsByUserId = new Map(
      wallets.map((wallet) => [wallet.userId, wallet]),
    );
    const balancesByUserId = new Map(
      wallets.map((wallet) => [
        wallet.userId,
        parseFloat(wallet.balance.toString()),
      ]),
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lockedSlots = await queryRunner.manager.find(Slot, {
        where: { gameId: game.id },
        lock: { mode: 'pessimistic_write' },
      });
      const slotsByKey = new Map(
        lockedSlots.map((slot) => [`${slot.slotNumber}-${slot.team}`, slot]),
      );

      for (const slotConfig of preAssignments) {
        const userId = slotConfig.preAssignedUserId!;
        const wallet = walletsByUserId.get(userId);
        if (!usersById.has(userId) || !wallet) {
          continue;
        }

        const slot = slotsByKey.get(
          `${slotConfig.slotNumber}-${slotConfig.team}`,
        );
        if (!slot) {
          continue;
        }

        const coinsCost = slotConfig.coinsCost ?? schedule.reservationCost;
        const instantCost =
          schedule.instantReservationCost && schedule.instantReservationCost > 0
            ? schedule.instantReservationCost
            : null;
        const totalCost = instantCost ?? coinsCost;
        const currentBalance = balancesByUserId.get(userId) ?? 0;

        if (currentBalance < totalCost) {
          continue;
        }

        await this.walletService.withdrawWithManager(
          queryRunner.manager,
          wallet.id,
          totalCost,
          `Pre-assigned reservation for game ${game.id}`,
        );
        balancesByUserId.set(userId, currentBalance - totalCost);

        const reservation = queryRunner.manager.create(Reservation, {
          slotId: slot.id,
          userId,
          gameId: game.id,
          status: instantCost
            ? ReservationStatus.CONFIRMED
            : ReservationStatus.RESERVED,
          reservationCostPaid: totalCost,
          confirmationCostPaid: 0,
          totalCostPaid: totalCost,
          reservedAt: new Date(),
          confirmedAt: instantCost ? new Date() : null,
        });
        await queryRunner.manager.save(reservation);

        slot.isReserved = true;
        slot.reservedByUserId = userId;
        slot.isPreAssigned = true;
        slot.preAssignedUserId = userId;
        await queryRunner.manager.save(slot);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
