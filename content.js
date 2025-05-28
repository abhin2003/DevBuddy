// Content script for tracking activity on dev sites
let isActive = false;
let inactivityTimer = null;

// Start session when page loads
chrome.runtime.sendMessage({ action: 'startSession' });
isActive = true;

// Track user activity
const resetInactivityTimer = () => {
  clearTimeout(inactivityTimer);
  
  if (!isActive) {
    chrome.runtime.sendMessage({ action: 'startSession' });
    isActive = true;
  }
  
  // End session after 5 minutes of inactivity
  inactivityTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ action: 'endSession' });
    isActive = false;
  }, 5 * 60 * 1000);
};

// Listen for user interactions
['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
  document.addEventListener(event, resetInactivityTimer, true);
});

// Initialize timer
resetInactivityTimer();

// End session when leaving page
window.addEventListener('beforeunload', () => {
  if (isActive) {
    chrome.runtime.sendMessage({ action: 'endSession' });
  }
});