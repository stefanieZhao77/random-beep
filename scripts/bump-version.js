/**
 * Version bumping script for the Random Beep extension
 * 
 * Usage: node scripts/bump-version.js [major|minor|patch]
 * Example: node scripts/bump-version.js patch
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');

// Read the current manifest
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const currentVersion = manifest.version;
console.log(`Current version: ${currentVersion}`);

// Parse version components
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Determine which part to bump based on command line argument
const bumpType = process.argv[2] || 'patch';
let newVersion;

switch (bumpType.toLowerCase()) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update the manifest
manifest.version = newVersion;
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Version bumped from ${currentVersion} to ${newVersion}`);
console.log(`Manifest updated successfully.`); 