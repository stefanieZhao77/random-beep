/**
 * timer.js
 * 
 * This module handles the core timer functionality:
 * - Starting and stopping sessions
 * - Managing session state
 * - Handling breaks
 */

import { loadSettings } from '../storage/settings.js';
import { 
  SessionState, 
  createNewSession, 
  saveSessionState, 
  loadSessionState,
  updateSessionState,
  recordShortBreak,
  updateElapsedTime
} from '../storage/session.js';
import { 
  scheduleRandomBreaks, 
  clearSessionAlarms 
} from './break-generator.js';
import { 
  NotificationType, 
  showNotification 
} from './notification.js';
import { updateStatistics } from '../storage/statistics.js';

// Timer update interval in milliseconds
const TIMER_UPDATE_INTERVAL = 1000;

// Timer state
let timerInterval = null;
let currentSession = null;

/**
 * Initialize the timer module
 * @returns {Promise} Promise that resolves when timer is initialized
 */
async function initTimer() {
  console.log('Initializing timer module...');
  try {
    currentSession = await loadSessionState();
    console.log('Loaded session state:', currentSession);
    
    // If session was active, resume timer updates
    if (currentSession && currentSession.state === SessionState.ACTIVE) {
      console.log('Resuming active session...');
      startTimerUpdates();
    }
    
    return currentSession;
  } catch (error) {
    console.error('Error initializing timer:', error);
    // Create a new session as fallback
    currentSession = createNewSession();
    return currentSession;
  }
}

/**
 * Start a new focus session
 * @returns {Promise<Object>} Promise that resolves with the new session
 */
async function startSession() {
  console.log('Starting new session...');
  
  try {
    // Clear any existing timer
    stopTimerUpdates();
    
    // Clear any previous alarms
    if (currentSession && currentSession.id) {
      await clearSessionAlarms(currentSession.id);
    }
    
    // Create a new session
    currentSession = createNewSession();
    
    // Set the session state to active
    currentSession = updateSessionState(currentSession, SessionState.ACTIVE);
    
    console.log('New session created:', currentSession);
    
    // Schedule random breaks - pass the session start time
    await scheduleRandomBreaks(currentSession.id, currentSession.startTime);
    
    // Start timer updates
    startTimerUpdates();
    
    // Save session state
    await saveSessionState(currentSession);
    
    return currentSession;
  } catch (error) {
    console.error('Error starting session:', error);
    return createNewSession(); // Return idle session as fallback
  }
}

/**
 * Pause the current session
 * @returns {Promise<Object>} Promise that resolves with the updated session
 */
async function pauseSession() {
  if (!currentSession || currentSession.state !== SessionState.ACTIVE) {
    return currentSession;
  }
  
  // Update session state
  currentSession = updateSessionState(currentSession, SessionState.PAUSED);
  
  // Stop timer updates
  stopTimerUpdates();
  
  // Save session state
  await saveSessionState(currentSession);
  
  return currentSession;
}

/**
 * Resume the current session
 * @returns {Promise<Object>} Promise that resolves with the updated session
 */
async function resumeSession() {
  if (!currentSession || currentSession.state !== SessionState.PAUSED) {
    return currentSession;
  }
  
  // Update session state
  currentSession = updateSessionState(currentSession, SessionState.ACTIVE);
  
  // Start timer updates
  startTimerUpdates();
  
  // Save session state
  await saveSessionState(currentSession);
  
  return currentSession;
}

/**
 * Reset the current session
 * @returns {Promise<Object>} Promise that resolves with the new session
 */
async function resetSession() {
  // Stop timer updates
  stopTimerUpdates();
  
  // Clear any scheduled alarms
  if (currentSession) {
    await clearSessionAlarms(currentSession.id);
  }
  
  // Create a new session
  currentSession = createNewSession();
  
  // Save session state
  await saveSessionState(currentSession);
  
  return currentSession;
}

/**
 * Start a short break
 * @returns {Promise<Object>} Promise that resolves with the updated session
 */
async function startShortBreak() {
  console.log('Starting short break...');
  
  if (!currentSession) {
    console.error('No active session found when trying to start short break');
    return null;
  }
  
  try {
    // Record short break
    currentSession = recordShortBreak(currentSession);
    console.log('Session state updated to short break:', currentSession);
    
    // Show notification
    await showNotification(NotificationType.SHORT_BREAK);
    console.log('Short break notification shown');
    
    // Update statistics for this short break
    await updateStatistics(0, 1, 0);
    console.log('Statistics updated for short break');
    
    // Save session state
    await saveSessionState(currentSession);
    
    // Schedule end of short break
    const settings = await loadSettings();
    console.log(`Short break will end in ${settings.shortBreakDuration} seconds`);
    
    setTimeout(() => {
      console.log('Short break ended, returning to active state');
      endShortBreak();
    }, settings.shortBreakDuration * 1000);
    
    return currentSession;
  } catch (error) {
    console.error('Error starting short break:', error);
    return currentSession;
  }
}

/**
 * End a short break
 * @returns {Promise<Object>} Promise that resolves with the updated session
 */
