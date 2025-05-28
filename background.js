// Background service worker for healthy coding habits extension
let activeSession = null;
let lastActivity = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Healthy Coding Habits extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    totalTime: 0,
    sessionsToday: 0,
    streakDays: 0,
    lastActiveDate: new Date().toDateString(),
    settings: {
      reminderInterval: 25, // minutes
      enableNotifications: true,
      enableSounds: false
    }
  });
});

// Track tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  handleTabChange(tab);
});

// Track tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    handleTabChange(tab);
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus
    endSession();
  } else {
    // Window gained focus
    const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tabs[0]) {
      handleTabChange(tabs[0]);
    }
  }
});

function handleTabChange(tab) {
  if (isDeveloperSite(tab.url)) {
    startSession(tab);
  } else {
    endSession();
  }
}

function isDeveloperSite(url) {
  const devSites = [
    'github.com',
    'stackoverflow.com',
    'stackexchange.com',
    'codepen.io',
    'jsfiddle.net',
    'repl.it',
    'codesandbox.io',
    'gitlab.com',
    'bitbucket.org'
  ];
  
  return devSites.some(site => url && url.includes(site));
}

async function startSession(tab) {
  const now = Date.now();
  
  if (!activeSession) {
    activeSession = {
      startTime: now,
      site: extractSiteName(tab.url),
      tabId: tab.id
    };
    
    lastActivity = now;
    
    // Set up reminder alarm
    const settings = await getSettings();
    chrome.alarms.create('breakReminder', {
      delayInMinutes: settings.reminderInterval
    });
    
    console.log(`Started coding session on ${activeSession.site}`);
  }
  
  lastActivity = now;
}

function endSession() {
  if (activeSession) {
    const sessionDuration = Date.now() - activeSession.startTime;
    saveSessionData(sessionDuration, activeSession.site);
    
    activeSession = null;
    lastActivity = null;
    
    // Clear any pending alarms
    chrome.alarms.clear('breakReminder');
    
    console.log('Ended coding session');
  }
}

async function saveSessionData(duration, site) {
  const data = await chrome.storage.local.get(['totalTime', 'sessionsToday', 'lastActiveDate']);
  const today = new Date().toDateString();
  
  let sessionsToday = data.sessionsToday || 0;
  
  // Reset daily counter if it's a new day
  if (data.lastActiveDate !== today) {
    sessionsToday = 0;
  }
  
  chrome.storage.local.set({
    totalTime: (data.totalTime || 0) + duration,
    sessionsToday: sessionsToday + 1,
    lastActiveDate: today,
    lastSession: {
      duration: duration,
      site: site,
      timestamp: Date.now()
    }
  });
}

function extractSiteName(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

async function getSettings() {
  const data = await chrome.storage.local.get('settings');
  return data.settings || {
    reminderInterval: 25,
    enableNotifications: true,
    enableSounds: false
  };
}

// Handle break reminder alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'breakReminder' && activeSession) {
    const settings = await getSettings();
    
    if (settings.enableNotifications) {
      // Show break reminder notification
      chrome.notifications.create('breakReminder', {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Time for a Break! 🧘‍♀️',
        message: 'You\'ve been coding for 25 minutes. Take a moment to stretch, hydrate, and rest your eyes.',
        buttons: [
          { title: 'Take Break' },
          { title: 'Remind Later (5 min)' }
        ]
      });
    }
    
    // Send message to content script for in-page notification
    if (activeSession.tabId) {
      try {
        chrome.tabs.sendMessage(activeSession.tabId, {
          type: 'BREAK_REMINDER',
          duration: Date.now() - activeSession.startTime
        });
      } catch (error) {
        console.log('Could not send message to content script:', error);
      }
    }
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'breakReminder') {
    chrome.notifications.clear(notificationId);
    
    if (buttonIndex === 0) {
      // Take break - end session
      endSession();
    } else {
      // Remind later - set 5 minute alarm
      chrome.alarms.create('breakReminder', { delayInMinutes: 5 });
    }
  }
});

// Message handling from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SESSION_STATUS':
      sendResponse({
        active: !!activeSession,
        session: activeSession,
        lastActivity: lastActivity
      });
      break;
      
    case 'END_SESSION':
      endSession();
      sendResponse({ success: true });
      break;
      
    case 'ACTIVITY_DETECTED':
      if (activeSession) {
        lastActivity = Date.now();
      }
      break;
      
    case 'GET_STATS':
      getSessionStats().then(stats => sendResponse(stats));
      return true; // Will respond asynchronously
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

async function getSessionStats() {
  const data = await chrome.storage.local.get([
    'totalTime', 'sessionsToday', 'lastSession', 'streakDays'
  ]);
  
  return {
    totalTime: data.totalTime || 0,
    sessionsToday: data.sessionsToday || 0,
    streakDays: data.streakDays || 0,
    lastSession: data.lastSession,
    currentSession: activeSession ? {
      ...activeSession,
      currentDuration: Date.now() - activeSession.startTime
    } : null
  };
}