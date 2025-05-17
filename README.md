# Random Beep - Focus Timer Extension

![Version](https://img.shields.io/badge/version-1.0.0-blue)

Random Beep is a Chrome extension designed to help users maintain focus and eye health through a combination of focused work periods with randomized short breaks and scheduled long breaks.

<p align="center">
  <img src="docs/images/screenshot.png" width="400" alt="Random Beep Screenshot">
</p>

## Features

- ⏰ **Customizable Work Periods**: Set up your preferred work duration before long breaks
- 👀 **Randomized Short Breaks**: Prevent eye strain with spontaneous short breaks
- 🔔 **Notification System**: Beautiful notifications with sound alerts
- 📊 **Statistics Tracking**: Monitor your focus time and breaks taken
- 🎨 **Multiple Themes**: Choose between light, dark, and custom themes
- 🌍 **Multilingual Support**: Available in English and Chinese

## Installation

### From Chrome Web Store

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link coming soon)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)

1. Download the latest release (.zip or .crx file) from the [Releases page](https://github.com/stefanieZhao77/random-beep/releases)
2. For .zip file:
   - Extract the zip file to a folder
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extracted folder
3. For .crx file:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Drag and drop the .crx file onto the extensions page

## Usage

1. Click the Random Beep icon in your browser toolbar to open the popup
2. Use the controls to start, pause, or reset your focus session
3. Customize your experience through the settings page
4. View detailed statistics to track your productivity

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- Git

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/stefanieZhao77/random-beep.git
   cd random-beep
   ```

2. Make your changes to the codebase

### Building

#### Automatic Builds with GitHub Actions

This project uses GitHub Actions to automatically build and package the extension:

1. Push to the `main` branch or create a pull request to trigger the build workflow
2. Create a version tag to generate a release:
   ```bash
   git tag -a vX.X.X -m "Version X.X.X release"
   git push origin vX.X.X
   ```

#### Manual Building

To create a packaged extension file locally:

```bash
# Create a ZIP package
zip -r random-beep.zip background icons lib options popup sounds statistics storage utils _locales manifest.json offscreen.html offscreen.js
```

### GitHub Actions

This project uses GitHub Actions for automated workflows:

1. **Package Extension**: Automatically creates both .zip and .crx files when changes are pushed to main or a version tag is created
2. **Bump Version**: A manual workflow to increment the version number in `manifest.json`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/) for the comprehensive documentation
- Contributors and testers who helped improve this extension

---

Made with ❤️ by Wanqi Zhao