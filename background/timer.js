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
  clearSessionAlarms,
  isShortBreakAlarm,
  isLongBreakAlarm
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
    const shortBreakDuration = settings.shortBreakDuration || 10; // Default to 10 seconds if not set
    console.log(`Short break will end in ${shortBreakDuration} seconds`);
    
    // Create a more reliable timeout with a reference we can check later
    const shortBreakEndTime = Date.now() + (shortBreakDuration * 1000);
    console.log(`Short break scheduled to end at: ${new Date(shortBreakEndTime).toLocaleTimeString()}`);
    
    const timeoutId = setTimeout(async () => {
      console.log('Short break timeout fired');
      try {
        if (currentSession && currentSession.state === SessionState.SHORT_BREAK) {
          console.log('Ending short break and returning to active state');
          await endShortBreak();
        } else {
          console.log(`Short break not ended - current state: ${currentSession ? currentSession.state : 'no session'}`);
        }
      } catch (error) {
        console.error('Error in short break timeout handler:', error);
        // Force state back to active as a failsafe
        if (currentSession) {
          currentSession = updateSessionState(currentSession, SessionState.ACTIVE);
          await saveSessionState(currentSession);
        }
      }
    }, shortBreakDuration * 1000);
    
    // Add a fallback timeout as an extra safety measure
    setTimeout(async () => {
      if (currentSession && currentSession.state === SessionState.SHORT_BREAK) {
        console.log('FAILSAFE: Short break did not end properly, forcing end');
        await endShortBreak();
      }
    }, (shortBreakDuration + 5) * 1000);
    
    return currentSession;
  } catch (error) {
    console.error('Error starting short break:', error);
    // If there was an error, make sure we don't get stuck in short break state
    if (currentSession && currentSession.state === SessionState.SHORT_BREAK) {
      currentSession = updateSessionState(currentSession, SessionState.ACTIVE);
      await saveSessionState(currentSession);
    }
    return currentSession;
  }
}

/**
 * End a short break
 * @returns {Promise<Object>} Promise that resolves with the updated session
 */
async function endShortBreak() {
  console.log('Attempting to end short break...');
  
  if (!currentSession) {
    console.warn('No current session when attempting to end short break');
    return null;
  }
  
  if (currentSession.state !== SessionState.SHORT_BREAK) {
    console.warn(`Cannot end short break: session is in ${currentSession.state} state, not SHORT_BREAK`);
    return currentSession;
  }
  
  try {
    console.log('Transitioning from short break to active state');
    
    // Update session state
    currentSession = updateSessionState(currentSession, SessionState.ACTIVE);
    
    // Save session state
    await saveSessionState(currentSession);
    
    console.log('Short break ended successfully, now in active state');
    
    return currentSession;
  } catch (error) {
    console.error('Error ending short break:', error);
    
    // Attempt recovery - force to active state
    try {
      currentSession = updateSessionState(currentSession, SessionState.ACTIVE);
      await saveSessionState(currentSession);
      console.log('Recovered from error and set session to active state');
    } catch (secondError) {
      console.error('Critical error: Could not recover from short break:', secondError);
    }
    
    return currentSession;
  }
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
    
    // Check if this alarm belongs to current session
    if (!alarm.name.startsWith(currentSession.id)) {
      console.log(`Alarm ${alarm.name} belongs to a different session, ignoring`);
      return;
    }
    
    // Get current session state
    const sessionState = currentSession.state;
    console.log(`Current session state when alarm triggered: ${sessionState}`);
    
    // Only handle alarms when session is active
    if (sessionState !== SessionState.ACTIVE) {
      console.log(`Session is not active (${sessionState}), ignoring alarm`);
      return;
    }
    
    // Handle short break alarm
    if (isShortBreakAlarm(alarm.name)) {
      console.log(`Starting random short break from alarm: ${alarm.name}`);
      await startShortBreak();
      return;
    }
    
    // Handle long break alarm
    if (isLongBreakAlarm(alarm.name)) {
      console.log(`Starting scheduled long break from alarm: ${alarm.name}`);
      await startLongBreak();
      return;
    }
    
    console.log(`Unknown alarm type: ${alarm.name}, ignoring`);
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