async function endShortBreak() {
  if (!currentSession || currentSession.state !== SessionState.SHORT_BREAK) {
    return currentSession;
  }
  
  // Update session state
  currentSession = updateSessionState(currentSession, SessionState.ACTIVE);
  
  // Save session state
  await saveSessionState(currentSession);
  
  return currentSession;
}

/**
 * Start a long break
 * @returns {Promise<Object>} Promise that resolves with the updated session
 */
async function startLongBreak() {
  if (!currentSession) {
    return null;
  }
  
  // Stop timer updates
  stopTimerUpdates();
  
  // Update statistics before ending session
  await updateSessionStatistics();
  
  // Update session state
  currentSession = updateSessionState(currentSession, SessionState.LONG_BREAK);
  
  // Show notification
  await showNotification(NotificationType.LONG_BREAK);
  
  // Save session state
  await saveSessionState(currentSession);
  
  // Schedule end of long break
  const settings = await loadSettings();
  setTimeout(() => {
    endLongBreak();
  }, settings.longBreakDuration * 60 * 1000);
  
  return currentSession;
}

/**
 * End a long break
 * @returns {Promise<Object>} Promise that resolves with the updated session
 */
async function endLongBreak() {
  if (!currentSession || currentSession.state !== SessionState.LONG_BREAK) {
    return currentSession;
  }
  
  const settings = await loadSettings();
  
  // If auto-start next session is enabled, start a new session
  if (settings.autoStartNextSession) {
    return startSession();
  } else {
    // Otherwise, reset to idle state
    return resetSession();
  }
}

/**
 * Start timer update interval
 */
function startTimerUpdates() {
  // Clear any existing interval
  stopTimerUpdates();
  
  // Update elapsed time every second
  timerInterval = setInterval(async () => {
    if (currentSession && currentSession.state === SessionState.ACTIVE) {
      // Calculate elapsed time since last state start
      const now = Date.now();
      const elapsedSinceStateStart = (now - currentSession.stateStartTime) / 1000;
      
      // Update elapsed time in the session object
      if (elapsedSinceStateStart > 0) {
        currentSession.elapsedTime += 1; // Add one second
      }
      
      // Periodically save session state to storage for UI updates
      await saveSessionState(currentSession);
      
      // Update statistics every minute to ensure focus time is tracked
      if (currentSession.elapsedTime % 60 === 0) {
        console.log('Periodic statistics update - elapsed time:', currentSession.elapsedTime);
        await updateStatistics(60, 0, 0); // Add the last minute of focus time
      }
    }
  }, TIMER_UPDATE_INTERVAL);
  
  console.log('Timer updates started with interval', TIMER_UPDATE_INTERVAL, 'ms');
}

/**
 * Stop timer update interval
 */
function stopTimerUpdates() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * Update statistics with current session data
 * @returns {Promise} Promise that resolves when statistics are updated
 */
async function updateSessionStatistics() {
  if (!currentSession) {
    return;
  }
  
  console.log('Updating session statistics. Current elapsed time:', currentSession.elapsedTime);
  
  // elapsedTime is already in seconds, no need to divide by 1000
  const focusTimeSeconds = currentSession.elapsedTime;
  
  console.log(`Adding ${focusTimeSeconds} seconds to focus time statistics`);
  
  // Update statistics
  await updateStatistics(
    focusTimeSeconds,
    currentSession.shortBreakCount,
    1 // One long break per session
  );
}

/**
 * Handle an alarm event
 * @param {Object} alarm - Alarm object
 * @returns {Promise} Promise that resolves when alarm is handled
 */
async function handleAlarm(alarm) {
  console.log('Handling alarm:', alarm.name, 'at', new Date().toLocaleTimeString());
  
  try {
    if (!currentSession) {
      console.log('No current session, ignoring alarm');
      return;
    }
    
    // Get current session info
    console.log('Current session state:', currentSession.state, 'ID:', currentSession.id);
    
    // For active state, we handle breaks normally
    if (currentSession.state === SessionState.ACTIVE) {
      // Check if this alarm belongs to the current session
      if (!alarm.name.startsWith(currentSession.id)) {
        console.log('Ignoring alarm for different session');
        return;
      }
      
      // Handle short break alarm
      if (alarm.name.includes('_short_break_')) {
        console.log('Starting short break from alarm...');
        await startShortBreak();
      }
      
      // Handle long break alarm
      if (alarm.name.includes('_long_break')) {
        console.log('Starting long break from alarm...');
        await startLongBreak();
      }
    } 
    // For paused state, we log but don't take action
    else if (currentSession.state === SessionState.PAUSED) {
      console.log('Session is paused, noting but not processing alarm:', alarm.name);
    }
    // For other states, we just log the alarm
    else {
      console.log('Alarm received during', currentSession.state, 'state, not processing:', alarm.name);
    }
  } catch (error) {
    console.error('Error handling alarm:', error);
  }
}

// Export the module's public API
export {
  initTimer,
  startSession,
  pauseSession,
  resumeSession,
  resetSession,
  startShortBreak,
  endShortBreak,
  startLongBreak,
  endLongBreak,
  handleAlarm
};
