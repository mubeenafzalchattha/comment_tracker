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

/* ---------- UPDATE PROGRESS CIRCLE ---------- */
function updateProgressCircle(count, goal, circleId, numberId, goalId) {
  if (!goal || goal <= 0) goal = 50; // Default goal if invalid
  const percentage = Math.min((count / goal) * 100, 100);
  const circleElement = document.getElementById(circleId);
  const numberElement = document.getElementById(numberId);
  const goalElement = document.getElementById(goalId);
  
  if (circleElement) {
    const circumference = 2 * Math.PI * 45; // radius is 45
    // Ensure stroke-dasharray is set
    if (!circleElement.style.strokeDasharray) {
      circleElement.style.strokeDasharray = circumference;
    }
    const offset = circumference - (percentage / 100) * circumference;
    circleElement.style.strokeDashoffset = offset;
  }
  if (numberElement) {
    numberElement.textContent = count;
  }
  if (goalElement) {
    goalElement.textContent = `/ ${goal}`;
  }
}

/* ---------- POPUP DOM CONTENT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const xCard = document.getElementById("xCard");
  const liCard = document.getElementById("liCard");
  const settingsCard = document.getElementById("settingsCard");
  const progressChartCard = document.getElementById("progressChartCard");
  const navX = document.getElementById("navX");
  const navLinkedIn = document.getElementById("navLinkedIn");
  const navSettings = document.getElementById("navSettings");

  // Check if elements exist
  if (!xCard || !liCard || !settingsCard || !navX || !navLinkedIn || !navSettings) {
    console.error("Required DOM elements not found");
    return;
  }

  let currentView = "x"; // Default view

  // Navbar switching
  navX.addEventListener("click", () => {
    currentView = "x";
    xCard.classList.remove("hidden");
    liCard.classList.add("hidden");
    settingsCard.classList.add("hidden");
    if (progressChartCard) progressChartCard.classList.remove("hidden");
    navX.classList.add("active");
    navLinkedIn.classList.remove("active");
    navSettings.classList.remove("active");
  });

  navLinkedIn.addEventListener("click", () => {
    currentView = "linkedin";
    xCard.classList.add("hidden");
    liCard.classList.remove("hidden");
    settingsCard.classList.add("hidden");
    if (progressChartCard) progressChartCard.classList.remove("hidden");
    navX.classList.remove("active");
    navLinkedIn.classList.add("active");
    navSettings.classList.remove("active");
  });

  // Settings tab
  navSettings.addEventListener("click", () => {
    currentView = "settings";
    xCard.classList.add("hidden");
    liCard.classList.add("hidden");
    settingsCard.classList.remove("hidden");
    if (progressChartCard) progressChartCard.classList.add("hidden");
    navX.classList.remove("active");
    navLinkedIn.classList.remove("active");
    navSettings.classList.add("active");
  });

  // Detect platform and set initial view
  detectPlatform(platform => {
    if (platform === "linkedin") {
      currentView = "linkedin";
      xCard.classList.add("hidden");
      liCard.classList.remove("hidden");
      settingsCard.classList.add("hidden");
      if (progressChartCard) progressChartCard.classList.remove("hidden");
      navX.classList.remove("active");
      navLinkedIn.classList.add("active");
      navSettings.classList.remove("active");
    } else if (platform === "x") {
      currentView = "x";
      xCard.classList.remove("hidden");
      liCard.classList.add("hidden");
      settingsCard.classList.add("hidden");
      if (progressChartCard) progressChartCard.classList.remove("hidden");
      navX.classList.add("active");
      navLinkedIn.classList.remove("active");
      navSettings.classList.remove("active");
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

        const xCountEl = document.getElementById("xCount");
        const liCountEl = document.getElementById("liCount");
        const xRemainingEl = document.getElementById("xRemaining");
        const liRemainingEl = document.getElementById("liRemaining");
        const xGoalInputEl = document.getElementById("xGoalInput");
        const liGoalInputEl = document.getElementById("liGoalInput");
        const xTimeEl = document.getElementById("xTime");
        const liTimeEl = document.getElementById("linkedinTime");

        if (xCountEl) xCountEl.innerText = x;
        if (liCountEl) liCountEl.innerText = li;
        if (xRemainingEl) xRemainingEl.innerText = Math.max(xGoal - x, 0);
        if (liRemainingEl) liRemainingEl.innerText = Math.max(liGoal - li, 0);
        if (xGoalInputEl) xGoalInputEl.value = xGoal;
        if (liGoalInputEl) liGoalInputEl.value = liGoal;
        if (xTimeEl) xTimeEl.innerText = formatMs(res.xTimeToday || 0);
        if (liTimeEl) liTimeEl.innerText = formatMs(res.linkedinTimeToday || 0);

        // Update progress circles
        updateProgressCircle(x, xGoal, "xProgressCircle", "xProgressNumber", "xProgressGoal");
        updateProgressCircle(li, liGoal, "liProgressCircle", "liProgressNumber", "liProgressGoal");
        }
      );
    }

    /* ---------- SAVE GOALS ---------- */
  const saveGoalsBtn = document.getElementById("saveGoals");
  if (saveGoalsBtn) {
    saveGoalsBtn.onclick = () => {
      const newXGoal = parseInt(document.getElementById("xGoalInput").value) || 50;
      const newLiGoal = parseInt(document.getElementById("liGoalInput").value) || 50;
      chrome.storage.local.set({ xGoal: newXGoal, linkedinGoal: newLiGoal }, load);
    };
  }

    /* ---------- RESET COUNTERS ---------- */
  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm("Are you sure you want to reset all counters? This will clear today's progress but keep historical data.")) {
      chrome.storage.local.set(
        { xRepliesToday: 0, linkedinRepliesToday: 0, xTimeToday: 0, linkedinTimeToday: 0 },
          () => {
            // Update today's snapshot after reset
            const today = new Date().toLocaleDateString();
            chrome.storage.local.get(["dailyHistory"], res => {
              const history = res.dailyHistory || {};
              history[today] = {
                xReplies: 0,
                linkedinReplies: 0,
                xTime: 0,
                linkedinTime: 0
              };
              chrome.storage.local.set({ dailyHistory: history }, load);
            });
          }
        );
      }
    };
  }

  // Initialize circular progress circles
  function initProgressCircles() {
    const xCircle = document.getElementById("xProgressCircle");
    const liCircle = document.getElementById("liProgressCircle");
    const circumference = 2 * Math.PI * 45; // radius is 45
    
    if (xCircle) {
      xCircle.style.strokeDasharray = circumference;
      xCircle.style.strokeDashoffset = circumference;
    }
    if (liCircle) {
      liCircle.style.strokeDasharray = circumference;
      liCircle.style.strokeDashoffset = circumference;
    }
  }
  
  initProgressCircles();
    load();

  // Listen for storage changes to update progress bar in real-time
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.xRepliesToday || changes.linkedinRepliesToday || 
          changes.xGoal || changes.linkedinGoal) {
        load();
      }
      if (changes.dailyHistory || changes.xRepliesToday || changes.linkedinRepliesToday) {
        loadChart();
      }
    }
  });

  // START LIVE TIMER based on current view
  detectPlatform(platform => {
    if (platform === "x") startLiveTimer("x", "xTime");
    else if (platform === "linkedin") startLiveTimer("linkedin", "linkedinTime");
  });

  // Wait a bit for everything to load
  setTimeout(loadChart, 500);
});

