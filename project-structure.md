# Random Beep Extension - Project Structure

## Directory Structure

```
random-beep/
├── manifest.json           # Extension manifest file
├── icons/                  # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background/             # Background scripts
│   ├── background.js       # Main background script
│   ├── timer.js            # Timer logic module
│   ├── break-generator.js  # Break generation algorithm
│   └── notification.js     # Notification management
├── storage/                # Storage modules
│   ├── settings.js         # Settings storage and management
│   ├── session.js          # Session state storage
│   └── statistics.js       # Statistics tracking and storage
├── popup/                  # Popup UI
│   ├── popup.html          # Popup HTML
│   ├── popup.js            # Popup logic
│   └── popup.css           # Popup styles
├── options/                # Options page
│   ├── options.html        # Options page HTML
│   ├── options.js          # Options page logic
│   └── options.css         # Options page styles
├── statistics/             # Statistics page
│   ├── statistics.html     # Statistics page HTML
│   ├── statistics.js       # Statistics page logic
│   └── statistics.css      # Statistics page styles
├── utils/                  # Utility functions
│   ├── time-utils.js       # Time-related utilities
│   └── dom-utils.js        # DOM manipulation utilities
├── lib/                    # External libraries
│   └── chart.js            # Chart.js for statistics visualization
└── sounds/                 # Notification sounds
    ├── short-break.mp3     # Sound for short breaks
    └── long-break.mp3      # Sound for long breaks
```

## Module Dependencies

```
background.js
├── timer.js
├── break-generator.js
├── notification.js
├── storage/settings.js
├── storage/session.js
└── storage/statistics.js

popup.js
├── storage/settings.js
├── storage/session.js
└── storage/statistics.js

options.js
└── storage/settings.js

statistics.js
├── storage/statistics.js
└── lib/chart.js
```

## Communication Flow

1. **Background to Popup**:
   - Session state updates
   - Break notifications
   - Statistics updates

2. **Popup to Background**:
   - Start/pause/reset commands
   - Settings changes

3. **Options to Background**:
   - Settings updates

4. **Storage to All Components**:
   - Persistent data access

## Module Responsibilities

### Background Modules

- **background.js**: Main entry point, initializes components, handles messaging
- **timer.js**: Manages timing logic, session tracking
- **break-generator.js**: Implements random break algorithm
- **notification.js**: Handles browser notifications

### Storage Modules

- **settings.js**: Manages user preferences
- **session.js**: Tracks current session state
- **statistics.js**: Records and retrieves usage statistics

### UI Modules

- **popup.js**: Main user interface for controlling sessions
- **options.js**: Settings configuration interface
- **statistics.js**: Data visualization and reporting

### Utility Modules

- **time-utils.js**: Time formatting, calculations
- **dom-utils.js**: DOM manipulation helpers
