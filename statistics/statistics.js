/**
 * statistics.js
 * 
 * Script for the Random Beep statistics page.
 * Handles loading and displaying statistics data.
 */

import { formatDuration, getLastNDays, getWeekNumber } from '../utils/time-utils.js';
import { applyTheme, initializeTheme } from '../utils/theme-utils.js';
import { languageManager } from '../utils/language-manager.js'; // Import languageManager

// DOM Elements
const dailyChartCanvas = document.getElementById('daily-chart');
const breakChartCanvas = document.getElementById('break-chart');
const todayFocusTimeElement = document.getElementById('today-focus-time');
const todayShortBreaksElement = document.getElementById('today-short-breaks');
const todayLongBreaksElement = document.getElementById('today-long-breaks');
const todaySessionsElement = document.getElementById('today-sessions');
const weekFocusTimeElement = document.getElementById('week-focus-time');
const weekShortBreaksElement = document.getElementById('week-short-breaks');
const weekLongBreaksElement = document.getElementById('week-long-breaks');
const weekSessionsElement = document.getElementById('week-sessions');
const exportButton = document.getElementById('export-button');
const clearButton = document.getElementById('clear-button');
const backButton = document.getElementById('back-button');

// Chart instances
let dailyChart = null;
let breakChart = null;

// Statistics data
let statisticsData = null;
let currentSettings = null; // To store loaded settings including language

// Function to apply internationalized strings to the page
function applyI18n() {
  document.querySelectorAll('[data-i18n-key]').forEach(element => {
    const key = element.getAttribute('data-i18n-key');
    const message = languageManager.get(key);
    if (message) {
      element.textContent = message;
    }
  });
  // For elements like <title> that use __MSG_key__
  document.title = languageManager.get("statisticsPageTitle") || document.title;
  if (backButton) {
    backButton.title = languageManager.get("statisticsBackButtonTitle") || backButton.title;
  }
}

/**
 * Initialize the statistics page
 */
async function initStatistics() {
  try {
    // Load settings to get the language preference
    currentSettings = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getSettings' }, resolve));
    await languageManager.setLocale(currentSettings?.language || 'en');
    
    await initializeTheme();
    applyI18n(); // Apply translations after theme and before loading data that might use them
    
    // Load statistics data
    await loadStatistics();
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing statistics page:', error);
    // Ensure languageManager is loaded enough to get error messages if possible
    await languageManager.setLocale(currentSettings?.language || 'en'); 
    displayErrorMessage(languageManager.get("errorInitStats"));
  }
}

/**
 * Load statistics data from storage
 */
async function loadStatistics() {
  try {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('statistics', (data) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading statistics:', chrome.runtime.lastError);
          displayErrorMessage(languageManager.get("errorLoadStats"));
          statisticsData = { dailyFocus: {}, weeklyFocus: {} };
          updateStatisticsDisplay();
          reject(chrome.runtime.lastError);
        } else {
          statisticsData = data.statistics || { dailyFocus: {}, weeklyFocus: {} };
          updateStatisticsDisplay();
          resolve(statisticsData);
        }
      });
    });
  } catch (error) {
    console.error('Error in loadStatistics:', error);
    statisticsData = { dailyFocus: {}, weeklyFocus: {} };
    updateStatisticsDisplay(); // Still update with empty data
    displayErrorMessage(languageManager.get("errorLoadStats")); // Show error
    throw error; // Re-throw if needed by caller, or handle more gracefully
  }
}

/**
 * Display error message in the UI
 * @param {string} message - Error message to display
 */
function displayErrorMessage(message) {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-message';
  errorContainer.textContent = message;
  
  // Add to the top of main content
  const mainContent = document.querySelector('main');
  if (mainContent && mainContent.firstChild) {
    mainContent.insertBefore(errorContainer, mainContent.firstChild);
  } else if (mainContent) {
    mainContent.appendChild(errorContainer);
  } else {
    document.body.appendChild(errorContainer);
  }
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (errorContainer.parentNode) {
      errorContainer.parentNode.removeChild(errorContainer);
    }
  }, 5000);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Export button
  exportButton.addEventListener('click', exportStatistics);
  
  // Clear button
  clearButton.addEventListener('click', confirmClearStatistics);
  
  // Back button
  backButton.addEventListener('click', () => {
    window.close();
  });
}

/**
 * Update statistics display
 */
function updateStatisticsDisplay() {
  updateMetrics();
  try {
    // Check if Chart is available
    if (typeof Chart !== 'undefined') {
      createDailyChart();
      createBreakChart();
    } else {
      console.error('Chart.js not available');
      displayErrorMessage(languageManager.get("errorLoadCharts"));
    }
  } catch (error) {
    console.error('Error updating charts:', error);
    // Consider a more specific error message for chart creation failure
    displayErrorMessage(languageManager.get("errorLoadCharts")); 
  }
}

