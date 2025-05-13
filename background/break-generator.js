/**
 * break-generator.js
 * 
 * This module implements the random break algorithm:
 * - Generating random break times based on settings
 * - Ensuring proper spacing between breaks
 * - Scheduling breaks with the alarm API
 */

import { loadSettings } from '../storage/settings.js';

/**
 * Generate random break times for a given period
 * @param {number} periodMinutes - Period duration in minutes
 * @param {Date} sessionStartTime - The timestamp when the session started
 * @returns {Array<number>} Array of break times in milliseconds since epoch
 */
function generateRandomBreakTimes(periodMinutes, sessionStartTime) {
  console.log(`Generating breaks for ${periodMinutes} minute period`);
  
  // Convert period to seconds
  const periodSeconds = periodMinutes * 60;
  
  // Get the session start time in milliseconds
  const startTimeMs = sessionStartTime instanceof Date ? 
    sessionStartTime.getTime() : 
    (typeof sessionStartTime === 'number' ? sessionStartTime : Date.now());
  
  console.log(`Session start time: ${new Date(startTimeMs).toLocaleTimeString()}`);
  
  // Calculate end time
  const endTimeMs = startTimeMs + (periodSeconds * 1000);
  console.log(`Session end time: ${new Date(endTimeMs).toLocaleTimeString()}`);
  
  // For short periods (5 mins), we want 1 break
  // For medium periods (10-30 mins), we want approximately 1 break every 5 minutes
  // For longer periods, we scale appropriately
  
  // Determine number of breaks based on period length
  let numberOfBreaks = Math.max(1, Math.floor(periodMinutes / 5));
  
  console.log(`Planning to schedule ${numberOfBreaks} breaks for this session`);
  
  // Ensure we have a reasonable limit
  numberOfBreaks = Math.min(numberOfBreaks, 12); // Cap at 12 breaks max
  
  const breakTimes = [];
  const segmentDuration = periodSeconds / (numberOfBreaks + 1); // +1 to create segments between breaks
  
  // Create breaks with some randomness within each segment
  for (let i = 1; i <= numberOfBreaks; i++) {
    // Calculate segment boundaries
    const segmentStart = startTimeMs + ((i - 0.5) * segmentDuration * 1000);
    const segmentEnd = startTimeMs + (i * segmentDuration * 1000);
    
    // Add randomness within the segment (plus/minus 15% of segment duration)
    const randomOffset = (Math.random() - 0.5) * (0.3 * segmentDuration * 1000);
    
    // Calculate break time and ensure it's within the session
    let breakTime = segmentStart + randomOffset;
    
    // Ensure the break is at least 30 seconds after start and 30 seconds before end
    const minBreakTime = startTimeMs + 30000;
    const maxBreakTime = endTimeMs - 30000;
    
    breakTime = Math.max(minBreakTime, Math.min(maxBreakTime, breakTime));
    
    breakTimes.push(breakTime);
    console.log(`Break #${i}: ${new Date(breakTime).toLocaleTimeString()} (${Math.round((breakTime - startTimeMs) / 60000)} mins after start)`);
  }
  
  // Sort break times in chronological order
  breakTimes.sort((a, b) => a - b);
  return breakTimes;
}

/**
 * Schedule random breaks using the chrome.alarms API
 * @param {string} sessionId - Current session ID
 * @param {number} sessionStartTime - Session start time in milliseconds
 * @returns {Promise<Array<number>>} Promise that resolves with array of scheduled break times
 */
