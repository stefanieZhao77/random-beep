/**
 * options.js
 * 
 * Script for the Random Beep options page.
 * Handles loading, saving, and resetting user settings.
 */

import { applyTheme } from '../utils/theme-utils.js';

// DOM Elements
const shortPeriodDurationInput = document.getElementById('shortPeriodDuration');
const shortBreakDurationInput = document.getElementById('shortBreakDuration');
const longPeriodDurationInput = document.getElementById('longPeriodDuration');
const longBreakDurationInput = document.getElementById('longBreakDuration');
const notificationSoundCheckbox = document.getElementById('notificationSound');
const autoStartNextSessionCheckbox = document.getElementById('autoStartNextSession');
const shortBreakSoundSelect = document.getElementById('shortBreakSoundSelect');
const longBreakSoundSelect = document.getElementById('longBreakSoundSelect');
const themeRadios = document.getElementsByName('theme');
const primaryColorInput = document.getElementById('primaryColor');
const secondaryColorInput = document.getElementById('secondaryColor');
const primaryColorValue = primaryColorInput.nextElementSibling;
const secondaryColorValue = secondaryColorInput.nextElementSibling;
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');

// Current settings
let currentSettings = null;

/**
 * Initialize the options page
 */
async function initOptions() {
  // Populate sound selects with available sound files
  await populateSoundSelects();
  // Load current settings
  await loadSettings();
  // Set up event listeners
  setupEventListeners();
  // Apply theme to options page
  applyThemeWithPreview(currentSettings.theme);
}

/**
 * Populate the sound selects with available sound files in the sounds directory
 */
async function populateSoundSelects() {
  // List of sound files (update this if you add/remove files)
  const soundFiles = [
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
  [shortBreakSoundSelect, longBreakSoundSelect].forEach(select => {
    select.innerHTML = '';
    soundFiles.forEach(file => {
      const option = document.createElement('option');
      option.value = file;
      // Remove 'mixkit-' prefix, trailing dash-number, and file extension for display
      let label = file.replace(/^mixkit-/, '').replace(/-\d+/, '').replace(/\.[^.]+$/, '');
      option.textContent = label;
      select.appendChild(option);
    });
  });
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
      currentSettings = settings;
      populateFormWithSettings(settings);
      resolve(settings);
    });
  });
}

/**
 * Populate form fields with current settings
 * @param {Object} settings - Settings object
 */
function populateFormWithSettings(settings) {
  // Timer settings
  shortPeriodDurationInput.value = settings.shortPeriodDuration;
  shortBreakDurationInput.value = settings.shortBreakDuration;
  longPeriodDurationInput.value = settings.longPeriodDuration;
  longBreakDurationInput.value = settings.longBreakDuration;
  
  // Sound selections
  if (settings.shortBreakSound) {
    shortBreakSoundSelect.value = settings.shortBreakSound;
  }
  if (settings.longBreakSound) {
    longBreakSoundSelect.value = settings.longBreakSound;
  }

  // Notification settings
  notificationSoundCheckbox.checked = settings.notificationSound;
  autoStartNextSessionCheckbox.checked = settings.autoStartNextSession;
  
  // Theme settings
  setRadioValue(themeRadios, settings.theme);
  toggleCustomThemeSettings(settings.theme === 'custom');
  
  // Custom theme colors (if available in settings)
  if (settings.customTheme) {
    primaryColorInput.value = settings.customTheme.primaryColor || '#3F51B5';
    secondaryColorInput.value = settings.customTheme.secondaryColor || '#FFC107';
    primaryColorValue.textContent = primaryColorInput.value;
    secondaryColorValue.textContent = secondaryColorInput.value;
  }
}

/**
 * Set up event listeners for form elements
 */
