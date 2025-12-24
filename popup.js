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

/* ---------- POPUP DOM CONTENT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  detectPlatform(platform => {
    if (!platform) return;

    const xCard = document.getElementById("xCard");
    const liCard = document.getElementById("liCard");

    // Minimize inactive card
    if (platform === "x") liCard.classList.add("minimized");
    else if (platform === "linkedin") xCard.classList.add("minimized");

    // Toggle card on click
    xCard.addEventListener("click", () => xCard.classList.toggle("minimized"));
    liCard.addEventListener("click", () => liCard.classList.toggle("minimized"));

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
          document.getElementById("xGoal").innerText = xGoal;
          document.getElementById("liGoal").innerText = liGoal;
          document.getElementById("xRemaining").innerText = Math.max(xGoal - x, 0);
          document.getElementById("liRemaining").innerText = Math.max(liGoal - li, 0);
          document.getElementById("xGoalInput").value = xGoal;
          document.getElementById("liGoalInput").value = liGoal;
          document.getElementById("xTime").innerText = formatMs(res.xTimeToday || 0);
          document.getElementById("linkedinTime").innerText = formatMs(res.linkedinTimeToday || 0);
        }
      );
    }

    /* ---------- SAVE GOALS ---------- */
    document.getElementById("saveGoals").onclick = () => {
      const newXGoal = parseInt(document.getElementById("xGoalInput").value);
      const newLiGoal = parseInt(document.getElementById("liGoalInput").value);
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

    // START LIVE TIMER
    if (platform === "x") startLiveTimer("x", "xTime");
    else if (platform === "linkedin") startLiveTimer("linkedin", "linkedinTime");
  });
});
