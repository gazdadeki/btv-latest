export const TimezoneUtils = {
  utcToLocalDatetimeLocal(utcDateString: string | Date): string {
    if (!utcDateString) return '';
    const date = new Date(utcDateString);
    if (isNaN(date.getTime())) {
      console.warn(
        'Invalid date provided to utcToLocalDatetimeLocal:',
        utcDateString,
      );
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  },

  localDatetimeLocalToUtc(localDatetimeString: string): string | null {
    if (!localDatetimeString) return null;
    const localDate = new Date(localDatetimeString);
    if (isNaN(localDate.getTime())) {
      console.warn(
        'Invalid datetime-local value provided to localDatetimeLocalToUtc:',
        localDatetimeString,
      );
      return null;
    }
    return localDate.toISOString();
  },

  formatDateUTC(
    date: string | Date,
    options: {
      includeTime?: boolean;
      includeSeconds?: boolean;
      dateStyle?: 'short' | 'medium' | 'long' | 'full';
      timeStyle?: 'short' | 'medium' | 'long' | 'full';
    } = {},
  ): string {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateUTC:', date);
      return 'N/A';
    }
    const {
      includeTime = true,
      dateStyle = 'short',
      timeStyle = 'short',
    } = options;
    const formatOptions: Intl.DateTimeFormatOptions = {
      dateStyle,
      ...(includeTime && { timeStyle, hour12: true }),
    };
    return dateObj.toLocaleString(undefined, formatOptions);
  },

  formatDateTimeUTC(
    date: string | Date,
    options: { includeSeconds?: boolean; includeTimezone?: boolean } = {},
  ): string {
    if (!date) return '';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateTimeUTC:', date);
      return '';
    }
    const { includeSeconds = false, includeTimezone = false } = options;
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...(includeSeconds && { second: '2-digit' }),
      ...(includeTimezone && { timeZoneName: 'short' }),
    };
    return dateObj.toLocaleString(undefined, formatOptions);
  },

  formatDateOnlyUTC(
    date: string | Date,
    options: { dateStyle?: 'short' | 'medium' | 'long' | 'full' } = {},
  ): string {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateOnlyUTC:', date);
      return 'N/A';
    }
    const { dateStyle = 'short' } = options;
    return dateObj.toLocaleDateString(undefined, { dateStyle });
  },

  formatTimeUTC(
    date: string | Date,
    options: { includeSeconds?: boolean; hour12?: boolean } = {},
  ): string {
    if (!date) return '';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatTimeUTC:', date);
      return '';
    }
    const { includeSeconds = false, hour12 = true } = options;
    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12,
      ...(includeSeconds && { second: '2-digit' }),
    };
    return dateObj.toLocaleTimeString(undefined, formatOptions);
  },

  getCurrentDateLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getCurrentDatetimeLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  },
};

if (typeof window !== 'undefined') {
  window.TimezoneUtils = TimezoneUtils;
}
