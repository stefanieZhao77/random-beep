/**
 * notification.js
 * 
 * This module handles browser notifications:
 * - Creating and showing notifications
 * - Playing notification sounds via offscreen document
 * - Handling notification clicks
 */

import { loadSettings } from '../storage/settings.js';

// Constants for offscreen document
const OFFSCREEN_PATH = 'offscreen.html';
const OFFSCREEN_REASON = 'AUDIO_PLAYBACK';

/**
 * Notification types enum
 */
const NotificationType = {
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
  SESSION_COMPLETE: 'sessionComplete'
};

/**
 * Available sound files in the extension
 */
const AVAILABLE_SOUNDS = [
  "mixkit-bell-notification-933.wav",
  "mixkit-clear-announce-tones-2861.wav",
  "mixkit-confirmation-tone-2867.wav",
  "mixkit-correct-answer-reward-952.wav",
  "mixkit-correct-answer-tone-2870.wav",
  "mixkit-doorbell-tone-2864.wav",
  "mixkit-guitar-notification-alert-2320.wav",
  "mixkit-happy-bells-notification-937.wav",
  "mixkit-long-pop-2358.wav",
  "mixkit-magic-marimba-2820.wav",
  "mixkit-message-pop-alert-2354.mp3",
  "mixkit-positive-notification-951.wav",
  "mixkit-sci-fi-click-900.wav",
  "mixkit-sci-fi-confirmation-914.wav",
  "mixkit-software-interface-back-2575.wav",
  "mixkit-software-interface-start-2574.wav",
  "mixkit-tile-game-reveal-960.wav"
];

/**
 * Check if the specified sound file is available
 * @param {string} filename - Sound file name
 * @returns {string} Valid sound file name or default
 */
function validateSoundFile(filename) {
  // If no filename provided, return default
  if (!filename) {
    return "mixkit-message-pop-alert-2354.mp3";
  }
  
  // If the file exists in our list, use it
  if (AVAILABLE_SOUNDS.includes(filename)) {
    return filename;
  }
  
  // Try to find a similar sound based on name
  const baseName = filename.replace(/\.[^/.]+$/, ""); // Remove extension
  for (const sound of AVAILABLE_SOUNDS) {
    if (sound.includes(baseName)) {
      console.log(`Found similar sound file: ${sound} for requested: ${filename}`);
      return sound;
    }
  }
  
  // Fallback to default
  console.warn(`Sound file "${filename}" not found, using default`);
  return "mixkit-message-pop-alert-2354.mp3";
}

/**
 * Check if there's an existing offscreen document
 * @returns {Promise<boolean>} True if an offscreen document exists
 */
async function hasOffscreenDocument() {
  // First check if offscreen API is available
  if (!chrome.offscreen) {
    return false;
  }
  
  // Use getContexts in MV3 to check for existing offscreen documents
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    return contexts.some(context => context.documentUrl?.endsWith(OFFSCREEN_PATH));
  } catch (error) {
    console.error('Error checking for offscreen document:', error);
    return false;
  }
}

/**
 * Create the offscreen document for sound playback
 * @returns {Promise<boolean>} True if created or already exists
 */
async function createOffscreenDocument() {
  // First check if the offscreen API is available
  if (!chrome.offscreen) {
    console.warn('Offscreen API not available');
    return false;
  }
  
  // Check if we already have an offscreen document
  if (await hasOffscreenDocument()) {
    console.log('Offscreen document already exists');
    return true;
  }
  
  // Create the offscreen document
  try {
    console.log('Creating offscreen document for audio playback');
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: [OFFSCREEN_REASON],
      justification: 'Play notification sounds'
    });
    console.log('Successfully created offscreen document');
    return true;
  } catch (error) {
    console.error('Failed to create offscreen document:', error);
    return false;
  }
}

/**
 * Create and show a notification
 * @param {string} type - Notification type
 * @param {Object} options - Additional notification options
 * @returns {Promise} Promise that resolves when notification is shown
 */