/**
 * Update metrics display
 */
function updateMetrics() {
  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  
  // Get this week
  const week = getWeekNumber(new Date());
  
  // Today's metrics
  const todayStats = statisticsData.dailyFocus[today] || {
    totalFocusTime: 0,
    shortBreaksTaken: 0,
    longBreaksTaken: 0,
    sessionsCompleted: 0
  };
  
  todayFocusTimeElement.textContent = formatDuration(todayStats.totalFocusTime);
  todayShortBreaksElement.textContent = todayStats.shortBreaksTaken;
  todayLongBreaksElement.textContent = todayStats.longBreaksTaken;
  todaySessionsElement.textContent = todayStats.sessionsCompleted;
  
  // This week's metrics
  const weekStats = statisticsData.weeklyFocus[week] || {
    totalFocusTime: 0,
    shortBreaksTaken: 0,
    longBreaksTaken: 0,
    sessionsCompleted: 0
  };
  
  weekFocusTimeElement.textContent = formatDuration(weekStats.totalFocusTime);
  weekShortBreaksElement.textContent = weekStats.shortBreaksTaken;
  weekLongBreaksElement.textContent = weekStats.longBreaksTaken;
  weekSessionsElement.textContent = weekStats.sessionsCompleted;
}

/**
 * Create daily focus chart
 */
function createDailyChart() {
  // Get the last 7 days
  const days = getLastNDays(7).reverse();
  
  // Prepare data
  const focusData = days.map(day => {
    const dayStats = statisticsData.dailyFocus[day] || { totalFocusTime: 0 };
    return dayStats.totalFocusTime / 3600; // Convert seconds to hours
  });
  
  // Format labels as day names
  const labels = days.map(day => {
    const date = new Date(day);
    return date.toLocaleDateString(languageManager.getCurrentLocale(), { weekday: 'short' });
  });
  
  // Destroy existing chart if it exists
  if (dailyChart) {
    dailyChart.destroy();
  }
  
  // Create new chart
  dailyChart = new Chart(dailyChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: languageManager.get("statsChartFocusHoursLabel"),
        data: focusData,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1') || '#3F51B5',
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1') || '#3F51B5',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: languageManager.get("statsChartHoursYAxisLabel")
          }
        }
      }
    }
  });
}

/**
 * Create break distribution chart
 */
function createBreakChart() {
  // Get the last 7 days
  const days = getLastNDays(7);
  
  // Prepare data
  let totalShortBreaks = 0;
  let totalLongBreaks = 0;
  
  days.forEach(day => {
    const dayStats = statisticsData.dailyFocus[day] || { shortBreaksTaken: 0, longBreaksTaken: 0 };
    totalShortBreaks += dayStats.shortBreaksTaken;
    totalLongBreaks += dayStats.longBreaksTaken;
  });
  
  // Destroy existing chart if it exists
  if (breakChart) {
    breakChart.destroy();
  }
  
  // Create new chart
  breakChart = new Chart(breakChartCanvas, {
    type: 'doughnut',
    data: {
      labels: [languageManager.get("statsChartShortBreaksLabel"), languageManager.get("statsChartLongBreaksLabel")],
      datasets: [{
        data: [totalShortBreaks, totalLongBreaks],
        backgroundColor: [
          getComputedStyle(document.documentElement).getPropertyValue('--chart-color-2') || '#FFC107',
          getComputedStyle(document.documentElement).getPropertyValue('--chart-color-3') || '#4CAF50'
        ],
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--background-color') || '#FFFFFF',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

/**
 * Export statistics data as JSON
 */
function exportStatistics() {
  if (!statisticsData || Object.keys(statisticsData.dailyFocus || {}).length === 0) {
    displayErrorMessage(languageManager.get("statsNoDataToExport"));
    return;
  }
  const dataStr = JSON.stringify(statisticsData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'statistics.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert(languageManager.get("statsDataExported"));
}

/**
 * Show confirmation dialog for clearing statistics
 */
function confirmClearStatistics() {
  if (confirm(languageManager.get("statsConfirmClear"))) {
    clearAllStatistics();
  }
}

/**
 * Clear all statistics data
 */
async function clearAllStatistics() {
  try {
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'clearStatistics' }, (response) => {
        if (response && response.success) {
          statisticsData = { dailyFocus: {}, weeklyFocus: {} };
          updateStatisticsDisplay();
          alert(languageManager.get("statsHistoryCleared"));
          resolve();
        } else {
          alert(languageManager.get("statsClearHistoryFailed") + (response.error ? `: ${response.error}` : ''));
          reject(new Error(response.error || "Failed to clear stats from background"));
        }
      });
    });
  } catch (error) {
    console.error('Error clearing statistics:', error);
    alert(languageManager.get("statsClearHistoryFailed"));
  }
}

// Initialize statistics page when DOM is loaded
document.addEventListener('DOMContentLoaded', initStatistics);
