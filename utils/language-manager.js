/**
 * language-manager.js
 * 
 * A module to handle internationalization with manual locale switching
 */

const languageManager = (() => {
  let currentLocale = 'en'; // Default locale
  let messages = {};
  let isInitialized = false;
  
  /**
   * Load messages for a specific locale
   * @param {string} locale - The locale code to load
   * @returns {Promise<boolean>} - Whether loading was successful
   */
  async function loadMessages(locale) {
    console.log(`[LangManager] loadMessages attempting to load: ${locale}`);
    try {
      // Get the URL for the messages file
      const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
      console.log(`[LangManager] Attempting to fetch messages from URL: ${url}`);
      
      const response = await fetch(url);
      console.log(`[LangManager] fetch response for ${locale}: status ${response.status}, ok: ${response.ok}`);
      if (!response.ok) {
        console.error(`[LangManager] Failed to fetch messages for locale: ${locale}, status: ${response.status}`);
        if (locale !== 'en') {
          console.log(`[LangManager] Fallback: attempting to load 'en' due to fetch failure for ${locale}`);
          return loadMessages('en');
        }
        return false;
      }
      
      const data = await response.json();
      console.log(`[LangManager] Successfully loaded messages for locale: ${locale}. Keys: ${Object.keys(data).length}`);
      
      // Debug: Log a sample of keys loaded
      const sampleKeys = Object.keys(data).slice(0, 5);
      console.log(`[LangManager] Sample keys loaded:`, sampleKeys);
      
      messages = data;
      currentLocale = locale;
      isInitialized = true;
      return true;
    } catch (error) {
      console.error(`[LangManager] Error loading messages for locale ${locale}:`, error);
      if (locale !== 'en') {
        console.log(`[LangManager] Fallback: attempting to load 'en' due to exception for ${locale}`);
        return loadMessages('en');
      }
      return false;
    }
  }
  
  // Hardcoded fallbacks for problematic keys in case loading fails
  const fallbacks = {
    'popupBreakTimeDefaultStatus': '--',
    'popupStartButtonText': 'Start',
    'popupTodayFocusLabel': 'Today\'s Focus:',
    'popupBreaksTakenLabel': 'Breaks Taken:',
    'popupBreaksTakenShortUnit': 'short',
    'popupBreaksTakenLongUnit': 'long',
    'extensionName': 'Random Beep',
    'popupResumeButtonText': 'Resume',
    'popupStartNewButtonText': 'Start New',
    'popupPauseButtonText': 'Pause',
    'popupResetButtonText': 'Reset'
  };
  
  /**
   * Get a translated message
   * @param {string} key - The message key
   * @param {Array|string} substitutions - Message substitutions
   * @returns {string} The translated message
   */
  function getMessage(key, substitutions) {
    console.log(`[LangManager] getMessage called for key: "${key}", locale: "${currentLocale}", substitutions:`, substitutions);
    
    // Check if we have the key in our manually loaded messages
    if (messages && messages[key] && messages[key].message) {
      let message = messages[key].message;
      const placeholderDetails = messages[key].placeholders;
      
      // Handle substitutions if provided
      if (substitutions && placeholderDetails) {
        const subsArray = Array.isArray(substitutions) ? substitutions : [substitutions];
        
        // Process each placeholder definition
        for (const name in placeholderDetails) {
          if (Object.prototype.hasOwnProperty.call(placeholderDetails, name)) {
            const placeholderDefinition = placeholderDetails[name];
            const contentValue = placeholderDefinition.content; // This is typically "$1", "$2", etc.
            
            // Match the placeholder index
            const match = contentValue.match(/^\$(\d+)$/);
            if (match && match[1]) {
              const subIndex = parseInt(match[1], 10) - 1;
              if (subIndex >= 0 && subIndex < subsArray.length) {
                const valueToSubstitute = subsArray[subIndex];
                // Replace all instances of the placeholder in the message
                const nameInMessageRegex = new RegExp("\\$" + name + "\\$", "g");
                message = message.replace(nameInMessageRegex, valueToSubstitute);
              }
            }
          }
        }
      }
      
      return message;
    }
    
    // Fall back to Chrome's built-in i18n API if available
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        const nativeMessage = chrome.i18n.getMessage(key, Array.isArray(substitutions) ? substitutions : [substitutions]);
        if (nativeMessage) {
          console.log(`[LangManager] Using Chrome's i18n API for key "${key}": "${nativeMessage}"`);
          return nativeMessage;
        }
      }
    } catch (error) {
      console.error(`[LangManager] Error using Chrome's i18n API:`, error);
    }
    
    // Use hardcoded fallbacks if available
    if (fallbacks[key]) {
      console.log(`[LangManager] Using hardcoded fallback for key "${key}": "${fallbacks[key]}"`);
      return fallbacks[key];
    }
    
    // Last resort: Generate readable text from the key name
    const fallbackText = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    console.log(`[LangManager] Using generated fallback for key "${key}": "${fallbackText}"`);
    return fallbackText;
  }
  
  // Initialize with English by default
  loadMessages('en').catch(err => {
    console.error('[LangManager] Failed to initialize with English:', err);
  });
  
  return {
    setLocale: async (locale) => {
      console.log(`[LangManager] setLocale called with: ${locale}. Current: ${currentLocale}`);
      if (!locale) return true; // No-op if no locale provided
      
      if (locale !== currentLocale) {
        console.log(`[LangManager] Changing locale from ${currentLocale} to ${locale}`);
        return await loadMessages(locale);
      }
      
      // If we already have the requested locale loaded, just return true
      if (isInitialized && Object.keys(messages).length > 0) {
        console.log(`[LangManager] Locale ${locale} already loaded. No action needed.`);
        return true;
      }
      
      // Otherwise load it
      return await loadMessages(locale);
    },
    get: getMessage,
    getCurrentLocale: () => currentLocale,
    isInitialized: () => isInitialized
  };
})();

export { languageManager };