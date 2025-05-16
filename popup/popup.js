/**
 * popup.js
 * 
 * Main script for the Random Beep popup interface.
 * Handles UI updates, user interactions, and communication with the background script.
 */

import { formatTime, formatDuration } from '../utils/time-utils.js';
import { initializeTheme, applyTheme } from '../utils/theme-utils.js';
import { languageManager } from '../utils/language-manager.js'; // Import languageManager

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
  console.log('[Popup] initPopup started');
  await Promise.all([
    loadSettings(),
    loadSessionState()
  ]);
  console.log('[Popup] Settings loaded:', settings);
  
  await initializeTheme(); // This uses settings.theme
  
  try {
    // Ensure language manager is properly initialized
    if (settings && settings.language) {
      console.log('[Popup] Attempting to set locale to:', settings.language);
      await languageManager.setLocale(settings.language);
      console.log('[Popup] languageManager current locale after setLocale:', languageManager.getCurrentLocale());
    } else {
      console.log('[Popup] No settings.language found or settings object missing, setting locale to en');
      await languageManager.setLocale('en');
      console.log('[Popup] languageManager current locale after setLocale (fallback):', languageManager.getCurrentLocale());
    }
    
    // Double check if any keys are loaded
    if (!languageManager.isInitialized || typeof languageManager.isInitialized === 'function' && !languageManager.isInitialized()) {
      console.warn('[Popup] Language manager not properly initialized. Forced loading of English locale');
      await languageManager.setLocale('en');
    }
    
    console.log('[Popup] Setting static i18n text');
    setStaticI18nText();
    console.log('[Popup] setStaticI18nText completed');
    
    // Update the UI after message loading
    updateUI();
    console.log('[Popup] updateUI completed');
  } catch (err) {
    console.error('[Popup] Error initializing language manager:', err);
  }

  // Set up event listeners
  setupEventListeners();
  
  // Start UI update interval
  startUpdateInterval();
  
  // Load statistics
  loadStatistics();
  console.log('[Popup] initPopup finished');
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
    if (confirm(languageManager.get("popupConfirmResetSession"))) {
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
  const defaultStatus = languageManager.get("popupBreakTimeDefaultStatus");
  if (!settings || !currentSession) {
    const calculatingText = languageManager.get("popupCalculatingStatus");
    shortBreakTimeElement.textContent = calculatingText;
    longBreakTimeElement.textContent = calculatingText;
    return;
  }

  // Short break info
  if (currentSession.state === SessionState.ACTIVE && currentSession.nextShortBreakTime) {
    const minutesUntilShortBreak = Math.max(0, Math.round((currentSession.nextShortBreakTime - Date.now()) / 60000));
    shortBreakTimeElement.textContent = minutesUntilShortBreak > 0 
                                      ? languageManager.get("popupBreakTimeInMinutes", String(minutesUntilShortBreak))
                                      : languageManager.get("popupBreakTimeSoon");
  } else if (currentSession.state === SessionState.SHORT_BREAK) {
    shortBreakTimeElement.textContent = languageManager.get("popupBreakTimeActiveShort"); 
  } else {
    shortBreakTimeElement.textContent = defaultStatus;
  }

  // Long break info
  if (currentSession.state === SessionState.ACTIVE && currentSession.nextLongBreakTime) {
    const minutesUntilLongBreak = Math.max(0, Math.round((currentSession.nextLongBreakTime - Date.now()) / 60000));
    longBreakTimeElement.textContent = languageManager.get("popupBreakTimeInMinutes", String(minutesUntilLongBreak));
  } else if (currentSession.state === SessionState.LONG_BREAK) {
    longBreakTimeElement.textContent = languageManager.get("popupBreakTimeActiveLong");
  } else {
    longBreakTimeElement.textContent = defaultStatus;
  }
}

/**
 * Update control buttons state
 */
