/**
 * Parse a time string in "M:SS" format to total seconds
 * @param {string} str - Time string like "4:21"
 * @returns {number|null} Total seconds, or null if empty/invalid
 */
export function parseTime(str) {
  if (!str || typeof str !== 'string') return null;

  const trimmed = str.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;

  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);

  if (isNaN(minutes) || isNaN(seconds) || seconds < 0 || seconds >= 60) {
    return null;
  }

  return minutes * 60 + seconds;
}

/**
 * Alias for parseTime
 */
export const timeToSeconds = parseTime;

/**
 * Format seconds to "M:SS" string
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string like "4:21" or "—" if null/undefined
 */
export function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '—';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get CSS class based on time thresholds
 * @param {number} seconds - Time in seconds
 * @returns {string} Tailwind CSS class
 */
export function getTimeClass(seconds) {
  if (seconds === null || seconds === undefined) return '';

  if (seconds < 300) {
    return 'text-green-600';
  } else if (seconds < 420) {
    return 'text-amber-600';
  } else {
    return 'text-red-600';
  }
}

/**
 * Get rank badge CSS classes
 * @param {number} rank - Rank (1, 2, 3, or other)
 * @returns {string} Tailwind CSS classes
 */
export function getRankBadge(rank) {
  switch (rank) {
    case 1:
      return 'bg-yellow-500 text-yellow-950 font-bold';
    case 2:
      return 'bg-slate-400 text-slate-900 font-bold';
    case 3:
      return 'bg-orange-700 text-white font-bold';
    default:
      return 'bg-slate-200 text-slate-600';
  }
}

/**
 * Calculate average of an array of times (in seconds)
 * @param {number[]} times - Array of times in seconds
 * @returns {number} Average time rounded to nearest second
 */
export function calculateCrewAvg(times) {
  if (!times || times.length === 0) return 0;

  const validTimes = times.filter(t => typeof t === 'number' && t > 0);
  if (validTimes.length === 0) return 0;

  const sum = validTimes.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / validTimes.length);
}

/**
 * Supported years for JRPAT tracker
 */
const currentYear = new Date().getFullYear();
export const YEARS = Array.from(
  { length: currentYear - 2020 + 2 },
  (_, i) => 2020 + i
);

/**
 * Fire station codes
 */
export const STATIONS = ['Station 211', 'Station 212', 'Station 213', 'Station 214'];

/**
 * Shift designations
 */
export const SHIFTS = ['A-Shift', 'B-Shift', 'C-Shift', 'Admin'];
