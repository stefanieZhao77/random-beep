/**
 * theme-utils.js
 * 
 * Utilities for handling themes across the extension
 */

/**
 * Apply theme to the current document
 * @param {string} theme - Theme name ('default', 'dark', 'light', or 'custom')
 * @param {Object} customColors - Custom theme colors (optional)
 */
export function applyTheme(theme, customColors = null) {
  document.body.classList.remove('dark-theme', 'light-theme', 'default-theme', 'custom-theme');
  
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else if (theme === 'custom') {
    document.body.classList.add('custom-theme');
    // Apply custom theme colors if provided
    if (customColors) {
      document.documentElement.style.setProperty('--primary-color', customColors.primaryColor);
      document.documentElement.style.setProperty('--secondary-color', customColors.secondaryColor);
    }
  } else {
    document.body.classList.add('default-theme');
  }
}

/**
 * Initialize theme from settings
 * Loads theme setting and applies it to the current page
 */
export async function initializeTheme() {
  try {
    // Try to get settings from storage
    const data = await new Promise((resolve) => {
      chrome.storage.sync.get('settings', (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading theme settings:', chrome.runtime.lastError);
          resolve({ settings: { theme: 'default' } });
        } else {
          resolve(result);
        }
      });
    });
    
    const theme = data.settings?.theme || 'default';
    const customTheme = data.settings?.customTheme || null;
    
    // Apply the theme with custom colors if available
    if (theme === 'custom' && customTheme) {
      applyTheme(theme, customTheme);
    } else {
      applyTheme(theme);
    }
    
    return theme;
  } catch (error) {
    console.error('Error initializing theme:', error);
    applyTheme('default');
    return 'default';
  }
}

/**
 * Listen for theme changes
 * @param {Function} callback - Function to call when theme changes
 * @returns {Function} Function to remove the listener
 */
export function onThemeChanged(callback) {
  const listener = (changes, area) => {
    if (area === 'sync' && changes.settings?.newValue?.theme) {
      callback(changes.settings.newValue.theme);
    }
  };
  
  chrome.storage.onChanged.addListener(listener);
  
  // Return function to remove listener
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