function updateControlButtons() {
  const startButtonTextElement = startButton.querySelector('span:last-child');

  if (!currentSession) {
    if (startButtonTextElement) startButtonTextElement.textContent = languageManager.get("popupStartButtonText");
    startButton.disabled = false;
    pauseButton.disabled = true;
    resetButton.disabled = true;
    return;
  }
  
  switch (currentSession.state) {
    case 'idle':
      if (startButtonTextElement) startButtonTextElement.textContent = languageManager.get("popupStartButtonText");
      startButton.disabled = false;
      pauseButton.disabled = true;
      resetButton.disabled = true;
      break;
      
    case 'active':
      // Start button is disabled, text doesn't strictly matter but keep it consistent
      if (startButtonTextElement) startButtonTextElement.textContent = languageManager.get("popupStartButtonText"); 
      startButton.disabled = true;
      pauseButton.disabled = false;
      resetButton.disabled = false;
      break;
      
    case 'paused':
      if (startButtonTextElement) startButtonTextElement.textContent = languageManager.get("popupResumeButtonText"); // New key needed
      startButton.disabled = false;
      pauseButton.disabled = true;
      resetButton.disabled = false;
      break;
      
    case 'shortBreak':
      // Start button is disabled
      if (startButtonTextElement) startButtonTextElement.textContent = languageManager.get("popupStartButtonText");
      startButton.disabled = true;
      pauseButton.disabled = true;
      resetButton.disabled = false;
      break;
      
    case 'longBreak':
      if (startButtonTextElement) startButtonTextElement.textContent = languageManager.get("popupStartNewButtonText"); // New key needed
      startButton.disabled = false;
      pauseButton.disabled = true;
      resetButton.disabled = false;
      break;
    default:
      // Default to Start text if state is unknown
      if (startButtonTextElement) startButtonTextElement.textContent = languageManager.get("popupStartButtonText");
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
    const stats = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStatistics' }, resolve);
    });

    if (stats) {
      // Update Today's Focus time
      const focusLabel = languageManager.get("popupTodayFocusLabel");
      todayFocusElement.textContent = `${focusLabel} ${formatDuration(stats.totalFocusDurationToday || 0)}`;

      // Update Breaks Taken
      const breaksLabel = languageManager.get("popupBreaksTakenLabel");
      const shortUnit = languageManager.get("popupBreaksTakenShortUnit");
      const longUnit = languageManager.get("popupBreaksTakenLongUnit");
      breaksTakenElement.textContent = `${breaksLabel} ${stats.shortBreaksToday || 0} ${shortUnit}, ${stats.longBreaksToday || 0} ${longUnit}`;
    } else {
      // Handle case where stats might be null or undefined
      const focusLabel = languageManager.get("popupTodayFocusLabel");
      todayFocusElement.textContent = `${focusLabel} 0h 0m`;
      const breaksLabel = languageManager.get("popupBreaksTakenLabel");
      const shortUnit = languageManager.get("popupBreaksTakenShortUnit");
      const longUnit = languageManager.get("popupBreaksTakenLongUnit");
      breaksTakenElement.textContent = `${breaksLabel} 0 ${shortUnit}, 0 ${longUnit}`;
    }
  } catch (error) {
    console.error('Error loading statistics for popup:', error);
    // Fallback display on error
    const focusLabel = languageManager.get("popupTodayFocusLabel");
    todayFocusElement.textContent = `${focusLabel} N/A`;
    const breaksLabel = languageManager.get("popupBreaksTakenLabel");
    breaksTakenElement.textContent = `${breaksLabel} N/A`;
  }
}

/**
 * Handle messages from the background script
 * @param {Object} message - Message object
 */
async function handleMessage(message) {
  console.log('[Popup] handleMessage received:', message);
  if (message.type === 'sessionChanged') {
    currentSession = message.session;
    updateUI();
  } else if (message.type === 'settingsChanged') {
    settings = message.settings;
    console.log('[Popup] settingsChanged - new settings:', settings);
    if (settings.theme === 'custom' && settings.customTheme) {
      applyTheme(settings.theme, settings.customTheme);
    } else {
      applyTheme(settings.theme);
    }
    if (settings.language) {
      console.log('[Popup] settingsChanged - attempting to set locale to:', settings.language);
      await languageManager.setLocale(settings.language);
      console.log('[Popup] settingsChanged - languageManager current locale:', languageManager.getCurrentLocale());
    }
    setStaticI18nText();
    updateUI();
    console.log('[Popup] settingsChanged - UI updated after locale change');
  }
}

function setStaticI18nText() {
  // First check if messages are loaded
  if (!languageManager.getCurrentLocale() || languageManager.getCurrentLocale() === '') {
    console.log('[Popup] No locale set when trying to set static i18n text. Forcing reload of messages for locale:', settings?.language || 'en');
    languageManager.setLocale(settings?.language || 'en').then(() => {
      console.log('[Popup] Messages reloaded. Setting static i18n text again.');
      setStaticI18nText(); // Try again after loading
      return;
    }).catch(error => {
      console.error('[Popup] Error reloading messages:', error);
    });
    return;
  }
  
  console.log('[Popup] Setting static i18n text for locale:', languageManager.getCurrentLocale());
  
  document.querySelectorAll('[data-i18n-key]').forEach(element => {
    const key = element.getAttribute('data-i18n-key');
    const message = languageManager.get(key);
    if (message) {
      // If the element is a title or has a specific target for its text (like a span inside a button)
      // this simple textContent might need adjustment, but for most cases it's fine.
      element.textContent = message;
    }
  });

  // Handle title attributes specifically
  document.querySelectorAll('[data-i18n-title-key]').forEach(element => {
    const key = element.getAttribute('data-i18n-title-key');
    const message = languageManager.get(key);
    if (message) {
      element.title = message;
    }
  });

  // Specifically set the document title
  const pageTitleKey = document.titleElement && document.titleElement.getAttribute('data-i18n-key');
  if (pageTitleKey) {
    const titleMessage = languageManager.get(pageTitleKey);
    if (titleMessage) document.title = titleMessage;
  } else { // Fallback for older approach if needed, or if title is not tagged with data-i18n-key
    const defaultTitle = languageManager.get("extensionName");
    if (defaultTitle) document.title = defaultTitle;
  }

  // Set initial calculating status for break times using their specific calculating key
  const calculatingStatusKey = shortBreakTimeElement.getAttribute('data-i18n-key-calculating');
  if (calculatingStatusKey) {
      const calculatingMessage = languageManager.get(calculatingStatusKey);
      if (calculatingMessage) {
        if (shortBreakTimeElement) shortBreakTimeElement.textContent = calculatingMessage;
        if (longBreakTimeElement) longBreakTimeElement.textContent = calculatingMessage;
      }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initPopup();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener(handleMessage);

// Ensure SessionState enum/object is available or define it if not already from background script context
const SessionState = {
  IDLE: 'idle',
  ACTIVE: 'active',
  PAUSED: 'paused',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak'
};