// Initialize chart variables
let progressChart = null;
let chartLoadAttempts = 0;
const maxChartAttempts = 100; // 10 seconds max

// Fallback chart using SVG if Chart.js fails
function createFallbackChart(canvasElement) {
  const container = canvasElement.parentElement;
  const loader = document.getElementById("chartLoader");
  if (!container) return;
  
  // Hide loader
  if (loader) loader.style.display = "none";
  
  chrome.storage.local.get(["dailyHistory", "xRepliesToday", "linkedinRepliesToday"], res => {
    const history = res.dailyHistory || {};
    const today = new Date().toLocaleDateString();
    
    // Get last 7 days including today
    const dates = [];
    const xData = [];
    const liData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      dates.push(dateStr);
      
      if (dateStr === today) {
        xData.push(res.xRepliesToday || 0);
        liData.push(res.linkedinRepliesToday || 0);
      } else {
        const dayData = history[dateStr] || {};
        xData.push(dayData.xReplies !== undefined ? dayData.xReplies : 0);
        liData.push(dayData.linkedinReplies !== undefined ? dayData.linkedinReplies : 0);
      }
    }
    
    const labels = dates.map(d => new Date(d).getDate());
    const maxValue = Math.max(...xData, ...liData, 1);
    const width = 200;
    const height = 150;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const svg = `
      <svg width="${width}" height="${height}" style="max-width: 100%;">
        <defs>
          <linearGradient id="xGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#FF69B4;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#FF69B4;stop-opacity:0" />
          </linearGradient>
          <linearGradient id="liGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#FFB6C1;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#FFB6C1;stop-opacity:0" />
          </linearGradient>
        </defs>
        ${createSVGPath(xData, chartWidth, chartHeight, padding, maxValue, '#FF69B4', 'xGrad')}
        ${createSVGPath(liData, chartWidth, chartHeight, padding, maxValue, '#FFB6C1', 'liGrad')}
        ${labels.map((label, i) => {
          const x = padding + (i * chartWidth / (labels.length - 1));
          return `<text x="${x}" y="${height - 5}" text-anchor="middle" font-size="9" fill="#8B008B">${label}</text>`;
        }).join('')}
        <text x="${width/2}" y="15" text-anchor="middle" font-size="11" font-weight="bold" fill="#FF69B4">7-Day Progress</text>
        <circle cx="${padding + 10}" cy="${padding + 10}" r="4" fill="#FF69B4"/>
        <text x="${padding + 18}" y="${padding + 13}" font-size="9" fill="#8B008B">X</text>
        <circle cx="${padding + 50}" cy="${padding + 10}" r="4" fill="#FFB6C1"/>
        <text x="${padding + 58}" y="${padding + 13}" font-size="9" fill="#8B008B">LinkedIn</text>
      </svg>
    `;
    
    container.innerHTML = svg;
  });
}

