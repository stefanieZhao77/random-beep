/**
 * notification.js
 * 
 * This module handles browser notifications:
 * - Creating and showing notifications
 * - Playing notification sounds
 * - Handling notification clicks
 */

import { loadSettings } from '../storage/settings.js';

/**
 * Notification types enum
 */
const NotificationType = {
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
  SESSION_COMPLETE: 'sessionComplete'
};

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
  
  // Create the notification
  return new Promise((resolve) => {
    chrome.notifications.create({
      type: 'basic',
      title,
      message,
      iconUrl,
      requireInteraction: type === NotificationType.LONG_BREAK, // Only long breaks require interaction
      silent: !settings.notificationSound
    }, (notificationId) => {
      // Play sound if enabled
      if (settings.notificationSound) {
        playNotificationSound(type);
      }
      
      resolve(notificationId);
    });
  });
}

/**
 * Play a notification sound
 * @param {string} type - Notification type
 */
async function playNotificationSound(type) {
  // Load user settings for sound selection
  let settings;
  try {
    settings = await loadSettings();
  } catch (err) {
    console.error('Failed to load settings for notification sound:', err);
    settings = {};
  }

  // Don't play sound if notifications are disabled
  if (settings.notificationSound === false) {
    console.log('Notification sounds are disabled in settings');
    return;
  }
  
  // Get the selected sound file for this notification type
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
  
  console.log(`Playing sound for ${type} notification: ${soundFile}`);
  
  // Try to play the selected sound
  try {
    // Create and play audio element - this works in Chrome extension service workers
    const audio = new Audio(`../sounds/${soundFile}`);
    
    // Play with proper error handling
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(error => {
        console.error(`Error playing sound ${soundFile}:`, error);
        // Fallback to notification with browser's default sound
        createBackupNotification(type, settings);
      });
    }
  } catch (error) {
    console.error('Error creating audio element:', error);
    // Fallback to notification with browser's default sound
    createBackupNotification(type, settings);
  }
}

/**
 * Create a backup notification with sound when audio playback fails
 * @param {string} type - Notification type
 * @param {Object} settings - Settings object
 */
function createBackupNotification(type, settings) {
  console.log('Using backup notification method for sound');
  
  // Use different titles based on notification type
  let title, message;
  if (type === NotificationType.SHORT_BREAK) {
    title = 'Time for a Short Break!';
    message = `Take a ${settings.shortBreakDuration} second break to rest your eyes and mind.`;
  } else if (type === NotificationType.LONG_BREAK) {
    title = 'Time for a Long Break!';
    message = `Take a ${settings.longBreakDuration} minute break to recharge.`;
  } else {
    title = 'Random Beep';
    message = 'Alert notification';
  }
  
  // Create a notification with sound enabled
  const soundNotificationId = 'sound-notification-' + Date.now();
  chrome.notifications.create(soundNotificationId, {
    type: 'basic',
    title: title,
    message: message,
    iconUrl: '../icons/128.png',
    silent: false // This will cause the browser to play the default notification sound
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

// Export the module's public API
export {
  NotificationType,
  showNotification,
  initNotificationClickHandler
};