function setupEventListeners() {
  // Sound preview buttons
  const previewShortBreakSoundBtn = document.getElementById('previewShortBreakSound');
  const previewLongBreakSoundBtn = document.getElementById('previewLongBreakSound');

  if (previewShortBreakSoundBtn && shortBreakSoundSelect) {
    previewShortBreakSoundBtn.addEventListener('click', () => {
      previewSound(shortBreakSoundSelect.value);
    });
  }
  if (previewLongBreakSoundBtn && longBreakSoundSelect) {
    previewLongBreakSoundBtn.addEventListener('click', () => {
      previewSound(longBreakSoundSelect.value);
    });
  }

  // Timer settings
  shortPeriodDurationInput.addEventListener('input', () => saveButton.disabled = false);
  shortBreakDurationInput.addEventListener('input', () => saveButton.disabled = false);
  longPeriodDurationInput.addEventListener('input', () => saveButton.disabled = false);
  longBreakDurationInput.addEventListener('input', () => saveButton.disabled = false);

  // Sound selection
  shortBreakSoundSelect.addEventListener('change', () => saveButton.disabled = false);
  longBreakSoundSelect.addEventListener('change', () => saveButton.disabled = false);

  // Notification settings
  notificationSoundCheckbox.addEventListener('change', () => saveButton.disabled = false);
  autoStartNextSessionCheckbox.addEventListener('change', () => saveButton.disabled = false);

  // Theme settings
  Array.from(themeRadios).forEach(radio => radio.addEventListener('change', (e) => {
    const theme = e.target.value;
    toggleCustomThemeSettings(theme === 'custom');
    applyThemeWithPreview(theme);
    saveButton.disabled = false;
  }));
  primaryColorInput.addEventListener('input', (e) => {
    primaryColorValue.textContent = e.target.value;
    updateCustomThemePreview();
    saveButton.disabled = false;
  });
  
  secondaryColorInput.addEventListener('input', (e) => {
    secondaryColorValue.textContent = e.target.value;
    updateCustomThemePreview();
    saveButton.disabled = false;
  });

  saveButton.addEventListener('click', saveSettings);
  resetButton.addEventListener('click', resetSettings);
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  // Gather values from form
  const newSettings = {
    shortPeriodDuration: parseInt(shortPeriodDurationInput.value, 10),
    shortBreakDuration: parseInt(shortBreakDurationInput.value, 10),
    longPeriodDuration: parseInt(longPeriodDurationInput.value, 10),
    longBreakDuration: parseInt(longBreakDurationInput.value, 10),
    shortBreakSound: shortBreakSoundSelect.value,
    longBreakSound: longBreakSoundSelect.value,
    notificationSound: notificationSoundCheckbox.checked,
    autoStartNextSession: autoStartNextSessionCheckbox.checked,
    theme: getRadioValue(themeRadios),
  };

  // Add custom theme colors if custom theme is selected
  if (newSettings.theme === 'custom') {
    newSettings.customTheme = {
      primaryColor: primaryColorInput.value,
      secondaryColor: secondaryColorInput.value
    };
  }

  // Save settings
  chrome.runtime.sendMessage({ action: 'saveSettings', settings: newSettings }, () => {
    saveButton.disabled = true;
    showSuccessMessage('Settings saved successfully!');
    
    // Notify background script of settings change
    chrome.runtime.sendMessage({ 
      action: 'settingsChanged', 
      settings: newSettings 
    });
  });
}

/**
 * Reset settings to default
 */
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    chrome.runtime.sendMessage({ action: 'resetSettings' }, (settings) => {
      currentSettings = settings;
      populateFormWithSettings(settings);
      applyThemeWithPreview(settings.theme);
      showSuccessMessage('Settings reset to default!');
    });
  }
}

/**
 * Set value of a radio button group
 * @param {NodeList} radios - Radio button elements
 * @param {string} value - Value to set
 */
function setRadioValue(radios, value) {
  for (const radio of radios) {
    radio.checked = radio.value === value;
  }
}

/**
 * Get value of a radio button group
 * @param {NodeList} radios - Radio button elements
 * @returns {string} Selected value
 */
function getRadioValue(radios) {
  for (const radio of radios) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return null;
}

/**
 * Toggle visibility of custom theme settings
 * @param {boolean} show - Whether to show custom theme settings
 */
function toggleCustomThemeSettings(show) {
  document.body.classList.toggle('show-custom-theme', show);
}

/**
 * Apply theme with custom preview handling
 * @param {string} theme - Theme name
 */
