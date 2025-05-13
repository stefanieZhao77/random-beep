/**
 * statistics.js
 * 
 * This module handles the tracking and storage of usage statistics:
 * - Recording focus sessions
 * - Tracking breaks taken
 * - Calculating daily and weekly statistics
 * - Providing data for visualization
 */

import { loadSettings } from './settings.js';

/**
 * Get the ISO date string for today (YYYY-MM-DD)
 * @returns {string} Today's date in ISO format
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the week number and year (YYYY-WXX)
 * @param {Date} date - Date to get week for
 * @returns {string} Week identifier in YYYY-WXX format
 */
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 86400000 / 7) + 1;
  return `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get default statistics structure
 * @returns {Object} Empty statistics structure
 */
function getDefaultStatistics() {
  return {
    dailyFocus: {},
    weeklyFocus: {}
  };
}

/**
 * Get default daily statistics object
 * @returns {Object} Default daily statistics
 */
function getDefaultDailyStats() {
  return {
    totalFocusTime: 0,      // seconds
    shortBreaksTaken: 0,
    longBreaksTaken: 0,
    sessionsCompleted: 0
  };
}

/**
 * Load statistics from storage
 * @returns {Promise<Object>} Promise that resolves with statistics object
 */
function loadStatistics() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('statistics', (data) => {
      if (chrome.runtime.lastError || !data.statistics) {
        resolve(getDefaultStatistics());
      } else {
        resolve(data.statistics);
      }
    });
  });
}

/**
 * Save statistics to storage
 * @param {Object} statistics - Statistics object to save
 * @returns {Promise} Promise that resolves when statistics are saved
 */
function saveStatistics(statistics) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ statistics }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(statistics);
      }
    });
  });
}

/**
 * Update statistics with completed session data
 * @param {number} focusTime - Focus time in seconds
 * @param {number} shortBreaks - Number of short breaks taken
 * @param {number} longBreaks - Number of long breaks taken
 * @returns {Promise<Object>} Promise that resolves with updated statistics
 */
async function updateStatistics(focusTime, shortBreaks, longBreaks) {
  const today = getTodayString();
  const week = getWeekNumber(new Date());
  
  const stats = await loadStatistics();
  
  // Initialize daily stats if not present
  if (!stats.dailyFocus[today]) {
    stats.dailyFocus[today] = getDefaultDailyStats();
  }
  
  // Initialize weekly stats if not present
  if (!stats.weeklyFocus[week]) {
    stats.weeklyFocus[week] = getDefaultDailyStats();
  }
  
  // Update daily stats
  stats.dailyFocus[today].totalFocusTime += focusTime;
  stats.dailyFocus[today].shortBreaksTaken += shortBreaks;
  stats.dailyFocus[today].longBreaksTaken += longBreaks;
  stats.dailyFocus[today].sessionsCompleted += longBreaks > 0 ? 1 : 0;
  
  // Update weekly stats
  stats.weeklyFocus[week].totalFocusTime += focusTime;
  stats.weeklyFocus[week].shortBreaksTaken += shortBreaks;
  stats.weeklyFocus[week].longBreaksTaken += longBreaks;
  stats.weeklyFocus[week].sessionsCompleted += longBreaks > 0 ? 1 : 0;
  
  // Clean up old data (keep only last 30 days and 12 weeks)
  cleanupOldStatistics(stats);
  
  return saveStatistics(stats);
}

/**
 * Clean up old statistics data
 * @param {Object} stats - Statistics object to clean
 * @returns {Object} Cleaned statistics object
 */
function cleanupOldStatistics(stats) {
  // Keep only the last 30 days
  const dailyKeys = Object.keys(stats.dailyFocus).sort().reverse();
  if (dailyKeys.length > 30) {
    const keysToKeep = dailyKeys.slice(0, 30);
    const newDailyFocus = {};
    
    keysToKeep.forEach(key => {
      newDailyFocus[key] = stats.dailyFocus[key];
    });
    
    stats.dailyFocus = newDailyFocus;
  }
  
  // Keep only the last 12 weeks
  const weeklyKeys = Object.keys(stats.weeklyFocus).sort().reverse();
  if (weeklyKeys.length > 12) {
    const keysToKeep = weeklyKeys.slice(0, 12);
    const newWeeklyFocus = {};
    
    keysToKeep.forEach(key => {
      newWeeklyFocus[key] = stats.weeklyFocus[key];
    });
    
    stats.weeklyFocus = newWeeklyFocus;
  }
  
  return stats;
}

/**
 * Get today's statistics
 * @returns {Promise<Object>} Promise that resolves with today's statistics
 */
async function getTodayStatistics() {
  const stats = await loadStatistics();
  const today = getTodayString();
  
  return stats.dailyFocus[today] || getDefaultDailyStats();
}

/**
 * Get this week's statistics
 * @returns {Promise<Object>} Promise that resolves with this week's statistics
 */
async function getThisWeekStatistics() {
  const stats = await loadStatistics();
  const week = getWeekNumber(new Date());
  
  return stats.weeklyFocus[week] || getDefaultDailyStats();
}

/**
 * Get daily statistics for the last n days
 * @param {number} days - Number of days to retrieve
 * @returns {Promise<Object>} Promise that resolves with daily statistics
 */
async function getDailyStatistics(days = 7) {
  const stats = await loadStatistics();
  const result = {};
  
  // Get the last n days
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    result[dateString] = stats.dailyFocus[dateString] || getDefaultDailyStats();
  }
  
  return result;
}

/**
 * Export statistics data as JSON
 * @returns {Promise<string>} Promise that resolves with JSON string
 */
async function exportStatistics() {
  const stats = await loadStatistics();
  return JSON.stringify(stats, null, 2);
}

/**
 * Clear all statistics data
 * @returns {Promise} Promise that resolves when statistics are cleared
 */
async function clearStatistics() {
  return saveStatistics(getDefaultStatistics());
}

// Export the module's public API
export {
  loadStatistics,
  saveStatistics,
  updateStatistics,
  getTodayStatistics,
  getThisWeekStatistics,
  getDailyStatistics,
  exportStatistics,
  clearStatistics
};
