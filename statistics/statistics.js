/**
 * statistics.js
 * 
 * Script for the Random Beep statistics page.
 * Handles loading and displaying statistics data.
 */

import { formatDuration, getLastNDays, getWeekNumber } from '../utils/time-utils.js';
import { applyTheme, initializeTheme } from '../utils/theme-utils.js';

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

/**
 * Initialize the statistics page
 */
async function initStatistics() {
  try {
    // Initialize theme
    await initializeTheme();
    
    // Load statistics data
    await loadStatistics();
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing statistics page:', error);
    displayErrorMessage('Failed to initialize statistics. Please try again later.');
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
          displayErrorMessage('Could not load statistics data.');
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
    updateStatisticsDisplay();
    throw error;
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
      displayErrorMessage('Charts could not be loaded. Please reload the page.');
    }
  } catch (error) {
    console.error('Error updating charts:', error);
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
    return date.toLocaleDateString(undefined, { weekday: 'short' });
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
        label: 'Focus Hours',
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
            text: 'Hours'
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
    type: 'pie',
    data: {
      labels: ['Short Breaks', 'Long Breaks'],
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
  const dataStr = JSON.stringify(statisticsData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileName = `random-beep-statistics-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileName);
  linkElement.style.display = 'none';
  
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
}

/**
 * Show confirmation dialog for clearing statistics
 */
function confirmClearStatistics() {
  // Create confirmation dialog
  const dialog = document.createElement('div');
  dialog.className = 'confirmation-dialog';
  
  const dialogContent = document.createElement('div');
  dialogContent.className = 'dialog-content';
  
  const dialogTitle = document.createElement('h3');
  dialogTitle.className = 'dialog-title';
  dialogTitle.textContent = 'Clear Statistics';
  
  const dialogMessage = document.createElement('p');
  dialogMessage.className = 'dialog-message';
  dialogMessage.textContent = 'Are you sure you want to clear all statistics data? This action cannot be undone.';
  
  const dialogButtons = document.createElement('div');
  dialogButtons.className = 'dialog-buttons';
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'secondary-button';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', () => {
    dialog.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(dialog);
    }, 300);
  });
  
  const confirmButton = document.createElement('button');
  confirmButton.className = 'danger-button';
  confirmButton.textContent = 'Clear Data';
  confirmButton.addEventListener('click', () => {
    clearStatistics();
    dialog.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(dialog);
    }, 300);
  });
  
  dialogButtons.appendChild(cancelButton);
  dialogButtons.appendChild(confirmButton);
  
  dialogContent.appendChild(dialogTitle);
  dialogContent.appendChild(dialogMessage);
  dialogContent.appendChild(dialogButtons);
  
  dialog.appendChild(dialogContent);
  document.body.appendChild(dialog);
  
  // Show dialog with animation
  setTimeout(() => {
    dialog.classList.add('show');
  }, 10);
}

/**
 * Clear all statistics data
 */
function clearStatistics() {
  chrome.runtime.sendMessage({ action: 'clearStatistics' }, () => {
    statisticsData = { dailyFocus: {}, weeklyFocus: {} };
    updateStatisticsDisplay();
  });
}

// Initialize statistics page when DOM is loaded
document.addEventListener('DOMContentLoaded', initStatistics);