function createSVGPath(data, width, height, padding, maxValue, color, gradientId) {
  if (data.length === 0) return '';
  
  const points = data.map((value, i) => {
    const x = padding + (i * width / (data.length - 1));
    const y = padding + height - (value / maxValue) * height;
    return `${x},${y}`;
  });
  
  const pathData = `M ${points.join(' L ')}`;
  const areaPath = `M ${padding},${padding + height} L ${points.join(' L ')} L ${padding + width},${padding + height} Z`;
  
  return `
    <path d="${areaPath}" fill="url(#${gradientId})" opacity="0.3"/>
    <path d="${pathData}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((point, i) => {
      const [x, y] = point.split(',').map(Number);
      return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" stroke="#FFF8DC" stroke-width="1.5"/>`;
    }).join('')}
  `;
}

// Chart loading function (defined outside DOMContentLoaded so it can be called from storage listener)
function loadChart() {
  chartLoadAttempts++;
  
  const ctx = document.getElementById("progressChart");
  const loader = document.getElementById("chartLoader");
  
  // Show loader
  if (loader) {
    loader.style.display = "block";
  }
  
  if (!ctx) {
    if (chartLoadAttempts < maxChartAttempts) {
      setTimeout(loadChart, 100);
    } else {
      console.error("Chart canvas not found after multiple attempts");
      if (loader) loader.style.display = "none";
    }
    return;
  }
  
  // Use SVG fallback chart (no external dependencies, no CSP issues)
  // Chart.js requires CDN which violates CSP, so we use our custom SVG chart
  if (loader) loader.style.display = "none";
  createFallbackChart(ctx);
  return;
  
  // Original Chart.js code (commented out due to CSP restrictions)
  /*
  if (typeof Chart === 'undefined' || !Chart) {
    if (chartLoadAttempts < maxChartAttempts) {
      setTimeout(loadChart, 100);
    } else {
      console.error("Chart.js failed to load after multiple attempts, using fallback");
      if (loader) loader.style.display = "none";
      createFallbackChart(ctx);
    }
    return;
  }
  
  chrome.storage.local.get(["dailyHistory", "xRepliesToday", "linkedinRepliesToday"], res => {
    const history = res.dailyHistory || {};
    const today = new Date().toLocaleDateString();
    
    // Get last 7 days including today
    const dates = [];
    const xData = [];
    const liData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      dates.push(dateStr);
      
      if (dateStr === today) {
        // Use current day's count
        const xCount = res.xRepliesToday || 0;
        const liCount = res.linkedinRepliesToday || 0;
        xData.push(xCount);
        liData.push(liCount);
      } else {
        // Use historical data, default to 0 if not found
        const dayData = history[dateStr] || {};
        const xCount = dayData.xReplies !== undefined ? dayData.xReplies : 0;
        const liCount = dayData.linkedinReplies !== undefined ? dayData.linkedinReplies : 0;
        xData.push(xCount);
        liData.push(liCount);
      }
    }
    
    // Format dates for display (just day number)
    const labels = dates.map(d => {
      const date = new Date(d);
      return date.getDate();
    });
    
    if (progressChart) {
      progressChart.destroy();
    }
    
    try {
      progressChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'X Replies',
              data: xData,
              borderColor: '#FF69B4',
              backgroundColor: 'rgba(255, 105, 180, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#FF69B4',
              pointBorderColor: '#FFF8DC',
              pointBorderWidth: 2
            },
            {
              label: 'LinkedIn Replies',
              data: liData,
              borderColor: '#FFB6C1',
              backgroundColor: 'rgba(255, 182, 193, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#FFB6C1',
              pointBorderColor: '#FFF8DC',
              pointBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                boxWidth: 12,
                padding: 8,
                font: {
                  size: 10
                },
                color: '#8B008B'
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                font: {
                  size: 9
                },
                color: '#8B008B'
              },
              grid: {
                color: 'rgba(255, 105, 180, 0.1)'
              }
            },
            x: {
              ticks: {
                font: {
                  size: 9
                },
                color: '#8B008B'
              },
              grid: {
                display: false
              }
            }
          }
        }
      });
      console.log("Chart initialized successfully");
      // Hide loader
      if (loader) loader.style.display = "none";
    } catch (e) {
      console.error("Error creating chart:", e);
      if (loader) loader.style.display = "none";
      createFallbackChart(ctx);
    }
  });
  */
}
