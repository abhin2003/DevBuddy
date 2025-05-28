// Content script for healthy coding habits
let activityTimer = null;
let breakNotification = null;

// Track user activity
function trackActivity() {
  chrome.runtime.sendMessage({ type: 'ACTIVITY_DETECTED' });
  
  // Reset activity timer
  if (activityTimer) {
    clearTimeout(activityTimer);
  }
  
  // Set new timer - if no activity for 2 minutes, consider session paused
  activityTimer = setTimeout(() => {
    console.log('No activity detected - session may be paused');
  }, 2 * 60 * 1000);
}

// Add activity listeners
const activityEvents = ['click', 'keydown', 'scroll', 'mousemove'];
activityEvents.forEach(event => {
  document.addEventListener(event, trackActivity, { passive: true });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BREAK_REMINDER') {
    showBreakReminder(message.duration);
  }
});

function showBreakReminder(duration) {
  // Remove existing notification if any
  if (breakNotification) {
    breakNotification.remove();
  }
  
  // Create break reminder overlay
  breakNotification = document.createElement('div');
  breakNotification.className = 'healthy-coding-break-reminder';
  breakNotification.innerHTML = `
    <div class="break-reminder-content">
      <div class="break-icon">🧘‍♀️</div>
      <h3>Time for a Break!</h3>
      <p>You've been coding for ${Math.round(duration / (1000 * 60))} minutes</p>
      <div class="break-suggestions">
        <div class="suggestion">💧 Drink some water</div>
        <div class="suggestion">👀 Look away from screen</div>
        <div class="suggestion">🤸‍♂️ Do a quick stretch</div>
      </div>
      <div class="break-actions">
        <button class="break-btn primary" onclick="this.closest('.healthy-coding-break-reminder').classList.add('taking-break')">
          Take Break (2 min)
        </button>
        <button class="break-btn secondary" onclick="this.closest('.healthy-coding-break-reminder').remove()">
          Remind Later
        </button>
        <button class="break-btn dismiss" onclick="this.closest('.healthy-coding-break-reminder').remove()">
          ✕
        </button>
      </div>
    </div>
    
    <div class="break-timer-content">
      <div class="timer-circle">
        <div class="timer-text">
          <span class="timer-minutes">2</span>
          <span class="timer-seconds">00</span>
        </div>
      </div>
      <h3>Take a mindful break</h3>
      <div class="break-activities">
        <div class="activity active">
          <div class="activity-icon">💧</div>
          <div class="activity-text">Hydrate yourself</div>
        </div>
        <div class="activity">
          <div class="activity-icon">👀</div>
          <div class="activity-text">Rest your eyes</div>
        </div>
        <div class="activity">
          <div class="activity-icon">🤸‍♂️</div>
          <div class="activity-text">Stretch your body</div>
        </div>
      </div>
      <button class="break-btn secondary" onclick="finishBreak()">
        Finish Break
      </button>
    </div>
  `;
  
  document.body.appendChild(breakNotification);
  
  // Auto-remove after 10 seconds if user doesn't interact
  setTimeout(() => {
    if (breakNotification && !breakNotification.classList.contains('taking-break')) {
      breakNotification.remove();
    }
  }, 10000);
}

// Break timer functionality
window.finishBreak = function() {
  if (breakNotification) {
    breakNotification.remove();
    breakNotification = null;
  }
  
  // Send message to background to end session or reset timer
  chrome.runtime.sendMessage({ type: 'BREAK_TAKEN' });
};

// Start break timer when break is taken
function startBreakTimer() {
  let timeLeft = 120; // 2 minutes in seconds
  const timerElement = document.querySelector('.timer-minutes');
  const secondsElement = document.querySelector('.timer-seconds');
  const activities = document.querySelectorAll('.activity');
  
  const timer = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    timerElement.textContent = minutes;
    secondsElement.textContent = seconds.toString().padStart(2, '0');
    
    // Cycle through activities
    const currentActivity = Math.floor((120 - timeLeft) / 40);
    activities.forEach((activity, index) => {
      activity.classList.toggle('active', index === currentActivity);
    });
    
    timeLeft--;
    
    if (timeLeft < 0) {
      clearInterval(timer);
      finishBreak();
    }
  }, 1000);
}

// Initialize break timer when break is taken
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('primary') && 
      e.target.textContent.includes('Take Break')) {
    setTimeout(startBreakTimer, 100);
  }
});

// Initialize activity tracking
trackActivity();