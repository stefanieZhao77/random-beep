/**
 * notification.js
 * 
 * This module handles browser notifications:
 * - Creating and showing notifications
 * - Playing notification sounds via offscreen document
 * - Handling notification clicks
 */

import { loadSettings } from '../storage/settings.js';
import { languageManager } from '../utils/language-manager.js'; // Import languageManager

// Constants for offscreen document
const OFFSCREEN_PATH = 'offscreen.html';
const OFFSCREEN_REASON = 'AUDIO_PLAYBACK';

/**
 * Notification types enum
 */
const NotificationType = {
  SHORT_BREAK: 'shortBreak',
  SHORT_BREAK_END: 'shortBreakEnd',
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

// Store notification click handler
let notificationClickCallback = null;

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
 * Initialize notification system
 */
async function initNotifications() {
  try {
    // Set up notification click listener
    if (chrome.notifications) {
      console.log('Chrome Notifications API available');
      
      // Set up click handler for notifications
      chrome.notifications.onClicked.addListener((notificationId) => {
        console.log('Notification clicked', notificationId);
        
        // Call the registered callback if available
        if (notificationClickCallback) {
          notificationClickCallback(notificationId);
        }
      });
      
      // Set up button click handler
      chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
        console.log('Notification button clicked', notificationId, buttonIndex);
        
        // Call the registered callback if available
        if (notificationClickCallback) {
          notificationClickCallback(notificationId, buttonIndex);
        }
      });
      
      return true;
    } else {
      console.error('Chrome Notifications API not available');
      return false;
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
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
  
  // Ensure language manager has the correct locale based on loaded settings
  await languageManager.setLocale(settings.language || 'en');

  // Define notification content based on type
  let titleKey, messageKey, messageSubstitutions = null;
  let iconUrl = 'icons/128.png'; // Default icon

  switch (type) {
    case NotificationType.SHORT_BREAK:
      titleKey = 'notificationShortBreakTitle';
      messageKey = 'notificationShortBreakMessage';
      messageSubstitutions = [String(settings.shortBreakDuration)];
      break;
    case NotificationType.SHORT_BREAK_END:
      titleKey = 'notificationShortBreakEndTitle';
      messageKey = 'notificationShortBreakEndMessage';
      break;
    case NotificationType.LONG_BREAK:
      titleKey = 'notificationLongBreakTitle';
      messageKey = 'notificationLongBreakMessage';
      messageSubstitutions = [String(settings.longBreakDuration)];
      break;
    case NotificationType.SESSION_COMPLETE:
      titleKey = 'notificationSessionCompleteTitle';
      messageKey = 'notificationSessionCompleteMessage';
      break;
    default:
      titleKey = 'extensionName'; // Use the general extension name as title
      messageKey = 'notificationDefaultMessage';
  }
  
  const title = languageManager.get(titleKey);
  const message = languageManager.get(messageKey, messageSubstitutions);
  
  const finalTitle = options.title || title;
  const finalMessage = options.message || message;
  iconUrl = options.iconUrl || iconUrl; // Icon can still be overridden by options
  
  console.log(`Showing notification: ${finalTitle} - ${finalMessage}`);
  
  // Create notification and play sound in parallel
  const notificationPromise = new Promise((resolve) => {
    try {
      // Check if Chrome Notifications API is available
      if (!chrome.notifications) {
        console.error('Chrome Notifications API not available');
        resolve(null);
        return;
      }
      
      // Create the notification
      const notificationId = type + '-' + Date.now();
      const endBreakButtonTitle = languageManager.get("notificationEndBreakButton");

      chrome.notifications.create(notificationId, {
        type: 'basic',
        title: finalTitle,
        message: finalMessage,
        iconUrl: chrome.runtime.getURL(iconUrl),
        priority: type === NotificationType.LONG_BREAK ? 2 : 0,
        requireInteraction: type === NotificationType.LONG_BREAK,
        buttons: type === NotificationType.LONG_BREAK ? [{ title: endBreakButtonTitle }] : []
      }, (createdId) => {
        if (chrome.runtime.lastError) {
          console.error('Error creating notification:', chrome.runtime.lastError);
          resolve(null);
        } else {
          console.log(`Notification created with ID: ${createdId}`);
          resolve(createdId);
        }
      });
    } catch (error) {
      console.error('Error in notificationPromise setup:', error);
      resolve(null);
    }
  });
  
  const soundPromise = playNotificationSound(type, settings);
  
  // Wait for both notification and sound to complete (or fail gracefully)
  try {
    const [notificationResult, soundResult] = await Promise.all([
      notificationPromise,
      soundPromise
    ]);
    return notificationResult; // Return the notification ID if successful
  } catch (error) {
    console.error('Error showing notification or playing sound:', error);
    return null;
  }
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
    case NotificationType.SHORT_BREAK_END:
      soundFile = settings.shortBreakSound || "mixkit-software-interface-back-2575.wav";
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
}

/**
 * Initialize notification click handler
 * @param {Function} callback - Function to call when notification is clicked
 */
function initNotificationClickHandler(callback) {
  notificationClickCallback = callback;
}

/**
 * Close the offscreen document
 * @returns {Promise<boolean>} True if document was closed successfully
 */
async function closeOffscreenDocument() {
  if (!chrome.offscreen) {
    return false;
  }
  
  try {
    if (await hasOffscreenDocument()) {
      await chrome.offscreen.closeDocument();
      console.log('Offscreen document closed');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error closing offscreen document:', error);
    return false;
  }
}

// Export the module's public API
export {
  NotificationType,
  initNotifications,
  showNotification,
  initNotificationClickHandler,
  closeOffscreenDocument
};
