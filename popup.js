// Popup dashboard script
document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  
  // Update stats every second
  setInterval(updateStats, 1000);
  
  // Button handlers
  document.getElementById('stretchBtn').addEventListener('click', () => {
    // Show stretch reminder notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Stretch Break Time! 🧘‍♂️',
      message: 'Take 2 minutes to stretch and breathe. Your body will thank you!'
    });
    window.close();
  });
  
  document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.storage.local.set({ totalTime: 0 });
    updateStats();
  });
});

function updateStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    if (response) {
      const { totalTime, currentSession } = response;
      
      // Update display
      document.getElementById('currentSession').textContent = formatTime(currentSession);
      document.getElementById('totalTime').textContent = formatTime(totalTime + currentSession);
      document.getElementById('status').textContent = currentSession > 0 ? 'Active' : 'Idle';
    }
  });
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}