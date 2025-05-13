/**
 * background.js
 * 
 * Main background script for the Random Beep extension.
 * This script initializes all components and handles messaging between them.
 */

import { loadSettings, saveSettings, getDefaultSettings, onSettingsChanged } from '../storage/settings.js';
import { loadSessionState, onSessionChanged } from '../storage/session.js';
import { initTimer, startSession, pauseSession, resumeSession, resetSession, handleAlarm } from './timer.js';
import { initNotificationClickHandler } from './notification.js';

// Register message listener at the top level to ensure service worker is always listening
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message);
  handleMessage(message, sender, sendResponse);
  return true; // Keep the message channel open for async responses
});


/**
 * Initialize the extension
 */
async function initializeExtension() {
  console.log('Random Beep: Initializing extension');
  
  // Initialize timer
  await initTimer();
  
  // Initialize notification click handler
  initNotificationClickHandler(handleNotificationClick);
  
  // Set up alarm listener with explicit binding to ensure it works with ES modules
  chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('🔔 Alarm triggered:', alarm.name, 'at', new Date().toLocaleTimeString());
    
    // Verify the alarm is valid
    if (!alarm || !alarm.name) {
      console.error('Invalid alarm received:', alarm);
      return;
    }
    
    // Process the alarm with detailed logging
    try {
      handleAlarm(alarm).then(() => {
        console.log(`✓ Alarm ${alarm.name} handled successfully`);
      }).catch(err => {
        console.error(`✗ Error handling alarm ${alarm.name}:`, err);
      });
    } catch (err) {
      console.error(`✗ Exception while handling alarm ${alarm.name}:`, err);
    }
    
    // List all remaining alarms for debugging
    chrome.alarms.getAll(alarms => {
      console.log(`Remaining alarms after handling ${alarm.name}:`, alarms.length, alarms);
    });
  });
  
  
  
  // Listen for settings changes
  onSettingsChanged(handleSettingsChanged);
  
  // Listen for session changes
  onSessionChanged(handleSessionChanged);
  
  console.log('Random Beep: Initialization complete');
}

/**
 * Handle extension installation or update
 * @param {Object} details - Installation details
 */
function handleInstalled(details) {
  console.log('Random Beep: Extension installed or updated', details);
  
  if (details.reason === 'install') {
    // First-time installation
    chrome.tabs.create({
      url: chrome.runtime.getURL('options/options.html')
    });
  }
}

/**
 * Handle messages from popup and options pages
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} True if response will be sent asynchronously
 */
function handleMessage(message, sender, sendResponse) {
  console.log('Random Beep: Received message', message);
  
  try {
    switch (message.action) {
      case 'getSettings':
        loadSettings().then(settings => {
          try { sendResponse(settings); } catch (e) { console.error(e); }
        }).catch(err => {
          console.error('Error loading settings:', err);
          try { sendResponse({error: 'Failed to load settings'}); } catch (e) {}
        });
        return true;
        
      case 'getSessionState':
        loadSessionState().then(session => {
          try { sendResponse(session); } catch (e) { console.error(e); }
        }).catch(err => {
          console.error('Error loading session state:', err);
          try { sendResponse({error: 'Failed to load session state'}); } catch (e) {}
        });
        return true;
        
      case 'startSession':
        startSession().then(session => {
          try { sendResponse(session); } catch (e) { console.error(e); }
        }).catch(err => {
          console.error('Error starting session:', err);
          try { sendResponse({error: 'Failed to start session'}); } catch (e) {}
        });
        return true;
        
      case 'pauseSession':
        pauseSession().then(session => {
          try { sendResponse(session); } catch (e) { console.error(e); }
        }).catch(err => {
          console.error('Error pausing session:', err);
          try { sendResponse({error: 'Failed to pause session'}); } catch (e) {}
        });
        return true;
        
      case 'resumeSession':
        resumeSession().then(session => {
          try { sendResponse(session); } catch (e) { console.error(e); }
        }).catch(err => {
          console.error('Error resuming session:', err);
          try { sendResponse({error: 'Failed to resume session'}); } catch (e) {}
        });
        return true;
        
      case 'resetSession':
        resetSession().then(session => {
          try { sendResponse(session); } catch (e) { console.error(e); }
        }).catch(err => {
          console.error('Error resetting session:', err);
          try { sendResponse({error: 'Failed to reset session'}); } catch (e) {}
        });
        return true;
        
      case 'saveSettings':
        if (message.settings) {
          saveSettings(message.settings).then(savedSettings => {
            // Don't use sendMessage for notification as it can cause the error
            // Instead, we'll rely on the onSettingsChanged listeners
            try { sendResponse({success: true, settings: savedSettings}); } catch (e) { console.error(e); }
          }).catch(err => {
            console.error('Error saving settings:', err);
            try { sendResponse({error: 'Failed to save settings'}); } catch (e) {}
          });
        } else {
          try { sendResponse({error: 'No settings provided'}); } catch (e) { console.error(e); }
        }
        return true;
        
      case 'resetSettings':
        const defaultSettings = getDefaultSettings();
        saveSettings(defaultSettings).then(() => {
          try { sendResponse(defaultSettings); } catch (e) { console.error(e); }
        }).catch(err => {
          console.error('Error resetting settings:', err);
          try { sendResponse({error: 'Failed to reset settings'}); } catch (e) {}
        });
        return true;
        
      default:
        try { sendResponse({error: 'Unknown action'}); } catch (e) { console.error(e); }
        return false;
    }
  } catch (err) {
    console.error('Error in message handler:', err);
    try { sendResponse({error: 'Internal error'}); } catch (e) {}
    return false;
  }
}

/**
 * Handle notification clicks
 * @param {string} notificationId - ID of the clicked notification
 */
function handleNotificationClick(notificationId) {
  console.log('Random Beep: Notification clicked', notificationId);
  
  // Open the popup when notification is clicked
  chrome.action.openPopup();
}

/**
 * Handle settings changes
 * @param {Object} newSettings - New settings object
 */
function handleSettingsChanged(newSettings) {
  console.log('Random Beep: Settings changed', newSettings);
  
  // Notify popup of settings change
  chrome.runtime.sendMessage({
    type: 'settingsChanged',
    settings: newSettings
  });
}

/**
 * Handle session state changes
 * @param {Object} newSession - New session state
 */
function handleSessionChanged(newSession) {
  console.log('Random Beep: Session state changed', newSession);
  
  try {
    // Notify all UI components about the session change
    chrome.runtime.sendMessage({
      type: 'sessionChanged',
      session: newSession
    }).catch(error => {
      // It's normal for this to fail if no popup is open to receive it
      if (!error.message.includes('Could not establish connection')) {
        console.error('Error sending session update:', error);
      }
    });
  } catch (error) {
    console.error('Error in handleSessionChanged:', error);
  }
}

// Initialize extension when loaded
initializeExtension();

// Listen for installation events
chrome.runtime.onInstalled.addListener(handleInstalled);

// Listen for startup events
chrome.runtime.onStartup.addListener(initializeExtension);
