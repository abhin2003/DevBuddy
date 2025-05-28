// Background service worker
let sessionStart = null;
let totalTime = 0;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startSession') {
    sessionStart = Date.now();
    // Set alarm for 25 minutes
    chrome.alarms.create('wellnessReminder', { delayInMinutes: 25 });
  } else if (msg.action === 'endSession') {
    if (sessionStart) {
      totalTime += Date.now() - sessionStart;
      sessionStart = null;
      chrome.storage.local.set({ totalTime });
    }
  } else if (msg.action === 'getStats') {
    const currentSession = sessionStart ? Date.now() - sessionStart : 0;
    sendResponse({ totalTime, currentSession });
  }
});

// Handle wellness reminders
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'wellnessReminder') {
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'CodeWell Reminder',
      message: 'Time for a wellness break! Stretch, hydrate, and rest your eyes.'
    });
    
    // Reset alarm for next 25 minutes
    chrome.alarms.create('wellnessReminder', { delayInMinutes: 25 });
  }
});

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ totalTime: 0 });
});