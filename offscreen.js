// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Offscreen document received message:', message);
  
  if (message.action === 'play-sound') {
    const soundFile = message.soundFile;
    playSound(soundFile)
      .then(() => {
        // Send response that sound played successfully
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error playing sound:', error);
        sendResponse({ success: false, error: error.toString() });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

/**
 * Play a sound file using the Audio API
 * @param {string} soundFile - The filename of the sound to play
 * @returns {Promise} A promise that resolves when sound finishes playing
 */
function playSound(soundFile) {
  return new Promise((resolve, reject) => {
    try {
      const soundUrl = chrome.runtime.getURL(`sounds/${soundFile}`);
      console.log(`Playing sound from URL: ${soundUrl}`);
      
      const audio = new Audio(soundUrl);
      
      // Set up event listeners
      audio.onended = () => {
        console.log('Sound playback completed');
        resolve();
      };
      
      audio.onerror = (err) => {
        console.error('Audio playback error:', err);
        reject(new Error(`Failed to play ${soundFile}: ${err.message || 'Unknown error'}`));
      };
      
      // Start playback
      const playPromise = audio.play();
      
      // Modern browsers return a promise from play()
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Play promise rejected:', error);
          reject(error);
        });
      }
    } catch (err) {
      console.error('Exception during sound playback setup:', err);
      reject(err);
    }
  });
} 