async function scheduleRandomBreaks(sessionId, sessionStartTime) {
  // Get settings
  const settings = await loadSettings();
  console.log('Loaded settings for break scheduling:', settings);
  
  // Clear any existing alarms for this session
  await clearSessionAlarms(sessionId);
  
  // Generate break times based on session start time
  const startTime = sessionStartTime || Date.now();
  const breakTimes = generateRandomBreakTimes(settings.shortPeriodDuration, startTime);
  
  // Debug: List all alarms after clearing
  chrome.alarms.getAll(alarms => {
    console.log('Current alarms after clearing:', alarms);
  });
  
  // Schedule each break as an alarm
  console.log(`Scheduling ${breakTimes.length} short breaks for session ${sessionId}`);
  
  for (let i = 0; i < breakTimes.length; i++) {
    const alarmName = `${sessionId}_short_break_${i}`;
    const scheduledTime = new Date(breakTimes[i]);
    
    console.log(`Short break #${i+1}: scheduling for ${scheduledTime.toLocaleTimeString()}`);
    
    try {
      // Create alarm with exact time
      chrome.alarms.create(alarmName, {
        when: breakTimes[i]
      });
      
      // Verify alarm was created
      chrome.alarms.get(alarmName, alarm => {
        if (alarm) {
          console.log(`✓ Alarm ${alarmName} successfully created, will fire at:`, 
                     new Date(alarm.scheduledTime).toLocaleTimeString());
        } else {
          console.error(`✗ Failed to create alarm ${alarmName}!`);
        }
      });
    } catch (err) {
      console.error(`Error creating alarm ${alarmName}:`, err);
    }
  }
  
  // Also schedule the long break
  const longBreakAlarmName = `${sessionId}_long_break`;
  const longBreakTimeMs = startTime + (settings.longPeriodDuration * 60 * 1000);
  
  console.log(`Scheduling long break at ${new Date(longBreakTimeMs).toLocaleTimeString()}`);
  
  try {
    chrome.alarms.create(longBreakAlarmName, {
      when: longBreakTimeMs
    });
    
    // Verify long break alarm was created
    chrome.alarms.get(longBreakAlarmName, alarm => {
      if (alarm) {
        console.log(`✓ Long break alarm successfully created, will fire at:`, 
                   new Date(alarm.scheduledTime).toLocaleTimeString());
      } else {
        console.error(`✗ Failed to create long break alarm!`);
      }
    });
  } catch (err) {
    console.error(`Error creating long break alarm:`, err);
  }
  
  // Final verification of all alarms
  setTimeout(() => {
    chrome.alarms.getAll(alarms => {
      console.log(`Final verification: ${alarms.length} alarms active:`);
      alarms.forEach(alarm => {
        console.log(`- Alarm '${alarm.name}' will fire at ${new Date(alarm.scheduledTime).toLocaleTimeString()}`);
      });
    });
  }, 1000);
  
  return breakTimes;
}

/**
 * Clear all alarms for a specific session
 * @param {string} sessionId - Session ID
 * @returns {Promise} Promise that resolves when alarms are cleared
 */
function clearSessionAlarms(sessionId) {
  return new Promise((resolve) => {
    chrome.alarms.getAll((alarms) => {
      const sessionAlarms = alarms.filter(alarm => alarm.name.startsWith(sessionId));
      
      const clearPromises = sessionAlarms.map(alarm => {
        return new Promise((resolveAlarm) => {
          chrome.alarms.clear(alarm.name, () => resolveAlarm());
        });
      });
      
      Promise.all(clearPromises).then(() => resolve());
    });
  });
}

/**
 * Check if an alarm is a short break alarm
 * @param {string} alarmName - Name of the alarm
 * @returns {boolean} True if alarm is a short break alarm
 */
function isShortBreakAlarm(alarmName) {
  return alarmName.includes('_short_break_');
}

/**
 * Check if an alarm is a long break alarm
 * @param {string} alarmName - Name of the alarm
 * @returns {boolean} True if alarm is a long break alarm
 */
function isLongBreakAlarm(alarmName) {
  return alarmName.includes('_long_break');
}

/**
 * Extract session ID from alarm name
 * @param {string} alarmName - Name of the alarm
 * @returns {string} Session ID
 */
function getSessionIdFromAlarm(alarmName) {
  return alarmName.split('_')[0];
}

// Export the module's public API
export {
  generateRandomBreakTimes,
  scheduleRandomBreaks,
  clearSessionAlarms,
  isShortBreakAlarm,
  isLongBreakAlarm,
  getSessionIdFromAlarm
};