function applyThemeWithPreview(theme) {
  // Apply the theme using the shared utility
  applyTheme(theme, theme === 'custom' ? {
    primaryColor: primaryColorInput.value,
    secondaryColor: secondaryColorInput.value
  } : null);
  
  // Update the custom theme preview if needed
  if (theme === 'custom') {
    updateCustomThemePreview();
  }
}

/**
 * Update custom theme preview with selected colors
 */
function updateCustomThemePreview() {
  const primaryColor = primaryColorInput.value;
  const secondaryColor = secondaryColorInput.value;
  
  document.documentElement.style.setProperty('--primary-color', primaryColor);
  document.documentElement.style.setProperty('--secondary-color', secondaryColor);
}

/**
 * Show a success message
 * @param {string} message - Message to show
 */
function showSuccessMessage(message) {
  // Remove any existing message
  const existingMessage = document.querySelector('.success-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create new message
  const messageElement = document.createElement('div');
  messageElement.className = 'success-message';
  messageElement.textContent = message;
  document.body.appendChild(messageElement);
  
  // Show message
  setTimeout(() => {
    messageElement.classList.add('show');
  }, 10);
  
  // Hide and remove message after delay
  setTimeout(() => {
    messageElement.classList.remove('show');
    setTimeout(() => {
      messageElement.remove();
    }, 300);
  }, 3000);
}

/**
 * Preview a sound from the sounds directory
 * @param {string} soundFile - The filename of the sound to play
 */
function previewSound(soundFile) {
  if (!soundFile) {
    console.error('No sound file specified for preview');
    return;
  }
  
  console.log(`Previewing sound: ${soundFile}`);
  
  // Method 1: Using standard Audio API
  try {
    const soundUrl = chrome.runtime.getURL(`sounds/${soundFile}`);
    console.log(`Playing sound from URL: ${soundUrl}`);
    
    const audio = new Audio(soundUrl);
    audio.volume = 1.0;
    
    // Add feedback when playback starts
    audio.onplay = () => {
      console.log('Sound preview started');
      showSuccessMessage('Playing sound...');
    };
    
    // Add error handling
    audio.onerror = (err) => {
      console.error('Error playing sound:', err);
      showErrorMessage('Could not play sound. Check console for details.');
      
      // Try fallback method
      previewSoundWithWebAudio(soundFile);
    };
    
    // Play the sound
    audio.play().catch(error => {
      console.error('Error with audio playback:', error);
      // Try fallback method on error
      previewSoundWithWebAudio(soundFile);
    });
  } catch (error) {
    console.error('Error setting up audio playback:', error);
    previewSoundWithWebAudio(soundFile);
  }
}

/**
 * Preview a sound using Web Audio API (fallback method)
 * @param {string} soundFile - The filename of the sound to play
 */
function previewSoundWithWebAudio(soundFile) {
  try {
    const soundUrl = chrome.runtime.getURL(`sounds/${soundFile}`);
    console.log(`Trying Web Audio API for sound: ${soundUrl}`);
    
    fetch(soundUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch sound file: ${response.status} ${response.statusText}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Return a promise for the decoded data
        return audioContext.decodeAudioData(arrayBuffer);
      })
      .then(audioBuffer => {
        // Create and play source
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        
        console.log('Sound preview started with Web Audio API');
        showSuccessMessage('Playing sound...');
      })
      .catch(error => {
        console.error('Web Audio API playback failed:', error);
        showErrorMessage('Could not play sound with any method');
      });
  } catch (error) {
    console.error('Error with Web Audio API setup:', error);
    showErrorMessage('Could not play sound');
  }
}

/**
 * Show an error message
 * @param {string} message - Message to show
 */
function showErrorMessage(message) {
  // Remove any existing message
  const existingMessage = document.querySelector('.error-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create new message
  const messageElement = document.createElement('div');
  messageElement.className = 'error-message';
  messageElement.textContent = message;
  document.body.appendChild(messageElement);
  
  // Show message
  setTimeout(() => {
    messageElement.classList.add('show');
  }, 10);
  
  // Hide and remove message after delay
  setTimeout(() => {
    messageElement.classList.remove('show');
    setTimeout(() => {
      messageElement.remove();
    }, 300);
  }, 3000);
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', initOptions);
