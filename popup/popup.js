/**
 * popup.js
 * 
 * Main script for the Random Beep popup interface.
 * Handles UI updates, user interactions, and communication with the background script.
 */

import { formatTime, formatDuration } from '../utils/time-utils.js';
import { initializeTheme, applyTheme } from '../utils/theme-utils.js';

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const progressFill = document.getElementById('progress-fill');
const shortBreakTimeElement = document.getElementById('short-break-time');
const longBreakTimeElement = document.getElementById('long-break-time');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const resetButton = document.getElementById('reset-button');
const todayFocusElement = document.getElementById('today-focus');
const breaksTakenElement = document.getElementById('breaks-taken');
const settingsButton = document.getElementById('settings-button');
const statsButton = document.getElementById('stats-button');

// Session state
let currentSession = null;
let settings = null;
let updateInterval = null;
let estimatedShortBreakMinute = null; // Store the estimated break time for consistency

/**
 * Initialize the popup
 */
async function initPopup() {
  // Load settings and session state
  await Promise.all([
    loadSettings(),
    loadSessionState()
  ]);
  
  // Set up event listeners
  setupEventListeners();
  
  // Start UI update interval
  startUpdateInterval();
  
  // Load statistics
  loadStatistics();
  
  // Apply theme from settings
  await initializeTheme();
}

/**
 * Load user settings from background script
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      settings = response;
      resolve(settings);
    });
  });
}

/**
 * Load session state from background script
 */
async function loadSessionState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getSessionState' }, (response) => {
      console.log('Received session state:', response);
      currentSession = response;
      updateUI();
      resolve(currentSession);
    });
  });
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  // Start button
  startButton.addEventListener('click', () => {
    if (!currentSession || currentSession.state === 'idle' || currentSession.state === 'longBreak') {
      startNewSession();
    } else if (currentSession.state === 'paused') {
      resumeSession();
    }
  });
  
  // Pause button
  pauseButton.addEventListener('click', () => {
    if (currentSession && currentSession.state === 'active') {
      pauseSession();
    }
  });
  
  // Reset button
  resetButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the current session?')) {
      resetSession();
    }
  });
  
  // Settings button
  settingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Stats button
  statsButton.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('statistics/statistics.html') });
  });
}

/**
 * Start a new session
 */
function startNewSession() {
  console.log('Starting new session...');
  estimatedShortBreakMinute = null; // Reset when starting a new session
  chrome.runtime.sendMessage({ action: 'startSession' }, (response) => {
    console.log('Start session response:', response);
    currentSession = response;
    updateUI();
  });
}

/**
 * Pause the current session
 */
function pauseSession() {
  chrome.runtime.sendMessage({ action: 'pauseSession' }, (response) => {
    currentSession = response;
    updateUI();
  });
}

/**
 * Resume the current session
 */
function resumeSession() {
  chrome.runtime.sendMessage({ action: 'resumeSession' }, (response) => {
    currentSession = response;
    updateUI();
  });
}

/**
 * Reset the current session
 */
function resetSession() {
  estimatedShortBreakMinute = null; // Reset when resetting session
  chrome.runtime.sendMessage({ action: 'resetSession' }, (response) => {
    currentSession = response;
    updateUI();
  });
}

/**
 * Start the UI update interval
 */
function startUpdateInterval() {
  // Clear any existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Update UI every second
  updateInterval = setInterval(() => {
    // Always update UI for active sessions and during breaks
    if (currentSession && (
        currentSession.state === 'active' || 
        currentSession.state === 'shortBreak' || 
        currentSession.state === 'longBreak')) {
      
      // Check if a long break has completed
      if (currentSession.state === 'longBreak' && settings) {
        const now = Date.now();
        const elapsed = (now - currentSession.stateStartTime) / 1000;
        const totalBreakTime = settings.longBreakDuration * 60;
        
        // If the long break duration has elapsed, reset the session display to idle state
        if (elapsed >= totalBreakTime) {
          console.log('Long break duration elapsed in UI, resetting to idle state');
          // Reset the UI to show idle state
          currentSession = null;
          updateUI();
          return;
        }
      }
      
      updateTimeDisplay();
      updateProgressBar();
      updateBreakInfo();
    }
  }, 1000);
}

/**
 * Update the UI based on current session state
 */
function updateUI() {
  updateTimeDisplay();
  updateProgressBar();
  updateBreakInfo();
  updateControlButtons();
  updateSessionStateClasses();
  loadStatistics();
}

/**
 * Update the time display
 */
