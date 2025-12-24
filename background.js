let currentPlatform = null;
let lastActiveTime = Date.now();

function trackTime() {
  const now = Date.now();
  const diff = now - lastActiveTime; // ms
  lastActiveTime = now;

  if (!currentPlatform) return;

  const key = currentPlatform + "TimeToday";

  chrome.storage.local.get([key], res => {
    chrome.storage.local.set({
      [key]: (res[key] || 0) + diff
    });
  });
}

// Runs every second
setInterval(trackTime, 1000);

// Detect active tab change
chrome.tabs.onActivated.addListener(active => {
  lastActiveTime = Date.now();

  chrome.tabs.get(active.tabId, tab => {
    if (!tab || !tab.url) return;

    if (tab.url.includes("x.com") || tab.url.includes("twitter.com")) {
      currentPlatform = "x";
    } else if (tab.url.includes("linkedin.com")) {
      currentPlatform = "linkedin";
    } else {
      currentPlatform = null;
    }
  });
});

// Detect URL updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;

  if (tab.url.includes("x.com") || tab.url.includes("twitter.com")) {
    currentPlatform = "x";
  } else if (tab.url.includes("linkedin.com")) {
    currentPlatform = "linkedin";
  } else {
    currentPlatform = null;
  }

  lastActiveTime = Date.now();
});
