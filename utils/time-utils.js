/**
 * time-utils.js
 * 
 * Utility functions for time calculations and formatting
 */

/**
 * Format a duration in seconds to a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "2h 30m")
 */
export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '0h 0m';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Format time in seconds to HH:MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '00:00:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Get array of dates for the last N days
 * @param {number} n - Number of days to get
 * @returns {Array<string>} Array of dates in YYYY-MM-DD format
 */
export function getLastNDays(n) {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

/**
 * Calculate remaining time in a period
 * @param {number} startTime - Start timestamp (ms)
 * @param {number} periodDuration - Period duration (minutes)
 * @returns {number} Remaining time in seconds
 */
export function calculateRemainingTime(startTime, periodDuration) {
  const now = Date.now();
  const endTime = startTime + (periodDuration * 60 * 1000);
  const remainingMs = endTime - now;
  
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Format milliseconds since epoch to a readable time string
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted time string (HH:MM)
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get the week number for a given date
 * @param {Date} date - Date to get week number for
 * @returns {string} Week identifier in YYYY-WXX format
 */
export function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 86400000 / 7) + 1;
  return `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}