function updateTimeDisplay() {
  if (!currentSession) {
    timeDisplay.textContent = '00:00:00';
    return;
  }
  
  // console.log('Current session in updateTimeDisplay:', currentSession); // Keep for debugging if needed
  
  let displayTime = 0;
  
  try {
    if (currentSession.state === 'active' || currentSession.state === 'paused') {
      // For active or paused sessions, show elapsed time directly from the session object
      // This value is continuously updated by the background script during 'active' state.
      displayTime = currentSession.elapsedTime || 0;
    } else if (currentSession.state === 'shortBreak') {
      // For short breaks, show remaining break time
      const now = Date.now();
      if (currentSession.stateStartTime && settings) {
        const elapsed = (now - currentSession.stateStartTime) / 1000;
        const remaining = Math.max(0, settings.shortBreakDuration - elapsed);
        displayTime = remaining;
      } else {
        // Fallback if data is missing
        displayTime = settings ? settings.shortBreakDuration : 10;
      }
    } else if (currentSession.state === 'longBreak') {
      // For long breaks, show remaining break time
      const now = Date.now();
      if (currentSession.stateStartTime && settings) {
        const elapsed = (now - currentSession.stateStartTime) / 1000;
        const totalBreakTime = settings.longBreakDuration * 60;
        
        // If the break has completed, show zero time
        if (elapsed >= totalBreakTime) {
          displayTime = 0;
        } else {
          const remaining = Math.max(0, totalBreakTime - elapsed);
          displayTime = remaining;
        }
      } else {
        // Fallback if data is missing
        displayTime = settings ? settings.longBreakDuration * 60 : 20 * 60;
      }
    }
  } catch (error) {
    console.error('Error updating time display:', error);
    displayTime = 0;
  }
  
  timeDisplay.textContent = formatTime(displayTime);
}

/**
 * Update the progress bar
 */
function updateProgressBar() {
  if (!currentSession || !settings) {
    progressFill.style.width = '0%';
    return;
  }
  
  let progress = 0;
  
  try {
    if (currentSession.state === 'active' || currentSession.state === 'paused') {
      // For active or paused sessions, show progress toward long break
      const totalSessionTime = settings.longPeriodDuration * 60; // in seconds
      let elapsed;
      
      if (currentSession.state === 'active' && currentSession.stateStartTime) {
        const now = Date.now();
        elapsed = (currentSession.elapsedTime || 0) + (now - currentSession.stateStartTime) / 1000;
      } else {
        elapsed = currentSession.elapsedTime || 0;
      }
      
      progress = Math.min(100, (elapsed / totalSessionTime) * 100);
    } else if (currentSession.state === 'shortBreak' && currentSession.stateStartTime) {
      // For short breaks, show break progress
      const now = Date.now();
      const elapsed = (now - currentSession.stateStartTime) / 1000;
      const totalBreakTime = settings.shortBreakDuration; // in seconds
      progress = Math.min(100, (elapsed / totalBreakTime) * 100);
    } else if (currentSession.state === 'longBreak' && currentSession.stateStartTime) {
      // For long breaks, show break progress
      const now = Date.now();
      const elapsed = (now - currentSession.stateStartTime) / 1000;
      const totalBreakTime = settings.longBreakDuration * 60; // in seconds
      
      // If the break time has elapsed but the session hasn't been reset yet,
      // show 100% progress to indicate completion
      if (elapsed >= totalBreakTime) {
        progress = 100;
      } else {
        progress = Math.min(100, (elapsed / totalBreakTime) * 100);
      }
    }
  } catch (error) {
    console.error('Error updating progress bar:', error);
    progress = 0;
  }
  
  progressFill.style.width = `${progress}%`;
}

/**
 * Update break information
 */
function updateBreakInfo() {
  if (!currentSession || !settings) {
    shortBreakTimeElement.textContent = 'N/A';
    longBreakTimeElement.textContent = 'N/A';
    estimatedShortBreakMinute = null; // Reset when no session
    return;
  }

  // Short break info
  if (currentSession.state === 'active') {
    // Calculate next short break time based on settings.shortPeriodDuration
    // For random breaks, show an estimated time
    if (estimatedShortBreakMinute === null) {
      // Only calculate once per session, between 20% and 80% of the period
      estimatedShortBreakMinute = Math.round(settings.shortPeriodDuration * (0.2 + Math.random() * 0.6));
    }
    // Use consistent format with prefix
    shortBreakTimeElement.textContent = `~${estimatedShortBreakMinute} mins (random)`;
  } else if (currentSession.state === 'shortBreak') {
    try {
      const now = Date.now();
      const elapsed = (now - currentSession.stateStartTime) / 1000;
      const remaining = Math.max(0, Math.ceil(settings.shortBreakDuration - elapsed));
      shortBreakTimeElement.textContent = `${remaining}s remaining`;
    } catch (error) {
      console.error('Error updating short break info:', error);
      shortBreakTimeElement.textContent = 'ending...';
    }
  } else if (currentSession.state === 'paused') {
    shortBreakTimeElement.textContent = `~paused (random)`;
  } else {
    shortBreakTimeElement.textContent = 'N/A';
    estimatedShortBreakMinute = null; // Reset when idle or other states
  }

  // Long break info
  switch (currentSession.state) {
    case 'active':
    case 'paused': // Show remaining time even if paused
      try {
        const totalSessionTime = settings.longPeriodDuration * 60; // in seconds
        // elapsedTime is the total focus time so far for the current focus period
        const elapsedSeconds = currentSession.elapsedTime || 0;
        const remainingSeconds = Math.max(0, totalSessionTime - elapsedSeconds);
        
        if (currentSession.state === 'paused') {
            longBreakTimeElement.textContent = `paused (${formatDuration(remainingSeconds)} to long break)`;
        } else {
            longBreakTimeElement.textContent = `${formatDuration(remainingSeconds)} to long break`;
        }
      } catch (error) {
        console.error('Error updating long break info for active/paused session:', error);
        longBreakTimeElement.textContent = 'calculating...';
      }
      break;
    case 'longBreak':
      try {
        const now = Date.now();
        const elapsed = (now - currentSession.stateStartTime) / 1000;
        const totalBreakTime = settings.longBreakDuration * 60;
        const remaining = Math.max(0, totalBreakTime - elapsed);
        
        // If no time remaining, show 'Complete' instead of '0s remaining'
        if (remaining <= 0) {
          longBreakTimeElement.textContent = 'Complete';
        } else {
          longBreakTimeElement.textContent = `${formatDuration(remaining)} remaining`;
        }
      } catch (error) {
        console.error('Error updating long break info for long break:', error);
        longBreakTimeElement.textContent = 'ending...';
      }
      break;
    default: // idle, shortBreak
      longBreakTimeElement.textContent = 'N/A';
      break;
  }
}

