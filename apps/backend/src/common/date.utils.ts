/**
 * Returns the UTC date portion of a Date as a YYYY-MM-DD string.
 * Avoids the common pitfall of toISOString().split('T')[0] applied to a
 * local-time Date, which can return the previous day for negative UTC offsets.
 */
export function toUtcDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns a new Date at UTC midnight (00:00:00.000) on the same UTC calendar day. */
export function utcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Formats a Date as dd.mm.yyyy using UTC components. */
export function formatUtcDateDDMMYYYY(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/** Returns a new Date at UTC end-of-day (23:59:59.999) on the same UTC calendar day. */
export function utcEndOfDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}
