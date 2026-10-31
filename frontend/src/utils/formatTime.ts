import { parseISO, format } from 'date-fns';

/**
 * Safely extracts HH:mm time string without timezone shifting.
 * Handles ISO strings ('2026-10-22T09:00:00'), space-separated strings ('2026-10-22 09:00:00'),
 * or raw time strings ('09:00').
 */
export function formatTimeHHmm(dateTimeStr: string | undefined | null): string {
  if (!dateTimeStr) return '';

  const str = String(dateTimeStr).trim();

  // If already in HH:mm format (e.g. "09:00")
  if (/^\d{2}:\d{2}$/.test(str)) {
    return str;
  }

  // If contains 'T' (e.g. "2026-10-22T09:00:00" or "2026-10-22T09:00:00.000Z")
  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    return timePart.substring(0, 5);
  }

  // If space separated (e.g. "2026-10-22 09:00:00")
  if (str.includes(' ')) {
    const timePart = str.split(' ')[1];
    return timePart.substring(0, 5);
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    }
  } catch {
    // Ignore and fallback
  }

  return str;
}

/**
 * Formats a UTC timestamp into the user's local date and time string.
 * Example: '2026-10-23T05:56:46.188055' -> '23 Oct 2026, 11:26'
 */
export function formatFeedbackDateTime(
  dateTimeStr: string | undefined | null,
  pattern: string = 'd MMM yyyy, HH:mm'
): string {
  if (!dateTimeStr) return '';
  const str = String(dateTimeStr).trim();

  // If the ISO string does not specify timezone (Z or +/-HH:mm), treat it as UTC
  // so the client converts it to local user time.
  const isTimezoneAware = str.endsWith('Z') || /[+-]\d{2}(:?\d{2})?$/.test(str);
  const isoUtc = isTimezoneAware ? str : str.replace(' ', 'T') + 'Z';

  try {
    const d = parseISO(isoUtc);
    if (!isNaN(d.getTime())) {
      return format(d, pattern);
    }
  } catch {
    // fallback
  }

  return str;
}
