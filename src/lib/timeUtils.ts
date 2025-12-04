/**
 * Time utility functions with consistent GMT+8 timezone formatting
 * This ensures no hydration mismatch between server and client
 */

/**
 * Format a date to GMT+8 timezone string
 * Uses explicit timezone to avoid SSR/client mismatch
 */
export function formatTimeGMT8(date: Date | number | string | null | undefined): string {
  if (!date) return '—';
  
  const d = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '—';
  
  // Format in Asia/Kuala_Lumpur timezone (GMT+8)
  return d.toLocaleTimeString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date to GMT+8 timezone with date included
 */
export function formatDateTimeGMT8(date: Date | number | string | null | undefined): string {
  if (!date) return '—';
  
  const d = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '—';
  
  // Format in Asia/Kuala_Lumpur timezone (GMT+8)
  return d.toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format just the date portion in GMT+8
 */
export function formatDateGMT8(date: Date | number | string | null | undefined): string {
  if (!date) return '—';
  
  const d = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '—';
  
  return d.toLocaleDateString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for short display (HH:MM only)
 */
export function formatTimeShortGMT8(date: Date | number | string | null | undefined): string {
  if (!date) return '—';
  
  const d = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '—';
  
  return d.toLocaleTimeString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get current time in GMT+8 as a formatted string
 */
export function getCurrentTimeGMT8(): string {
  return formatTimeGMT8(new Date());
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'Now';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  if (minutes > 0) {
    return `${minutes}m`;
  }
  
  return `${seconds}s`;
}

/**
 * Calculate time until next refresh based on last timestamp
 */
export function getTimeUntilNextRefresh(lastTimestamp: number, intervalMs: number = 60 * 60 * 1000): {
  timeUntil: number;
  formatted: string;
  needsRefresh: boolean;
} {
  const now = Date.now();
  const timeSinceLast = now - lastTimestamp;
  const timeUntil = Math.max(0, intervalMs - timeSinceLast);
  
  return {
    timeUntil,
    formatted: timeUntil > 0 ? formatDuration(timeUntil) : 'Refreshing...',
    needsRefresh: timeUntil <= 0,
  };
}
