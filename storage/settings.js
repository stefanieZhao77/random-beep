/**
 * settings.js
 * 
 * This module handles all operations related to user settings:
 * - Loading default settings
 * - Saving user preferences
 * - Retrieving current settings
 * - Validating settings values
 */

/**
 * Default settings for the Random Beep extension
 * @returns {Object} Default settings object
 */
function getDefaultSettings() {
  return {
    shortPeriodDuration: 5,        // minutes
    shortBreakDuration: 10,        // seconds
    longPeriodDuration: 90,        // minutes
    longBreakDuration: 20,         // minutes
    notificationSound: true,
    shortBreakSound: "mixkit-message-pop-alert-2354.mp3",  // default sound for short breaks
    longBreakSound: "mixkit-correct-answer-tone-2870.wav", // default sound for long breaks
    autoStartNextSession: false,
    theme: "default",              // "default", "dark", "light", "custom"
    customTheme: {
      primaryColor: "#3F51B5",
      secondaryColor: "#FFC107"
    },
    language: 'en'
  };
}

/**
 * Save user settings to chrome.storage.sync
 * @param {Object} settings - Settings object to save
 * @returns {Promise} Promise that resolves when settings are saved
 */
function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    try {
      // Validate settings before saving
      const validatedSettings = validateSettings(settings);
      chrome.storage.sync.set({ settings: validatedSettings }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(validatedSettings);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Load user settings from chrome.storage.sync
 * @returns {Promise<Object>} Promise that resolves with the settings object
 */
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (data) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading settings:', chrome.runtime.lastError);
        resolve(getDefaultSettings());
      } else if (data.settings) {
        resolve(validateSettings(data.settings));
      } else {
        resolve(getDefaultSettings());
      }
    });
  });
}

/**
 * Validate settings to ensure all values are within acceptable ranges
 * @param {Object} settings - Settings object to validate
 * @returns {Object} Validated settings object
 */
function validateSettings(settings) {
  const defaults = getDefaultSettings();
  // Start with a copy of the defaults, then overlay the provided settings
  const validated = { ...defaults };

  // Only copy properties that exist in settings and pass validation
  if (settings) {
    // Validate numeric values
    validated.shortPeriodDuration = validateNumericSetting(
      settings.shortPeriodDuration,
      defaults.shortPeriodDuration,
      1, 60
    );
    validated.shortBreakDuration = validateNumericSetting(
      settings.shortBreakDuration,
      defaults.shortBreakDuration,
      5, 60
    );
    validated.longPeriodDuration = validateNumericSetting(
      settings.longPeriodDuration,
      defaults.longPeriodDuration,
      15, 240
    );
    validated.longBreakDuration = validateNumericSetting(
      settings.longBreakDuration,
      defaults.longBreakDuration,
      1, 60
    );

    // Validate theme
    validated.theme = ["default", "dark", "light", "custom"].includes(settings.theme)
      ? settings.theme
      : defaults.theme;

    // Validate boolean settings
    validated.notificationSound = typeof settings.notificationSound === 'boolean'
      ? settings.notificationSound
      : defaults.notificationSound;
      
    validated.autoStartNextSession = typeof settings.autoStartNextSession === 'boolean'
      ? settings.autoStartNextSession
      : defaults.autoStartNextSession;

    // Validate sound selections - ensure they are strings
    validated.shortBreakSound = typeof settings.shortBreakSound === 'string' && settings.shortBreakSound
      ? settings.shortBreakSound
      : defaults.shortBreakSound;
      
    validated.longBreakSound = typeof settings.longBreakSound === 'string' && settings.longBreakSound
      ? settings.longBreakSound
      : defaults.longBreakSound;

    // Validate custom theme
    if (validated.theme === 'custom') {
      if (typeof settings.customTheme === 'object' && 
          settings.customTheme !== null &&
          typeof settings.customTheme.primaryColor === 'string' &&
          typeof settings.customTheme.secondaryColor === 'string') {
        validated.customTheme = {
          primaryColor: settings.customTheme.primaryColor,
          secondaryColor: settings.customTheme.secondaryColor
        };
      }
    }

    // Validate language
    validated.language = ['en', 'zh'].includes(settings.language)
      ? settings.language
      : defaults.language;
  }

  return validated;
}

/**
 * Validate a numeric setting value
 * @param {number} value - Value to validate
 * @param {number} defaultValue - Default value to use if validation fails
 * @param {number} min - Minimum acceptable value
 * @param {number} max - Maximum acceptable value
 * @returns {number} Validated value
 */
function validateNumericSetting(value, defaultValue, min, max) {
  const numValue = Number(value);
  if (isNaN(numValue) || numValue < min || numValue > max) {
    return defaultValue;
  }
  return numValue;
}

/**
 * Listen for settings changes and notify interested components
 * @param {Function} callback - Function to call when settings change
 * @returns {Function} Function to remove the listener
 */
function onSettingsChanged(callback) {
  const listener = (changes, area) => {
    if (area === 'sync' && changes.settings) {
      callback(changes.settings.newValue);
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
  getDefaultSettings,
  saveSettings,
  loadSettings,
  validateSettings,
  onSettingsChanged
};