async function showNotification(type, options = {}) {
  const settings = await loadSettings();
  
  // Define notification content based on type
  let title, message, iconUrl;
  
  switch (type) {
    case NotificationType.SHORT_BREAK:
      title = 'Time for a Short Break!';
      message = `Take a ${settings.shortBreakDuration} second break to rest your eyes and mind.`;
      iconUrl = '../icons/128.png';
      break;
    case NotificationType.LONG_BREAK:
      title = 'Time for a Long Break!';
      message = `Take a ${settings.longBreakDuration} minute break to recharge.`;
      iconUrl = '../icons/128.png';
      break;
    case NotificationType.SESSION_COMPLETE:
      title = 'Focus Session Complete';
      message = 'Great job! You\'ve completed your focus session.';
      iconUrl = '../icons/128.png';
      break;
    default:
      title = 'Random Beep';
      message = 'Notification from Random Beep';
      iconUrl = '../icons/128.png';
  }
  
  // Override defaults with provided options
  title = options.title || title;
  message = options.message || message;
  iconUrl = options.iconUrl || iconUrl;
  
  // Create notification and play sound in parallel
  const notificationPromise = new Promise((resolve) => {
    chrome.notifications.create({
      type: 'basic',
      title,
      message,
      iconUrl,
      requireInteraction: type === NotificationType.LONG_BREAK,
      silent: true // We handle sounds separately for better control
    }, (notificationId) => {
      resolve(notificationId);
    });
  });
  
  // Play sound if enabled
  if (settings.notificationSound) {
    try {
      playNotificationSound(type, settings);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
  
  return notificationPromise;
}

/**
 * Play a notification sound using the offscreen document
 * @param {string} type - Notification type
 * @param {Object} settings - User settings
 */
async function playNotificationSound(type, settings) {
  // Determine which sound file to play
  let soundFile;
  switch (type) {
    case NotificationType.SHORT_BREAK:
      soundFile = settings.shortBreakSound || "mixkit-message-pop-alert-2354.mp3";
      break;
    case NotificationType.LONG_BREAK:
      soundFile = settings.longBreakSound || "mixkit-correct-answer-tone-2870.wav";
      break;
    default:
      soundFile = "mixkit-message-pop-alert-2354.mp3";
  }
  
  // Ensure the sound file is valid
  soundFile = validateSoundFile(soundFile);
  console.log(`Selected sound file for ${type}: ${soundFile}`);
  
  // Try playing with offscreen document first
  const hasOffscreen = await createOffscreenDocument();
  
  if (hasOffscreen) {
    try {
      // Send message to offscreen document to play sound
      console.log(`Sending play-sound message to offscreen document for: ${soundFile}`);
      const response = await chrome.runtime.sendMessage({
        action: 'play-sound',
        soundFile: soundFile
      });
      
      if (response && response.success) {
        console.log('Sound played successfully via offscreen document');
        return;
      } else {
        console.warn('Offscreen document failed to play sound:', response?.error);
      }
    } catch (error) {
      console.error('Error communicating with offscreen document:', error);
    }
  }
  
  // If offscreen approach failed, fallback to TTS if available
  try {
    if (chrome.tts) {
      console.log('Falling back to TTS for sound');
      chrome.tts.speak(`Alert: ${type}`, { rate: 1.0 });
    }
  } catch (error) {
    console.error('Error using TTS fallback:', error);
  }
  
  // Final fallback: create a notification with system sound
  console.log('Using system notification sound as final fallback');
  createSystemSoundNotification(type, settings);
}

/**
 * Create a notification that uses the system's notification sound
 * @param {string} type - Notification type
 * @param {Object} settings - Settings object
 */
function createSystemSoundNotification(type, settings) {
  let title, message;
  if (type === NotificationType.SHORT_BREAK) {
    title = 'Short Break Sound Alert';
    message = `Take a ${settings.shortBreakDuration} second break.`;
  } else if (type === NotificationType.LONG_BREAK) {
    title = 'Long Break Sound Alert';
    message = `Take a ${settings.longBreakDuration} minute break.`;
  } else {
    title = 'Sound Alert';
    message = 'Notification alert';
  }

  // Create notification with system sound
  chrome.notifications.create(`sound-notif-${Date.now()}`, {
    type: 'basic',
    title: title,
    message: message,
    iconUrl: '../icons/128.png',
    silent: false, // This will use the system sound
    priority: 2
  });
}

/**
 * Initialize notification click handler
 * @param {Function} callback - Function to call when notification is clicked
 */
function initNotificationClickHandler(callback) {
  chrome.notifications.onClicked.addListener((notificationId) => {
    // Close the notification
    chrome.notifications.clear(notificationId);
    
    // Call the provided callback with the notification ID
    if (typeof callback === 'function') {
      callback(notificationId);
    }
  });
}

/**
 * Close the offscreen document if it exists
 */
async function closeOffscreenDocument() {
  if (chrome.offscreen && await hasOffscreenDocument()) {
    try {
      await chrome.offscreen.closeDocument();
      console.log('Closed offscreen document');
    } catch (error) {
      console.error('Error closing offscreen document:', error);
    }
  }
}

// Export the module's public API
export {
  NotificationType,
  showNotification,
  initNotificationClickHandler,
  closeOffscreenDocument
};
