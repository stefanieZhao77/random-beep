# Random Beep: Browser Extension Documentation

## 1. Overview

Random Beep is a focus-enhancing browser extension that implements a unique timing methodology. Unlike traditional Pomodoro timers, Random Beep introduces random short breaks during short periods, followed by longer planned breaks after extended focus sessions, all with customizable timing parameters.

## 2. Technical Specifications

### 2.1 Extension Manifest

```json
{
  "manifest_version": 3,
  "name": "Random Beep",
  "version": "1.0.0",
  "description": "A focus methodology extension with random short breaks and scheduled long breaks",
  "permissions": [
    "alarms",
    "notifications",
    "storage"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2.2 Dependencies

- No external libraries required for core functionality
- Optional: Chart.js for statistics visualization

## 3. System Architecture

### 3.1 Component Diagram

```
┌─────────────────────────────────┐     ┌─────────────────────────┐
│           Background            │     │          Popup          │
│                                 │     │                         │
│  ┌─────────────┐ ┌───────────┐ │     │  ┌─────────────────┐    │
│  │ Timer Logic │ │ Break     │ │     │  │ Status Display  │    │
│  └─────────────┘ │ Generator │ │     │  └─────────────────┘    │
│         │        └───────────┘ │     │           │             │
│         │              │       │     │           │             │
│         └──────────────┘       │     │  ┌─────────────────┐    │
│                │               │◄────┼──│ Control Panel   │    │
│                │               │     │  └─────────────────┘    │
│  ┌─────────────────────────┐   │     │                         │
│  │    Notification Mgr     │   │     │  ┌─────────────────┐    │
│  └─────────────────────────┘   │     │  │ Quick Stats     │    │
│                                 │     │  └─────────────────┘    │
└─────────────────────────────────┘     └─────────────────────────┘
              │                                     │
              │                                     │
              │         ┌───────────────┐          │
              └────────►│  Storage API  │◄─────────┘
                        └───────────────┘
                               │
                               ▼
                        ┌───────────────┐
                        │  Options Page │
                        └───────────────┘
