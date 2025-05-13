/**
 * session.js
 * 
 * This module handles the current session state:
 * - Creating new sessions
 * - Saving session state
 * - Loading session state
 * - Tracking session progress
 */

/**
 * Session states enum
 */
const SessionState = {
  IDLE: 'idle',
  ACTIVE: 'active',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
  PAUSED: 'paused'
};

/**
 * Generate a unique ID for a session
 * @returns {string} Unique session ID
 */
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Create a new session object
 * @returns {Object} New session object
 */
function createNewSession() {
  const now = Date.now();
  return {
    id: generateSessionId(),
    startTime: now,
    stateStartTime: now,
    shortBreaksTaken: [],
    shortBreakCount: 0,
    state: SessionState.IDLE,
    elapsedTime: 0,
    pauseStartTime: null,
    totalPausedTime: 0
  };
}

/**
 * Save the current session state to chrome.storage.local
 * @param {Object} session - Session object to save
 * @returns {Promise} Promise that resolves when session is saved
 */
function saveSessionState(session) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ currentSession: session }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(session);
      }
    });
  });
}

/**
 * Load the current session state from chrome.storage.local
 * @returns {Promise<Object>} Promise that resolves with the session object
 */
function loadSessionState() {
  return new Promise((resolve) => {
    chrome.storage.local.get('currentSession', (data) => {
      if (chrome.runtime.lastError || !data.currentSession) {
        resolve(createNewSession());
      } else {
        resolve(data.currentSession);
      }
    });
  });
}

/**
 * Update the session state
 * @param {Object} session - Current session object
 * @param {string} newState - New session state
 * @returns {Object} Updated session object
 */
function updateSessionState(session, newState) {
  const updatedSession = { ...session };
  const now = Date.now();
  
  // Don't update if state hasn't changed
  if (newState === session.state) {
    return session;
  }
  
  // If was active and changing state, the background timer has kept elapsedTime current.
  // No need to add (now - session.stateStartTime) here.
  // The elapsedTime is the total accumulated focus time.

  // Handle state transitions
  if (newState === SessionState.PAUSED && session.state === SessionState.ACTIVE) {
    updatedSession.pauseStartTime = now;
  } else if (newState === SessionState.ACTIVE && session.state === SessionState.PAUSED) {
    if (session.pauseStartTime) {
      updatedSession.totalPausedTime += now - session.pauseStartTime;
      updatedSession.pauseStartTime = null;
    }
  }
  
  updatedSession.state = newState;
  updatedSession.stateStartTime = now; // Reset stateStartTime for the new state
  
  return updatedSession;
}

/**
 * Record a short break in the session
 * @param {Object} session - Current session object
 * @returns {Object} Updated session object
 */
function recordShortBreak(session) {
  const updatedSession = { ...session };
  updatedSession.shortBreaksTaken.push(Date.now());
  updatedSession.shortBreakCount += 1;
  return updateSessionState(updatedSession, SessionState.SHORT_BREAK);
}

/**
 * Calculate the effective elapsed time (excluding paused time)
 * @param {Object} session - Current session object
 * @returns {number} Elapsed time in milliseconds
 */
function calculateElapsedTime(session) {
  if (session.state === SessionState.IDLE) {
    return 0;
  }
  
  let elapsed = Date.now() - session.startTime - session.totalPausedTime;
  
  // If currently paused, also subtract the current pause duration
  if (session.state === SessionState.PAUSED && session.pauseStartTime) {
    elapsed -= (Date.now() - session.pauseStartTime);
  }
  
  return Math.max(0, elapsed);
}

/**
 * Update the elapsed time in the session
 * @param {Object} session - Current session object
 * @returns {Object} Updated session object
 */
function updateElapsedTime(session) {
  const updatedSession = { ...session };
  updatedSession.elapsedTime = calculateElapsedTime(session);
  return updatedSession;
}

/**
 * Listen for session state changes and notify interested components
 * @param {Function} callback - Function to call when session changes
 * @returns {Function} Function to remove the listener
 */
function onSessionChanged(callback) {
  const listener = (changes, area) => {
    if (area === 'local' && changes.currentSession) {
      callback(changes.currentSession.newValue);
    }
  };
  
  chrome.storage.onChanged.addListener(listener);
  
  // Return function to remove listener
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

// Export the module's public API
export {
  SessionState,
  createNewSession,
  saveSessionState,
  loadSessionState,
  updateSessionState,
  recordShortBreak,
  calculateElapsedTime,
  updateElapsedTime,
  onSessionChanged,
  generateSessionId
};