/**
 * Update control buttons state
 */
function updateControlButtons() {
  if (!currentSession) {
    startButton.querySelector('span:last-child').textContent = 'Start';
    startButton.disabled = false;
    pauseButton.disabled = true;
    resetButton.disabled = true;
    return;
  }
  
  switch (currentSession.state) {
    case 'idle':
      startButton.querySelector('span:last-child').textContent = 'Start';
      startButton.disabled = false;
      pauseButton.disabled = true;
      resetButton.disabled = true;
      break;
      
    case 'active':
      startButton.querySelector('span:last-child').textContent = 'Start';
      startButton.disabled = true;
      pauseButton.disabled = false;
      resetButton.disabled = false;
      break;
      
    case 'paused':
      startButton.querySelector('span:last-child').textContent = 'Resume';
      startButton.disabled = false;
      pauseButton.disabled = true;
      resetButton.disabled = false;
      break;
      
    case 'shortBreak':
      startButton.querySelector('span:last-child').textContent = 'Start';
      startButton.disabled = true;
      pauseButton.disabled = true;
      resetButton.disabled = false;
      break;
      
    case 'longBreak':
      startButton.querySelector('span:last-child').textContent = 'Start New';
      startButton.disabled = false;
      pauseButton.disabled = true;
      resetButton.disabled = false;
      break;
  }
}

/**
 * Update session state CSS classes
 */
function updateSessionStateClasses() {
  // Remove all session state classes
  document.body.classList.remove(
    'session-active',
    'session-paused',
    'session-short-break',
    'session-long-break',
    'session-idle'
  );
  
  // Add appropriate class based on current session state
  if (!currentSession) {
    document.body.classList.add('session-idle');
    return;
  }
  
  // Add the appropriate class for the current state
  document.body.classList.add(`session-${currentSession.state}`);
}

/**
 * Load and display statistics
 */
async function loadStatistics() {
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Get statistics from storage
    chrome.storage.sync.get('statistics', (data) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading statistics:', chrome.runtime.lastError);
        // Use placeholder values if statistics can't be loaded
        todayFocusElement.textContent = 'Today\'s Focus: 0h 0m';
        breaksTakenElement.textContent = 'Breaks Taken: 0 short, 0 long';
        return;
      }
      
      const statistics = data.statistics || { dailyFocus: {}, weeklyFocus: {} };
      const todayStats = statistics.dailyFocus[today] || {
        totalFocusTime: 0,
        shortBreaksTaken: 0,
        longBreaksTaken: 0,
        sessionsCompleted: 0
      };
      
      // Update UI with statistics
      todayFocusElement.textContent = `Today's Focus: ${formatDuration(todayStats.totalFocusTime)}`;
      breaksTakenElement.textContent = `Breaks Taken: ${todayStats.shortBreaksTaken} short, ${todayStats.longBreaksTaken} long`;
    });
  } catch (error) {
    console.error('Error loading statistics:', error);
    // Use placeholder values if statistics can't be loaded
    todayFocusElement.textContent = 'Today\'s Focus: 0h 0m';
    breaksTakenElement.textContent = 'Breaks Taken: 0 short, 0 long';
  }
}

/**
 * Handle messages from the background script
 * @param {Object} message - Message object
 */
function handleMessage(message) {
  if (message.type === 'sessionChanged') {
    currentSession = message.session;
    updateUI();
  } else if (message.type === 'settingsChanged') {
    settings = message.settings;
    // Apply theme when settings change
    if (settings.theme === 'custom' && settings.customTheme) {
      applyTheme(settings.theme, settings.customTheme);
    } else {
      applyTheme(settings.theme);
    }
    updateUI();
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initPopup();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener(handleMessage);
