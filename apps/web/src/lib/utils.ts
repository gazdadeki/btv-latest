import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return dateString;
  }
}

export function toastError(err: unknown, prefix = 'Failed') {
  toast.error(
    `${prefix}: ${err instanceof Error ? err.message : 'Unknown error'}`,
  );
}

export function formatDateOnly(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Converts a UTC HH:MM time string (as stored in the database) to the
 * equivalent local HH:MM string for display in time inputs.
 */
export function utcTimeToLocal(hhmm: string): string {
  if (!hhmm) return '';
  const [hours, minutes] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(hours, minutes, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Converts a local HH:MM time string (from a time input) to the equivalent
 * UTC HH:MM string for storage in the database.
 */
export function localTimeToUtc(hhmm: string): string {
  if (!hhmm) return '';
  const [hours, minutes] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
