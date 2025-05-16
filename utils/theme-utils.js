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
  
  let primaryColor, secondaryColor, successColor, successTextColor, dangerColor, dangerTextColor, warningColor;
  let primaryTextColor, secondaryTextColor, warningTextColor;

  // Base defaults
  primaryColor = '#4CAF50';    // Green (Material Design)
  secondaryColor = '#FFC107';  // Amber (Material Design)
  successColor = '#4CAF50';
  dangerColor = '#F44336';    // Red (Material Design)
  warningColor = '#FF9800';   // Orange (Material Design)
  
  // Calculate contrasting text colors for base defaults
  primaryTextColor = getContrastingTextColor(primaryColor);
  secondaryTextColor = getContrastingTextColor(secondaryColor);
  successTextColor = getContrastingTextColor(successColor);
  dangerTextColor = getContrastingTextColor(dangerColor);
  warningTextColor = getContrastingTextColor(warningColor);

  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    primaryColor = '#66BB6A';    // Light Green
    secondaryColor = '#FFD54F';  // Lighter Amber
    successColor = primaryColor; 
    dangerColor = '#E57373';     // Light Red
    warningColor = '#FFB74D';    // Lighter Orange

    primaryTextColor = getContrastingTextColor(primaryColor);
    secondaryTextColor = getContrastingTextColor(secondaryColor);
    successTextColor = getContrastingTextColor(successColor);
    dangerTextColor = getContrastingTextColor(dangerColor);
    warningTextColor = getContrastingTextColor(warningColor);

  } else if (theme === 'light') {
    document.body.classList.add('light-theme');
    primaryColor = '#1976D2';    // Blue (Material Design)
    secondaryColor = '#FFA000';  // Orange (Material Design)
    successColor = '#388E3C';    // Darker Green
    dangerColor = '#D32F2F';     // Darker Red
    warningColor = '#F57C00';    // Darker Orange

    primaryTextColor = getContrastingTextColor(primaryColor);
    secondaryTextColor = getContrastingTextColor(secondaryColor);
    successTextColor = getContrastingTextColor(successColor);
    dangerTextColor = getContrastingTextColor(dangerColor);
    warningTextColor = getContrastingTextColor(warningColor);

  } else if (theme === 'custom' && customColors) {
    document.body.classList.add('custom-theme');
    primaryColor = customColors.primaryColor;
    secondaryColor = customColors.secondaryColor;
    successColor = primaryColor; 
    dangerColor = isReddish(secondaryColor) ? secondaryColor : '#D32F2F';
    warningColor = secondaryColor; 

    primaryTextColor = getContrastingTextColor(primaryColor);
    secondaryTextColor = getContrastingTextColor(secondaryColor);
    successTextColor = getContrastingTextColor(successColor);
    dangerTextColor = getContrastingTextColor(dangerColor);
    warningTextColor = getContrastingTextColor(warningColor);

  } else { // Default theme
    document.body.classList.add('default-theme');
    primaryColor = '#00008B';    // Dark Blue
    secondaryColor = '#CDDC39';  // Lime
    successColor = primaryColor;
    dangerColor = '#C62828';     // A strong red suitable for default
    warningColor = secondaryColor;

    primaryTextColor = getContrastingTextColor(primaryColor);
    secondaryTextColor = getContrastingTextColor(secondaryColor);
    successTextColor = getContrastingTextColor(successColor);
    dangerTextColor = getContrastingTextColor(dangerColor);
    warningTextColor = getContrastingTextColor(warningColor);
  }

  // Apply all theme colors as CSS variables
  document.documentElement.style.setProperty('--primary-color', primaryColor);
  document.documentElement.style.setProperty('--secondary-color', secondaryColor);
  document.documentElement.style.setProperty('--success-color', successColor);
  document.documentElement.style.setProperty('--danger-color', dangerColor);
  document.documentElement.style.setProperty('--warning-color', warningColor);

  document.documentElement.style.setProperty('--primary-text-color', primaryTextColor);
  document.documentElement.style.setProperty('--secondary-text-color', secondaryTextColor);
  document.documentElement.style.setProperty('--success-text-color', successTextColor);
  document.documentElement.style.setProperty('--danger-text-color', dangerTextColor);
  document.documentElement.style.setProperty('--warning-text-color', warningTextColor);
}

// Helper function to determine contrasting text color
function getContrastingTextColor(hexColor) {
  if (!hexColor || hexColor.startsWith('var(')) return 'var(--text-color)'; // Fallback if color is a variable or undefined
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return 'var(--text-color)'; // Invalid hex
  
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Helper function to check if a color is reddish (simplified)
function isReddish(hexColor) {
  if (!hexColor || hexColor.startsWith('var(')) return false;
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return false;

  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  // Crude check: high red, low green/blue
  return r > 150 && g < 100 && b < 100;
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
