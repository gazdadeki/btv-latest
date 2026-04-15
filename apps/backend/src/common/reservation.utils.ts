import {
  ReservationStatus,
  Reservation,
} from '../reservations/entities/reservation.entity';
import { Slot } from '../games/entities/slot.entity';
import { EntityManager, In } from 'typeorm';

/** Active reservation statuses used across queries. */
export const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatus.RESERVED,
  ReservationStatus.CONFIRMED,
] as const;

/**
 * Returns the data shape for a zero-cost confirmed reservation.
 * The caller is responsible for calling `manager.create(Reservation, ...)` and `manager.save(...)`.
 */
export function buildZeroCostReservation(fields: {
  slotId: number;
  userId: number;
  gameId: number;
}): Partial<Reservation> {
  const now = new Date();
  return {
    slotId: fields.slotId,
    userId: fields.userId,
    gameId: fields.gameId,
    status: ReservationStatus.CONFIRMED,
    reservationCostPaid: 0,
    confirmationCostPaid: 0,
    totalCostPaid: 0,
    discountApplied: 0,
    originalCost: 0,
    reservedAt: now,
    confirmedAt: now,
  };
}

/** Clears all reservation and pre-assignment fields on a slot. */
export function clearSlotAssignment(slot: Slot): void {
  slot.isReserved = false;
  slot.reservedByUserId = null;
  slot.isPreAssigned = false;
  slot.preAssignedUserId = null;
}

/**
 * Cancels the active reservation on a slot (if any).
 * Finds by slotId + gameId with RESERVED/CONFIRMED status, sets to CANCELLED.
 */
export async function cancelActiveReservation(
  manager: EntityManager,
  slotId: number,
  gameId: number,
): Promise<void> {
  const reservation = await manager.findOne(Reservation, {
    where: {
      slotId,
      gameId,
      status: In(ACTIVE_RESERVATION_STATUSES),
    },
  });
  if (reservation) {
    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    await manager.save(reservation);
  }
}
