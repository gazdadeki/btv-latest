import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { Slot } from './entities/slot.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { User, UserRole, SubscriptionTier } from '@/users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { WebsocketService } from '../websocket/websocket.service';
import { SlotConfigService } from '../schedules/slot-config.service';
import { WebsocketEvents } from '../websocket/events';
import {
  ACTIVE_RESERVATION_STATUSES,
  buildZeroCostReservation,
  cancelActiveReservation,
  clearSlotAssignment,
} from '../common/reservation.utils';

// ─── Module-level helpers ──────────────────────────────────────────────────────

function assertGameModifiable(
  game: Game,
  message: string,
  { checkCancelled = true }: { checkCancelled?: boolean } = {},
): void {
  if (
    game.status === GameStatus.FINISHED ||
    (checkCancelled && game.status === GameStatus.CANCELLED)
  ) {
    throw new BadRequestException(message);
  }
}

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class SlotAdminAssignmentService {
  constructor(
    @InjectRepository(Slot)
    private slotRepository: Repository<Slot>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private auditService: AuditService,
    private websocketService: WebsocketService,
    private slotConfigService: SlotConfigService,
    private dataSource: DataSource,
  ) {}

  async preAssignSlot(
    game: Game,
    slotId: number,
    userId: number | null,
    adminId: number,
  ): Promise<Slot> {
    assertGameModifiable(
      game,
      'Cannot modify pre-assignments on finished or cancelled games',
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const slot = await queryRunner.manager.findOne(Slot, {
        where: { id: slotId, gameId: game.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!slot) {
        throw new BadRequestException('Slot not found');
      }

      if (slot.isReserved) {
        throw new BadRequestException(
          'Cannot change pre-assignment on a reserved slot',
        );
      }

      if (userId !== null) {
        const user = await queryRunner.manager.findOne(User, {
          where: { id: userId },
        });
        if (!user) {
          throw new BadRequestException('User not found');
        }

        // Prevent assigning free users to gold-only slots (unless game is unrestricted)
        if (
          slot.isGoldOnly &&
          !game.allowMultipleReservations &&
          user.subscriptionTier !== SubscriptionTier.GOLD &&
          user.role !== UserRole.ADMIN
        ) {
          throw new BadRequestException(
            'Cannot assign a free user to a gold-only slot',
          );
        }

        // Check if user is already assigned to another slot in this game
        const existingSlot = await queryRunner.manager.findOne(Slot, {
          where: {
            gameId: game.id,
            reservedByUserId: userId,
            isReserved: true,
          },
        });
        if (existingSlot && existingSlot.id !== slotId) {
          throw new BadRequestException(
            'This user is already assigned to another slot in this game',
          );
        }

        await cancelActiveReservation(queryRunner.manager, slotId, game.id);

        const reservation = queryRunner.manager.create(
          Reservation,
          buildZeroCostReservation({ slotId, userId, gameId: game.id }),
        );
        await queryRunner.manager.save(reservation);

        slot.isPreAssigned = true;
        slot.preAssignedUserId = userId;
        slot.isReserved = true;
        slot.reservedByUserId = userId;
      } else {
        slot.isPreAssigned = false;
        slot.preAssignedUserId = null;
      }

      await queryRunner.manager.save(slot);
      await queryRunner.commitTransaction();

      const loaded = await this.slotRepository.findOne({
        where: { id: slot.id },
        relations: ['preAssignedUser', 'reservedByUser'],
      });
      if (!loaded) {
        throw new BadRequestException('Slot not found after save');
      }

      await this.auditService.log({
        userId: adminId,
        action:
          userId !== null ? 'SLOT_PRE_ASSIGNED' : 'SLOT_PRE_ASSIGNMENT_CLEARED',
        entityType: 'Slot',
        entityId: slotId.toString(),
        details: { gameId: game.id, preAssignedUserId: userId },
      });

      this.websocketService.broadcast(WebsocketEvents.SlotAvailabilityChanged, {
        gameId: game.id,
        slotId,
      });

      return loaded;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async assignUserToSlot(
    game: Game,
    slotId: number,
    userId: number,
    adminId: number,
  ): Promise<Slot> {
    assertGameModifiable(
      game,
      'Cannot assign users to finished or cancelled games',
    );

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const slot = await queryRunner.manager.findOne(Slot, {
        where: { id: slotId, gameId: game.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!slot) {
        throw new BadRequestException('Slot not found');
      }

      if (slot.isReserved) {
        throw new BadRequestException('Slot is already reserved');
      }

      await cancelActiveReservation(queryRunner.manager, slotId, game.id);

      const reservation = queryRunner.manager.create(
        Reservation,
        buildZeroCostReservation({ slotId, userId, gameId: game.id }),
      );
      await queryRunner.manager.save(reservation);

      slot.isReserved = true;
      slot.reservedByUserId = userId;
      const updated = await queryRunner.manager.save(slot);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: adminId,
        action: 'SLOT_ASSIGNED',
        entityType: 'Slot',
        entityId: slotId.toString(),
        details: { gameId: game.id, userId },
      });

      this.websocketService.broadcast(WebsocketEvents.SlotAvailabilityChanged, {
        gameId: game.id,
        slotId,
      });

      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async kickUserFromSlot(
    game: Game,
    slotId: number,
    adminId: number,
  ): Promise<Slot> {
    assertGameModifiable(game, 'Cannot remove users from finished games', {
      checkCancelled: false,
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const slot = await queryRunner.manager.findOne(Slot, {
        where: { id: slotId, gameId: game.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!slot) {
        throw new BadRequestException('Slot not found');
      }

      if (!slot.isReserved) {
        throw new BadRequestException('Slot is not reserved');
      }

      await cancelActiveReservation(queryRunner.manager, slotId, game.id);

      clearSlotAssignment(slot);
      await queryRunner.manager.save(slot);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        userId: adminId,
        action: 'SLOT_USER_REMOVED',
        entityType: 'Slot',
        entityId: slotId.toString(),
        details: { gameId: game.id },
      });

      this.websocketService.broadcast(WebsocketEvents.SlotAvailabilityChanged, {
        gameId: game.id,
        slotId,
      });

      return slot;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmSlotReservation(
    game: Game,
    slotId: number,
    adminId: number,
  ): Promise<Reservation> {
    assertGameModifiable(
      game,
      'Cannot confirm reservations for finished or cancelled games',
    );

    const slot = await this.slotRepository.findOne({
      where: { id: slotId, gameId: game.id },
      relations: ['reservation', 'reservation.user'],
    });

    if (!slot) {
      throw new BadRequestException('Slot not found');
    }

    if (!slot.isReserved || !slot.reservation) {
      throw new BadRequestException('Slot is not reserved');
    }

    const reservation = slot.reservation;

    if (reservation.status === ReservationStatus.CONFIRMED) {
      throw new BadRequestException('Reservation is already confirmed');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Cannot confirm a cancelled reservation');
    }

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmedAt = new Date();
    reservation.confirmationCostPaid = 0;
    reservation.totalCostPaid = reservation.reservationCostPaid;

    const updated = await this.reservationRepository.save(reservation);

    this.websocketService.broadcast(WebsocketEvents.ReservationConfirmed, {
      reservationId: reservation.id,
      gameId: game.id,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'RESERVATION_ADMIN_CONFIRMED',
      entityType: 'Reservation',
      entityId: reservation.id.toString(),
      details: {
        gameId: game.id,
        slotId,
        userId: reservation.userId,
        userEmail: reservation.user?.email,
      },
    });

    return updated;
  }

  async confirmAllSlotReservations(
    game: Game,
    adminId: number,
  ): Promise<{ confirmedCount: number }> {
    assertGameModifiable(
      game,
      'Cannot confirm reservations for finished or cancelled games',
    );

    const slots = await this.slotRepository.find({
      where: { gameId: game.id },
      relations: ['reservation', 'reservation.user'],
    });

    let confirmedCount = 0;
    const now = new Date();

    for (const slot of slots) {
      if (slot.isReserved && slot.reservation) {
        const reservation = slot.reservation;

        if (reservation.status === ReservationStatus.RESERVED) {
          reservation.status = ReservationStatus.CONFIRMED;
          reservation.confirmedAt = now;
          reservation.confirmationCostPaid = 0;
          reservation.totalCostPaid = reservation.reservationCostPaid;

          await this.reservationRepository.save(reservation);
          confirmedCount++;

          this.websocketService.broadcast(
            WebsocketEvents.ReservationConfirmed,
            {
              reservationId: reservation.id,
              gameId: game.id,
            },
          );

          await this.auditService.log({
            userId: adminId,
            action: 'RESERVATION_ADMIN_CONFIRMED',
            entityType: 'Reservation',
            entityId: reservation.id.toString(),
            details: {
              gameId: game.id,
              slotId: slot.id,
              userId: reservation.userId,
              userEmail: reservation.user?.email,
            },
          });
        }
      }
    }

    return { confirmedCount };
  }

  async cancelAllConfirmations(
    game: Game,
    adminId: number,
  ): Promise<{ cancelledCount: number }> {
    assertGameModifiable(
      game,
      'Cannot cancel confirmations for finished or cancelled games',
    );

    const slots = await this.slotRepository.find({
      where: { gameId: game.id },
      relations: ['reservation', 'reservation.user'],
    });

    let cancelledCount = 0;

    for (const slot of slots) {
      if (slot.isReserved && slot.reservation) {
        const reservation = slot.reservation;

        if (reservation.status === ReservationStatus.CONFIRMED) {
          reservation.status = ReservationStatus.RESERVED;
          reservation.confirmedAt = null;
          reservation.confirmationCostPaid = 0;
          reservation.totalCostPaid = reservation.reservationCostPaid;

          await this.reservationRepository.save(reservation);
          cancelledCount++;

          this.websocketService.broadcast(
            WebsocketEvents.ReservationStatusChanged,
            {
              reservationId: reservation.id,
              gameId: game.id,
              status: ReservationStatus.RESERVED,
            },
          );

          await this.auditService.log({
            userId: adminId,
            action: 'RESERVATION_ADMIN_CANCELLED_CONFIRMATION',
            entityType: 'Reservation',
            entityId: reservation.id.toString(),
            details: {
              gameId: game.id,
              slotId: slot.id,
              userId: reservation.userId,
              userEmail: reservation.user?.email,
            },
          });
        }
      }
    }

    return { cancelledCount };
  }

  async shufflePlayers(
    game: Game,
    adminId: number,
  ): Promise<{ shuffled: number; message: string }> {
    assertGameModifiable(game, 'Cannot shuffle players for finished games', {
      checkCancelled: false,
    });

    const slots = await this.slotRepository.find({
      where: { gameId: game.id },
      order: { slotNumber: 'ASC' },
    });

    const slotConfigs = await this.slotConfigService.findBySchedule(
      game.scheduleId,
    );
    const goldOnlySlots = new Set<string>();
    slotConfigs.forEach((config) => {
      if (config.isGoldOnly) {
        goldOnlySlots.add(`${config.slotNumber}-${config.team}`);
      }
    });

    const reservations = await this.reservationRepository.find({
      where: {
        gameId: game.id,
        status: ReservationStatus.CONFIRMED,
      },
      relations: ['user', 'slot'],
    });

    const assignedUsers: Array<{
      userId: number;
      slotId: number;
      slot: Slot;
      user: User;
    }> = [];

    for (const reservation of reservations) {
      if (reservation.user && reservation.slot) {
        assignedUsers.push({
          userId: reservation.userId,
          slotId: reservation.slotId,
          slot: reservation.slot,
          user: reservation.user,
        });
      }
    }

    for (const slot of slots) {
      if (slot.isPreAssigned && slot.preAssignedUserId && !slot.isReserved) {
        const user = await this.userRepository.findOne({
          where: { id: slot.preAssignedUserId },
        });
        if (user) {
          assignedUsers.push({
            userId: user.id,
            slotId: slot.id,
            slot: slot,
            user: user,
          });
        }
      }
    }

    const totalUsersBeforeShuffle = assignedUsers.length;

    const usersToKeepInPlace = new Set<number>();
    for (const assignment of assignedUsers) {
      const slotKey = `${assignment.slot.slotNumber}-${assignment.slot.team}`;
      if (goldOnlySlots.has(slotKey)) {
        usersToKeepInPlace.add(assignment.userId);
      }
    }

    const shuffleableUsers = assignedUsers.filter((assignment) => {
      if (assignment.user.role === UserRole.ADMIN) {
        return false;
      }
      if (usersToKeepInPlace.has(assignment.userId)) {
        return false;
      }
      return true;
    });

    if (shuffleableUsers.length === 0) {
      throw new BadRequestException(
        'No users to shuffle (all users are either admins or in gold-only slots)',
      );
    }

    const adminUserIds = new Set(
      assignedUsers
        .filter((a) => a.user.role === UserRole.ADMIN)
        .map((a) => a.userId),
    );

    const slotsToKeepOccupied = new Set<number>();
    for (const assignment of assignedUsers) {
      if (
        assignment.user.role === UserRole.ADMIN ||
        usersToKeepInPlace.has(assignment.userId)
      ) {
        slotsToKeepOccupied.add(assignment.slotId);
      }
    }

    const availableSlotIds = slots
      .filter((slot) => {
        if (slot.reservedByUserId && adminUserIds.has(slot.reservedByUserId)) {
          return false;
        }

        const slotKey = `${slot.slotNumber}-${slot.team}`;
        if (goldOnlySlots.has(slotKey)) {
          return false;
        }

        if (slotsToKeepOccupied.has(slot.id)) {
          return false;
        }

        return true;
      })
      .map((slot) => slot.id);

    if (availableSlotIds.length < shuffleableUsers.length) {
      throw new BadRequestException(
        `Not enough available slots for shuffling. Need ${shuffleableUsers.length} slots but only ${availableSlotIds.length} available. ` +
          `Total slots: ${slots.length}, Admin slots: ${assignedUsers.filter((a) => a.user.role === UserRole.ADMIN).length}, ` +
          `Gold slots: ${slots.filter((s) => goldOnlySlots.has(`${s.slotNumber}-${s.team}`)).length}`,
      );
    }

    const shuffledUsers = [...shuffleableUsers];
    for (let i = shuffledUsers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledUsers[i], shuffledUsers[j]] = [
        shuffledUsers[j],
        shuffledUsers[i],
      ];
    }

    const shuffledSlotIds = [...availableSlotIds];
    for (let i = shuffledSlotIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSlotIds[i], shuffledSlotIds[j]] = [
        shuffledSlotIds[j],
        shuffledSlotIds[i],
      ];
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const assignment of shuffleableUsers) {
        const reservation = await queryRunner.manager.findOne(Reservation, {
          where: {
            slotId: assignment.slotId,
            userId: assignment.userId,
            gameId: game.id,
            status: ReservationStatus.CONFIRMED,
          },
        });

        if (reservation) {
          reservation.status = ReservationStatus.CANCELLED;
          reservation.cancelledAt = new Date();
          await queryRunner.manager.save(reservation);
        }

        const oldSlot = await queryRunner.manager.findOne(Slot, {
          where: { id: assignment.slotId },
        });
        if (oldSlot) {
          clearSlotAssignment(oldSlot);
          await queryRunner.manager.save(oldSlot);
        }
      }

      const assignments: Array<{ userId: number; slotId: number }> = [];
      for (let i = 0; i < shuffledUsers.length; i++) {
        const userAssignment = shuffledUsers[i];
        const targetSlotId = shuffledSlotIds[i];

        const targetSlot = await queryRunner.manager.findOne(Slot, {
          where: { id: targetSlotId },
        });
        if (!targetSlot) {
          throw new BadRequestException(`Slot ${targetSlotId} not found`);
        }

        if (
          targetSlot.isReserved &&
          targetSlot.reservedByUserId !== userAssignment.userId
        ) {
          throw new BadRequestException(
            `Slot ${targetSlotId} is already reserved`,
          );
        }

        const newReservation = queryRunner.manager.create(
          Reservation,
          buildZeroCostReservation({
            slotId: targetSlotId,
            userId: userAssignment.userId,
            gameId: game.id,
          }),
        );
        await queryRunner.manager.save(newReservation);

        targetSlot.isReserved = true;
        targetSlot.reservedByUserId = userAssignment.userId;
        targetSlot.isPreAssigned = false;
        targetSlot.preAssignedUserId = null;
        await queryRunner.manager.save(targetSlot);

        assignments.push({
          userId: userAssignment.userId,
          slotId: targetSlotId,
        });
      }

      if (assignments.length !== shuffledUsers.length) {
        throw new BadRequestException(
          `Failed to assign all users. Expected ${shuffledUsers.length} assignments but got ${assignments.length}`,
        );
      }

      await queryRunner.commitTransaction();

      const finalReservations = await this.reservationRepository.count({
        where: {
          gameId: game.id,
          status: ReservationStatus.CONFIRMED,
        },
      });

      if (finalReservations !== totalUsersBeforeShuffle) {
        console.error(
          `Warning: User count mismatch after shuffle. Before: ${totalUsersBeforeShuffle}, After: ${finalReservations}`,
        );
      }

      for (const assignment of assignments) {
        this.websocketService.broadcast(
          WebsocketEvents.SlotAvailabilityChanged,
          {
            gameId: game.id,
            slotId: assignment.slotId,
          },
        );
      }

      for (const oldAssignment of shuffleableUsers) {
        this.websocketService.broadcast(
          WebsocketEvents.SlotAvailabilityChanged,
          {
            gameId: game.id,
            slotId: oldAssignment.slotId,
          },
        );
      }

      this.websocketService.broadcast(WebsocketEvents.GamePlayersShuffled, {
        gameId: game.id,
        shuffledCount: shuffledUsers.length,
      });

      const adminUsersCount = assignedUsers.filter(
        (a) => a.user.role === UserRole.ADMIN,
      ).length;
      const goldSlotUsersCount = usersToKeepInPlace.size;
      await this.auditService.log({
        userId: adminId,
        action: 'GAME_PLAYERS_SHUFFLED',
        entityType: 'Game',
        entityId: game.id.toString(),
        details: {
          shuffledCount: shuffledUsers.length,
          totalUsersBefore: totalUsersBeforeShuffle,
          totalUsersAfter: finalReservations,
          excludedAdminUsers: adminUsersCount,
          excludedGoldSlotUsers: goldSlotUsersCount,
          excludedGoldSlots: slots.length - availableSlotIds.length,
        },
      });

      return {
        shuffled: shuffledUsers.length,
        message: `Successfully shuffled ${shuffledUsers.length} players. All users remain assigned to slots.`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
