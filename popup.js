/* ---------- DETECT PLATFORM ---------- */
function detectPlatform(cb) {
  if (typeof cb !== "function") cb = () => {};
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs || !tabs[0] || !tabs[0].url) return cb(null);

    const url = tabs[0].url;

    if (url.includes("twitter.com") || url.includes("x.com")) cb("x");
    else if (url.includes("linkedin.com")) cb("linkedin");
    else cb(null);
  });
}

/* ---------- FORMAT TIME ---------- */
function formatMs(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/* ---------- LIVE TIMER ---------- */
function startLiveTimer(platform, displayId) {
  chrome.storage.local.get([`${platform}TimeToday`], res => {
    let ms = res[`${platform}TimeToday`] || 0;
    const el = document.getElementById(displayId);

    const interval = setInterval(() => {
      ms += 1000;
      el.innerText = formatMs(ms);

      if (ms % 10000 === 0) {
        chrome.storage.local.set({ [`${platform}TimeToday`]: ms });
      }
    }, 1000);

    window.addEventListener("unload", () => {
      chrome.storage.local.set({ [`${platform}TimeToday`]: ms });
      clearInterval(interval);
    });
  });
}

/* ---------- UPDATE PROGRESS BAR ---------- */
function updateProgressBar(count, goal, fillId, textId) {
  if (!goal || goal <= 0) goal = 50; // Default goal if invalid
  const percentage = Math.min((count / goal) * 100, 100);
  const fillElement = document.getElementById(fillId);
  const textElement = document.getElementById(textId);
  
  if (fillElement) {
    fillElement.style.width = `${percentage}%`;
  }
  if (textElement) {
    textElement.innerText = `${count}/${goal}`;
  }
}

/* ---------- POPUP DOM CONTENT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const xCard = document.getElementById("xCard");
  const liCard = document.getElementById("liCard");
  const navX = document.getElementById("navX");
  const navLinkedIn = document.getElementById("navLinkedIn");
  const navSettings = document.getElementById("navSettings");
  const settingsPanel = document.getElementById("settingsPanel");

  let currentView = "x"; // Default view
  let settingsOpen = false;

  // Navbar switching
  navX.addEventListener("click", () => {
    currentView = "x";
    xCard.classList.remove("hidden");
    liCard.classList.add("hidden");
    navX.classList.add("active");
    navLinkedIn.classList.remove("active");
    if (settingsOpen) {
      settingsPanel.classList.remove("active");
      settingsOpen = false;
    }
  });

  navLinkedIn.addEventListener("click", () => {
    currentView = "linkedin";
    xCard.classList.add("hidden");
    liCard.classList.remove("hidden");
    navX.classList.remove("active");
    navLinkedIn.classList.add("active");
    if (settingsOpen) {
      settingsPanel.classList.remove("active");
      settingsOpen = false;
    }
  });

  // Settings toggle
  navSettings.addEventListener("click", () => {
    settingsOpen = !settingsOpen;
    if (settingsOpen) {
      settingsPanel.classList.add("active");
    } else {
      settingsPanel.classList.remove("active");
    }
  });

  // Detect platform and set initial view
  detectPlatform(platform => {
    if (platform === "linkedin") {
      currentView = "linkedin";
      xCard.classList.add("hidden");
      liCard.classList.remove("hidden");
      navX.classList.remove("active");
      navLinkedIn.classList.add("active");
    } else if (platform === "x") {
      currentView = "x";
      xCard.classList.remove("hidden");
      liCard.classList.add("hidden");
      navX.classList.add("active");
      navLinkedIn.classList.remove("active");
    }
  });

  /* ---------- LOAD COUNTS ---------- */
  function load() {
    chrome.storage.local.get(
      [
        "xRepliesToday",
        "linkedinRepliesToday",
        "xGoal",
        "linkedinGoal",
        "xTimeToday",
        "linkedinTimeToday"
      ],
      res => {
        const x = res.xRepliesToday || 0;
        const li = res.linkedinRepliesToday || 0;
        const xGoal = res.xGoal || 50;
        const liGoal = res.linkedinGoal || 50;

        document.getElementById("xCount").innerText = x;
        document.getElementById("liCount").innerText = li;
        document.getElementById("xRemaining").innerText = Math.max(xGoal - x, 0);
        document.getElementById("liRemaining").innerText = Math.max(liGoal - li, 0);
        document.getElementById("xGoalInput").value = xGoal;
        document.getElementById("liGoalInput").value = liGoal;
        document.getElementById("xTime").innerText = formatMs(res.xTimeToday || 0);
        document.getElementById("linkedinTime").innerText = formatMs(res.linkedinTimeToday || 0);

        // Update progress bars
        updateProgressBar(x, xGoal, "xProgressFill", "xProgressText");
        updateProgressBar(li, liGoal, "liProgressFill", "liProgressText");
      }
    );
  }

  /* ---------- SAVE GOALS ---------- */
  document.getElementById("saveGoals").onclick = () => {
    const newXGoal = parseInt(document.getElementById("xGoalInput").value) || 50;
    const newLiGoal = parseInt(document.getElementById("liGoalInput").value) || 50;
    chrome.storage.local.set({ xGoal: newXGoal, linkedinGoal: newLiGoal }, load);
  };

  /* ---------- RESET COUNTERS ---------- */
  document.getElementById("reset").onclick = () => {
    chrome.storage.local.set(
      { xRepliesToday: 0, linkedinRepliesToday: 0, xTimeToday: 0, linkedinTimeToday: 0 },
      load
    );
  };

  load();

  // Listen for storage changes to update progress bar in real-time
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.xRepliesToday || changes.linkedinRepliesToday || 
          changes.xGoal || changes.linkedinGoal) {
        load();
      }
    }
  });

  // START LIVE TIMER based on current view
  detectPlatform(platform => {
    if (platform === "x") startLiveTimer("x", "xTime");
    else if (platform === "linkedin") startLiveTimer("linkedin", "linkedinTime");
  });
});