```

### 3.2 Data Flow

1. User starts a session from popup
2. Background service handles timer logic
3. Random algorithm schedules short breaks
4. Notification system alerts user of breaks
5. Storage maintains session state and settings
6. Statistics are updated with each completed session

## 4. Data Model

### 4.1 Settings

```javascript
{
  settings: {
    shortPeriodDuration: 5,       // minutes
    shortBreakDuration: 10,       // seconds
    longPeriodDuration: 90,       // minutes
    longBreakDuration: 20,        // minutes
    shortBreakFrequency: "medium", // "low", "medium", "high"
    notificationSound: true,
    autoStartNextSession: false,
    theme: "default"              // "default", "dark", "light", "custom"
  }
}
```

### 4.2 Session Data

```javascript
{
  currentSession: {
    id: "uuid",
    startTime: timestamp,
    shortBreaksTaken: [timestamp1, timestamp2, ...],
    shortBreakCount: 3,
    state: "active", // "active", "shortBreak", "longBreak", "paused", "idle"
    elapsedTime: 1200 // seconds
  }
}
```

### 4.3 Statistics Data

```javascript
{
  statistics: {
    dailyFocus: {
      "2025-05-12": {
        totalFocusTime: 14400,     // seconds
        shortBreaksTaken: 12,
        longBreaksTaken: 2,
        sessionsCompleted: 2
      }
    },
    weeklyFocus: {
      "2025-W19": {
        totalFocusTime: 86400,     // seconds
        shortBreaksTaken: 85,
        longBreaksTaken: 14,
        sessionsCompleted: 14
      }
    }
  }
}
```

## 5. Front-End Design

### 5.1 Popup UI Layout

```
┌─────────────────────────────────────────┐
│          Random Beep                 ⚙️  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │          01:23:45               │    │
│  │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░          │    │
│  │                                 │    │
│  │  Short break: ~2 min (random)  │    │
│  │  Long break: 27 min remaining  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │   [▶️ Start]   [⏸️ Pause]  [⏹️ Reset] │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Today's Focus: 2h 45m          │    │
│  │  Breaks Taken: 7 short, 1 long  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [📊 View Full Statistics]    │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 5.2 Options Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│                     Random Beep Settings                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Timer Settings                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Short Period Duration:  [  5  ] minutes            │    │
│  │  Short Break Duration:   [ 10  ] seconds            │    │
│  │  Long Period Duration:   [ 90  ] minutes            │    │
│  │  Long Break Duration:    [ 20  ] minutes            │    │
│  │                                                     │    │
│  │  Short Break Frequency:  ○ Low  ● Medium  ○ High    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Notification Settings                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ☑ Enable notification sounds                       │    │
│  │  ☑ Auto-start next session after long break         │    │
│  │                                                     │    │
│  │  Sound: [  Default Break Sound   ▼ ]                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Theme Settings                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ○ Light  ○ Dark  ● Default  ○ Custom               │    │
│  │                                                     │    │
│  │  Primary Color:   [#3F51B5] [□□□□□□]                │    │
│  │  Secondary Color: [#FFC107] [□□□□□□]                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [  Save Settings  ]   [  Reset to Default  ]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Statistics Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│                     Focus Statistics                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Daily Overview                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  [Chart: Daily focus time over past 7 days]         │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Focus Metrics                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Today:                                             │    │
│  │  - Total Focus Time: 2h 45m                         │    │
│  │  - Short Breaks: 7                                  │    │
│  │  - Long Breaks: 1                                   │    │
│  │  - Sessions Completed: 1                            │    │
│  │                                                     │    │
│  │  This Week:                                         │    │
│  │  - Total Focus Time: 18h 12m                        │    │
│  │  - Short Breaks: 54                                 │    │
│  │  - Long Breaks: 9                                   │    │
│  │  - Sessions Completed: 9                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [Chart: Break distribution]                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [  Export Data  ]   [  Clear History  ]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 6. Back-End Design

### 6.1 Background Script Structure

```javascript
// Initialization
chrome.runtime.onInstalled.addListener(initializeExtension);
chrome.runtime.onStartup.addListener(restoreSessionState);

// Message Handlers
chrome.runtime.onMessage.addListener(handleMessage);

// Core Timer Functions
function startSession() { /* ... */ }
function pauseSession() { /* ... */ }
function resumeSession() { /* ... */ }
function resetSession() { /* ... */ }
function endSession() { /* ... */ }

// Break Logic
function scheduleRandomBreaks() { /* ... */ }
function scheduleLongBreak() { /* ... */ }
function triggerShortBreak() { /* ... */ }
function triggerLongBreak() { /* ... */ }
function endBreak() { /* ... */ }

// Random Algorithm
function generateRandomBreakTimes(period, frequency) { /* ... */ }

// Notification Management
function showNotification(type, message) { /* ... */ }

// Storage Operations
function saveSessionState() { /* ... */ }
function loadSessionState() { /* ... */ }
function updateStatistics() { /* ... */ }

// Alarm Handlers
chrome.alarms.onAlarm.addListener(handleAlarm);
```

### 6.2 Random Break Algorithm

```javascript
function generateRandomBreakTimes(periodMinutes, frequency) {
  const periodSeconds = periodMinutes * 60;
  const startTime = Date.now();
  const endTime = startTime + (periodSeconds * 1000);
  
  // Number of breaks based on frequency
  let numberOfBreaks;
  switch(frequency) {
    case "low":
      numberOfBreaks = Math.max(1, Math.floor(periodMinutes / 5));
      break;
    case "medium":
      numberOfBreaks = Math.max(2, Math.floor(periodMinutes / 3));
      break;
    case "high":
      numberOfBreaks = Math.max(3, Math.floor(periodMinutes / 2));
      break;
    default:
      numberOfBreaks = Math.max(2, Math.floor(periodMinutes / 3));
  }
  
  // Generate random times, ensuring minimum spacing between breaks
  const minSpacingSeconds = 60; // At least 1 minute between breaks
  const breakTimes = [];
  const possibleTimeRange = periodSeconds - (minSpacingSeconds * (numberOfBreaks - 1));
  
  if (possibleTimeRange <= 0) {
    // Period too short for requested breaks, reduce number
    numberOfBreaks = Math.max(1, Math.floor((periodSeconds / minSpacingSeconds) - 1));
  }
  
  // Generate random offsets
  const offsets = [];
  for (let i = 0; i < numberOfBreaks; i++) {
    offsets.push(Math.random());
  }
  
  // Normalize offsets to sum to 1
  const offsetSum = offsets.reduce((sum, offset) => sum + offset, 0);
  const normalizedOffsets = offsets.map(offset => offset / offsetSum);
  
  // Convert normalized offsets to actual times
  let currentTime = startTime;
  for (let i = 0; i < numberOfBreaks; i++) {
    const segmentDuration = normalizedOffsets[i] * (possibleTimeRange - (minSpacingSeconds * numberOfBreaks));
    currentTime += (segmentDuration + minSpacingSeconds) * 1000;
    breakTimes.push(currentTime);
  }
  
  return breakTimes;
}
```

### 6.3 Storage Management

```javascript
// Save settings
function saveSettings(settings) {
  return chrome.storage.sync.set({ settings });
}

// Load settings
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (data) => {
      if (data.settings) {
        resolve(data.settings);
      } else {
        resolve(getDefaultSettings());
      }
    });
  });
}

// Save session state
function saveSessionState(session) {
  return chrome.storage.local.set({ currentSession: session });
}

// Save statistics
function saveStatistics(stats) {
  return chrome.storage.sync.set({ statistics: stats });
}

// Update daily statistics
async function updateDailyStatistics(focusTime, shortBreaks, longBreaks) {
  const today = new Date().toISOString().split('T')[0];
  const week = getWeekNumber(new Date());
  
  const stats = await loadStatistics();
  
  if (!stats.dailyFocus[today]) {
    stats.dailyFocus[today] = {
      totalFocusTime: 0,
      shortBreaksTaken: 0,
      longBreaksTaken: 0,
      sessionsCompleted: 0
    };
  }
  
  if (!stats.weeklyFocus[week]) {
    stats.weeklyFocus[week] = {
      totalFocusTime: 0,
      shortBreaksTaken: 0,
      longBreaksTaken: 0,
      sessionsCompleted: 0
    };
  }
  
  // Update daily stats
  stats.dailyFocus[today].totalFocusTime += focusTime;
  stats.dailyFocus[today].shortBreaksTaken += shortBreaks;
  stats.dailyFocus[today].longBreaksTaken += longBreaks;
  stats.dailyFocus[today].sessionsCompleted += longBreaks > 0 ? 1 : 0;
  
  // Update weekly stats
  stats.weeklyFocus[week].totalFocusTime += focusTime;
  stats.weeklyFocus[week].shortBreaksTaken += shortBreaks;
  stats.weeklyFocus[week].longBreaksTaken += longBreaks;
  stats.weeklyFocus[week].sessionsCompleted += longBreaks > 0 ? 1 : 0;
  
  return saveStatistics(stats);
}
```

## 7. Implementation Plan

### 7.1 Phase 1: Core Functionality

1. Set up project structure
2. Implement basic manifest
3. Create background script with timer logic
4. Develop random break algorithm
5. Build notification system
6. Create basic UI for popup
7. Implement storage mechanisms

### 7.2 Phase 2: Enhanced Features

1. Complete settings page
2. Implement theme support
3. Add statistics tracking
4. Develop statistics visualization
5. Create exportable session data

### 7.3 Phase 3: Polishing

1. Refine UI/UX
2. Add animations and transitions
3. Implement sound effects
4. Add keyboard shortcuts
5. Optimize performance

## 8. Testing Strategy

1. Unit tests for timer logic and random algorithm
2. Integration tests for storage and UI interaction
3. End-to-end testing of complete user flows
4. Browser compatibility testing (Chrome initially)

## 9. Potential Future Enhancements

1. Social sharing features
2. Cloud sync across browsers
3. Additional themes and customization
4. Productivity insights and recommendations
5. Extension to other browsers (Firefox, Edge, etc.)

## 10. Conclusion

This document outlines the complete design for the Random Beep browser extension, including front-end UI designs, back-end architecture, and implementation strategy. The extension provides a unique approach to focus methodology with random short breaks and scheduled long breaks, along with customization options and statistics tracking.
