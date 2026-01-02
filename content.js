// ---------------- Helper: Check if extension context is valid ----------------
function isExtensionContextValid() {
  try {
    // Check if chrome object exists
    if (typeof chrome === 'undefined' || !chrome) {
      return false;
    }
    // Check if runtime exists
    if (!chrome.runtime) {
      return false;
    }
    // Try to access the ID - this will throw if context is invalidated
    const id = chrome.runtime.id;
    return !!id;
  } catch (e) {
    // Any error means context is invalid
    return false;
  }
}

// ---------------- Helper: Safely check for runtime errors ----------------
function getRuntimeError() {
  try {
    return chrome.runtime.lastError;
  } catch (e) {
    return { message: "Extension context invalidated" };
  }
}

// ---------------- Daily history snapshot ----------------
// Save daily snapshots to history without resetting counters
// Data persists until user manually resets or uninstalls extension
function saveDailySnapshot() {
  if (!isExtensionContextValid()) {
    console.warn("Extension context invalidated, skipping daily snapshot");
    return;
  }
  try {
  const today = new Date().toLocaleDateString();
    try {
      chrome.storage.local.get(["lastSnapshotDate", "dailyHistory", "xRepliesToday", "linkedinRepliesToday", "xTimeToday", "linkedinTimeToday"], res => {
        try {
          const error = getRuntimeError();
          if (error) {
            console.error("Error accessing storage:", error.message);
            return;
          }
          
          // Only save snapshot if it's a new day and we haven't saved today yet
          if (res.lastSnapshotDate !== today) {
            const history = res.dailyHistory || {};
            
            // Save yesterday's snapshot if it exists
            if (res.lastSnapshotDate) {
              // Get yesterday's final values (they might have been updated)
              chrome.storage.local.get(["xRepliesToday", "linkedinRepliesToday", "xTimeToday", "linkedinTimeToday"], yesterdayData => {
                const yesterday = res.lastSnapshotDate;
                history[yesterday] = {
                  xReplies: yesterdayData.xRepliesToday || 0,
                  linkedinReplies: yesterdayData.linkedinRepliesToday || 0,
                  xTime: yesterdayData.xTimeToday || 0,
                  linkedinTime: yesterdayData.linkedinTimeToday || 0
                };
                
                // Save today's initial snapshot (current values)
                const todayData = {
                  xReplies: res.xRepliesToday || 0,
                  linkedinReplies: res.linkedinRepliesToday || 0,
                  xTime: res.xTimeToday || 0,
                  linkedinTime: res.linkedinTimeToday || 0
                };
                
                // Only save today if we don't already have it
                if (!history[today]) {
                  history[today] = todayData;
                }
                
                // Keep all history (no limit) - data persists until manual clear
                try {
                  chrome.storage.local.set({
                    lastSnapshotDate: today,
                    dailyHistory: history
                    // Note: We DON'T reset counters - they continue accumulating
                  }, () => {
                    try {
                      const saveError = getRuntimeError();
                      if (saveError) {
                        console.error("Error saving snapshot:", saveError.message);
                      } else {
                        console.log("Daily snapshot saved - counters continue accumulating");
                      }
                    } catch (e) {
                      console.error("Error checking save result:", e);
                    }
                  });
                } catch (e) {
                  console.error("Error in storage.set:", e);
                }
              });
            } else {
              // First time setup - initialize with today's snapshot
              const todayData = {
                xReplies: res.xRepliesToday || 0,
                linkedinReplies: res.linkedinRepliesToday || 0,
                xTime: res.xTimeToday || 0,
                linkedinTime: res.linkedinTimeToday || 0
              };
              
              history[today] = todayData;
              
              try {
      chrome.storage.local.set({
                  lastSnapshotDate: today,
                  dailyHistory: history
                }, () => {
                  try {
                    const saveError = getRuntimeError();
                    if (saveError) {
                      console.error("Error saving initial snapshot:", saveError.message);
                    } else {
                      console.log("Initial daily snapshot saved");
                    }
                  } catch (e) {
                    console.error("Error checking save result:", e);
                  }
                });
              } catch (e) {
                console.error("Error in storage.set:", e);
              }
            }
          } else {
            // Same day - update today's snapshot with current values
            const history = res.dailyHistory || {};
            history[today] = {
              xReplies: res.xRepliesToday || 0,
              linkedinReplies: res.linkedinRepliesToday || 0,
              xTime: res.xTimeToday || 0,
              linkedinTime: res.linkedinTimeToday || 0
            };
            
            try {
              chrome.storage.local.set({
                dailyHistory: history
              });
            } catch (e) {
              console.error("Error updating today's snapshot:", e);
            }
          }
        } catch (e) {
          console.error("Error processing storage result:", e);
        }
      });
    } catch (e) {
      console.error("Error calling storage.get:", e);
    }
  } catch (err) {
    console.error("Error in saveDailySnapshot:", err);
  }
}

// Save snapshot on load and periodically update it
saveDailySnapshot();
// Update snapshot every hour to capture latest values
setInterval(saveDailySnapshot, 3600000); // 1 hour

// ---------------- Increment function ----------------
function increment(platform) {
  // Check context validity first thing
  if (!isExtensionContextValid()) {
    console.warn("Extension context invalidated, cannot increment counter");
    return;
  }
  
  // Double-check before accessing chrome APIs
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    console.warn("Chrome storage API not available");
    return;
  }
  
  try {
    console.log(`Incrementing ${platform} count`);
    
    // Wrap the entire storage operation
    if (!isExtensionContextValid()) {
      console.warn("Extension context invalidated before storage call");
      return;
    }
    
    try {
    chrome.storage.local.get([`${platform}RepliesToday`], res => {
        // Check context again in callback
        if (!isExtensionContextValid()) {
          console.warn("Extension context invalidated in storage callback");
          return;
        }
        
        try {
          const error = getRuntimeError();
          if (error) {
            console.error("Error accessing storage:", error.message);
            return;
          }
          
          if (!isExtensionContextValid()) {
            console.warn("Extension context invalidated before set");
            return;
          }
          
          try {
      console.log(`Current count for ${platform}:`, res[`${platform}RepliesToday`]);
            const newCount = (res[`${platform}RepliesToday`] || 0) + 1;
      chrome.storage.local.set({
              [`${platform}RepliesToday`]: newCount
            }, () => {
              if (!isExtensionContextValid()) {
                console.warn("Extension context invalidated in set callback");
                return;
              }
              
              try {
                const saveError = getRuntimeError();
                if (saveError) {
                  console.error("Error saving count:", saveError.message);
                } else {
                  console.log(`New count for ${platform} saved`);
                  // Update widget immediately
                  const countEl = document.getElementById("reply-guy-count");
                  if (countEl) {
                    countEl.textContent = newCount;
                  }
                  
                  // Update today's snapshot in history after increment
                  const today = new Date().toLocaleDateString();
                  chrome.storage.local.get(["dailyHistory", "xRepliesToday", "linkedinRepliesToday", "xTimeToday", "linkedinTimeToday"], snapshotRes => {
                    const snapshotError = getRuntimeError();
                    if (!snapshotError) {
                      const history = snapshotRes.dailyHistory || {};
                      history[today] = {
                        xReplies: snapshotRes.xRepliesToday || 0,
                        linkedinReplies: snapshotRes.linkedinRepliesToday || 0,
                        xTime: snapshotRes.xTimeToday || 0,
                        linkedinTime: snapshotRes.linkedinTimeToday || 0
                      };
                      chrome.storage.local.set({ dailyHistory: history });
                    }
                  });
                }
              } catch (e) {
                console.error("Error checking save result:", e);
              }
            });
          } catch (e) {
            console.error("Error in storage.set:", e);
          }
        } catch (e) {
          console.error("Error processing storage result:", e);
        }
      });
    } catch (e) {
      console.error("Error calling storage.get:", e);
      // Don't rethrow - just log it
    }
  } catch (err) {
    console.error("Error in increment:", err);
    // Don't rethrow - just log it
  }
}

// ---------------- FLOATING WIDGET ----------------
function createFloatingWidget(platform) {
  try {
    // Check if widget already exists
    if (document.getElementById("reply-guy-widget")) {
      console.log("Widget already exists");
      return;
    }
    
    platform = platform || "x"; // Default to x
    
    if (!document.body) {
      console.error("Cannot create widget: document.body not available");
      return;
    }
    
    // Check extension context before proceeding
    if (!isExtensionContextValid()) {
      console.warn("Extension context invalidated, cannot create widget.");
      // Show a message to user
      const errorMsg = document.createElement("div");
      errorMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 12px;
        border-radius: 8px;
        z-index: 10001;
        font-size: 12px;
        max-width: 200px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      errorMsg.textContent = "Extension reloaded. Please refresh this page.";
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 5000);
      return;
    }
    
    console.log("Creating floating widget...");
    
    // Create toggle button (shown when widget is hidden)
    const toggleBtn = document.createElement("div");
    toggleBtn.id = "reply-guy-toggle";
    let iconUrl = "";
    try {
      if (isExtensionContextValid() && chrome.runtime && chrome.runtime.getURL) {
        iconUrl = chrome.runtime.getURL("icon.png");
      } else {
        // Fallback if context is invalidated
        iconUrl = "📊";
      }
    } catch (e) {
      console.error("Error getting icon URL:", e);
      iconUrl = "📊";
    }
    
    if (iconUrl && iconUrl.startsWith("chrome-extension://")) {
      toggleBtn.innerHTML = `<img src="${iconUrl}" alt="Reply Guy" style="width: 24px; height: 24px; object-fit: contain;">`;
    } else {
      toggleBtn.innerHTML = iconUrl || "📊";
    }
    toggleBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: #FF69B4;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(255, 105, 180, 0.3);
    user-select: none;
    padding: 8px;
      box-sizing: border-box;
    `;
    
    try {
      document.body.appendChild(toggleBtn);
      console.log("Toggle button created");
    } catch (e) {
      console.error("Error creating toggle button:", e);
    }

    const widget = document.createElement("div");
    widget.id = "reply-guy-widget";
    widget.innerHTML = `
    <div id="reply-guy-header" style="cursor: move; padding: 8px; background: #FF69B4; color: white; border-radius: 8px 8px 0 0; font-weight: 600; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
      <span>Reply Counter</span>
      <span id="reply-guy-close" style="cursor: pointer; font-size: 16px; line-height: 1;">×</span>
    </div>
    <div id="reply-guy-content" style="padding: 16px; background: #FFF8DC; border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.25);">
      <div style="text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #FF69B4; margin-bottom: 4px;" id="reply-guy-count">0</div>
        <div style="font-size: 11px; color: #8B008B; margin-bottom: 8px;">Replies Today</div>
        <div style="font-size: 10px; color: #8B008B;" id="reply-guy-goal">Goal: <span id="reply-guy-goal-value">50</span></div>
      </div>
    </div>
    `;
    
    widget.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 140px;
    z-index: 10000;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    user-select: none;
    cursor: default;
      pointer-events: auto;
    `;

    try {
      document.body.appendChild(widget);
      console.log("Widget appended to body");
    } catch (e) {
      console.error("Error appending widget:", e);
      return;
    }

    // Make widget draggable
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    let xOffset = 0;
    let yOffset = 0;

    // Setup drag functionality after widget is added to DOM
    const setupDrag = () => {
    const header = document.getElementById("reply-guy-header");
    if (!header) {
      console.log("Header not found, retrying drag setup...");
      setTimeout(setupDrag, 100);
      return;
    }
    
    console.log("Setting up drag functionality for widget");
    
    // Make header draggable
    header.style.cursor = "move";
    header.style.userSelect = "none";
    header.setAttribute("title", "Drag to move");
    
    const dragStart = (e) => {
      // Don't drag if clicking the close button
      if (e.target && (e.target.id === "reply-guy-close" || e.target.closest("#reply-guy-close"))) {
        console.log("Close button clicked, not dragging");
        return;
      }
      
      console.log("Drag started");
      isDragging = true;
      startX = e.clientX - xOffset;
      startY = e.clientY - yOffset;
      
      widget.style.cursor = "grabbing";
      header.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation();
    };
    
    const drag = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      currentX = e.clientX - startX;
      currentY = e.clientY - startY;
      
      xOffset = currentX;
      yOffset = currentY;
      
      widget.style.transform = `translate(${currentX}px, ${currentY}px)`;
    };
    
    const dragEnd = (e) => {
      if (!isDragging) return;
      
      console.log("Drag ended at:", { x: currentX, y: currentY });
      isDragging = false;
      widget.style.cursor = "default";
      header.style.cursor = "move";
      
      // Save position
      if (isExtensionContextValid()) {
        try {
          chrome.storage.local.set({
            widgetPosition: { x: currentX, y: currentY }
          });
          console.log("Widget position saved:", { x: currentX, y: currentY });
        } catch (e) {
          console.error("Error saving widget position:", e);
        }
      }
    };
    
    // Attach event listeners with capture phase to ensure they fire
    header.addEventListener("mousedown", dragStart, true);
    document.addEventListener("mousemove", drag, true);
    document.addEventListener("mouseup", dragEnd, true);
    document.addEventListener("mouseleave", dragEnd, true); // Stop dragging if mouse leaves window
    
    // Test: Add a click handler to verify header is clickable
    header.addEventListener("click", (e) => {
      if (e.target.id !== "reply-guy-close") {
        console.log("Header clicked - drag should work");
      }
    });
    
      console.log("Drag functionality set up successfully");
    };
    
    // Setup drag after widget is definitely in DOM
    setTimeout(setupDrag, 300);
    
    // Load saved position
    try {
      if (isExtensionContextValid()) {
        chrome.storage.local.get(["widgetPosition"], res => {
          const error = getRuntimeError();
          if (error) {
            console.warn("Error loading widget position:", error.message);
            return;
          }
          if (res.widgetPosition && res.widgetPosition.x !== undefined && res.widgetPosition.y !== undefined) {
            xOffset = res.widgetPosition.x;
            yOffset = res.widgetPosition.y;
            currentX = res.widgetPosition.x;
            currentY = res.widgetPosition.y;
            widget.style.transform = `translate(${res.widgetPosition.x}px, ${res.widgetPosition.y}px)`;
            console.log("Loaded saved widget position:", res.widgetPosition);
          }
        });
      }
    } catch (e) {
      console.error("Error loading widget position:", e);
    }

    // Close button - wait for element to exist
    setTimeout(() => {
      const closeBtn = document.getElementById("reply-guy-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          widget.style.display = "none";
          toggleBtn.style.display = "flex";
          try {
            if (isExtensionContextValid()) {
              chrome.storage.local.set({ widgetVisible: false });
            }
          } catch (e) {
            console.error("Error saving widget visibility:", e);
          }
        });
      }
    }, 100);
    
    // Toggle button click
    toggleBtn.addEventListener("click", () => {
      widget.style.display = "block";
      toggleBtn.style.display = "none";
      try {
        if (isExtensionContextValid()) {
          chrome.storage.local.set({ widgetVisible: true });
        }
      } catch (e) {
        console.error("Error saving widget visibility:", e);
      }
    });
    
    // Check if widget should be visible (default to visible)
    try {
      if (isExtensionContextValid()) {
        chrome.storage.local.get(["widgetVisible"], res => {
          const error = getRuntimeError();
          if (error) {
            // Default to visible on error
            widget.style.display = "block";
            toggleBtn.style.display = "none";
            return;
          }
          // Default to visible if not set
          if (res.widgetVisible === false) {
            widget.style.display = "none";
            toggleBtn.style.display = "flex";
          } else {
            widget.style.display = "block";
            toggleBtn.style.display = "none";
          }
        });
      } else {
        // Default to visible if context invalid
        widget.style.display = "block";
        toggleBtn.style.display = "none";
      }
    } catch (e) {
      console.error("Error loading widget visibility:", e);
      // Default to visible on error
      widget.style.display = "block";
      toggleBtn.style.display = "none";
    }

    // Store platform for widget updates
    widget.dataset.platform = platform;
    
    // Load initial count
    try {
      if (isExtensionContextValid()) {
        updateWidgetCount(platform);
        
        // Listen for storage changes
        try {
          chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local') {
              const repliesKey = `${platform}RepliesToday`;
              const goalKey = `${platform}Goal`;
              if (changes[repliesKey] || changes[goalKey]) {
                updateWidgetCount(platform);
              }
            }
          });
        } catch (e) {
          console.error("Error setting up storage listener:", e);
        }
      }
    } catch (e) {
      console.error("Error in widget setup:", e);
    }
  } catch (e) {
    console.error("Error creating floating widget:", e);
    // Don't throw - just log the error so the page doesn't break
  }
}

function updateWidgetCount(platform) {
  if (!isExtensionContextValid()) {
    console.warn("Cannot update widget count: extension context invalidated");
    return;
  }
  
  platform = platform || "x"; // Default to x
  const repliesKey = `${platform}RepliesToday`;
  const goalKey = `${platform}Goal`;
  
  try {
    chrome.storage.local.get([repliesKey, goalKey], res => {
      try {
        const error = getRuntimeError();
        if (error) {
          console.warn("Error accessing storage for widget:", error.message);
          return;
        }
        
        const countEl = document.getElementById("reply-guy-count");
        const goalEl = document.getElementById("reply-guy-goal-value");
        
        if (countEl) {
          countEl.textContent = res[repliesKey] || 0;
        }
        if (goalEl) {
          goalEl.textContent = res[goalKey] || 50;
        }
      } catch (e) {
        console.error("Error processing widget count update:", e);
      }
    });
  } catch (e) {
    console.error("Error updating widget:", e);
  }
}

// ---------------- X / Twitter ----------------
if (location.hostname.includes("twitter.com") || location.hostname.includes("x.com")) {
  console.log("X/Twitter script active");
  
  // Create floating widget - wait for body to be ready
  function initWidget() {
    if (!document.body) {
      console.log("Waiting for document.body...");
      setTimeout(initWidget, 100);
      return;
    }
    
    if (document.getElementById("reply-guy-widget")) {
      console.log("Widget already exists");
      return;
    }
    
    try {
      console.log("Initializing widget for X...");
      createFloatingWidget("x");
      console.log("Floating widget created successfully");
    } catch (e) {
      console.error("Error creating widget:", e);
      console.error(e.stack);
    }
  }
  
  // Try multiple times to ensure it works
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initWidget, 500);
    });
  } else {
    setTimeout(initWidget, 500);
  }
  
  // Also try after a longer delay as backup
  setTimeout(initWidget, 2000);
  
  const observer = new MutationObserver(() => {
    const replyButtonInline = document.querySelector('[data-testid="tweetButtonInline"]:not([disabled])');
    const replyButton = document.querySelector('[data-testid="tweetButton"]:not([disabled])');
    if (replyButton) {
      console.log("X: Reply button detected");
      replyButton.onclick = () => {
        console.log("X: Reply button clicked");
        setTimeout(() => {
          if (isExtensionContextValid()) {
            increment("x");
          } else {
            console.warn("Extension context invalidated, skipping increment");
          }
        }, 600);
      };
    }
    if (replyButtonInline) {
      console.log("X: Reply button detected");
      replyButtonInline.onclick = () => {
        console.log("X: Reply button clicked");
        setTimeout(() => {
          if (isExtensionContextValid()) {
            increment("x");
          } else {
            console.warn("Extension context invalidated, skipping increment");
          }
        }, 600);
      };
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ---------------- LinkedIn ----------------
if (location.hostname.includes("linkedin.com") || location.hostname.includes("www.linkedin.com")) {
  console.log("LinkedIn script active");
  
  // Create floating widget - wait for body to be ready
  function initWidget() {
    if (!document.body) {
      console.log("Waiting for document.body...");
      setTimeout(initWidget, 100);
      return;
    }
    
    if (document.getElementById("reply-guy-widget")) {
      console.log("Widget already exists");
      return;
    }
    
    try {
      console.log("Initializing widget for LinkedIn...");
      createFloatingWidget("linkedin");
      console.log("Floating widget created successfully");
    } catch (e) {
      console.error("Error creating widget:", e);
      console.error(e.stack);
    }
  }
  
  // Try multiple times to ensure it works
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initWidget, 500);
    });
  } else {
    setTimeout(initWidget, 500);
  }
  
  // Also try after a longer delay as backup
  setTimeout(initWidget, 2000);

  const observer = new MutationObserver(() => {
    // Try multiple selectors for LinkedIn comment buttons (LinkedIn changes their classes frequently)
    const selectors = [
      "button.comments-comment-box__submit-button--cr",
      "button[aria-label*='Post']",
      "button[aria-label*='Comment']",
      "button.comments-comment-box__submit-button",
      "button.comments-comment-box__submit-button:not([disabled])",
      "button[data-control-name='submit_comment']",
      "button.comments-comment-box__submit-button--enabled"
    ];
    
    let buttons = [];
    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        buttons = Array.from(found);
        break;
      }
    }
    
    buttons.forEach(btn => {
      if (btn.dataset.sniffAttached) return;
      btn.dataset.sniffAttached = "true";

      btn.addEventListener("click", (e) => {
        console.log("LinkedIn: Comment button clicked", btn);
        setTimeout(() => {
          if (isExtensionContextValid()) {
            increment("linkedin");
          } else {
            console.warn("Extension context invalidated, skipping increment");
          }
        }, 600);
      }, true);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Form submit via Enter key - multiple form selectors
  document.addEventListener("submit", (ev) => {
    const form = ev.target;
    const formSelectors = [
      "comments-comment-box__form",
      "comments-comment-box",
      "comment-box__form"
    ];
    
    const matches = formSelectors.some(selector => 
      form.className && form.className.includes(selector)
    );
    
    if (matches || form.closest(".comments-comment-box") || form.closest("[data-control-name='comment']")) {
      console.log("LinkedIn: Form submitted (Enter key)", form);
      setTimeout(() => {
        if (isExtensionContextValid()) {
          increment("linkedin");
        } else {
          console.warn("Extension context invalidated, skipping increment");
        }
      }, 600);
    }
  }, true);
  
  // Also listen for click events on comment submit buttons more broadly
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target || target.tagName !== "BUTTON") return;
    
    // Check if it's a LinkedIn comment/post button
    const isCommentButton = 
      target.getAttribute("aria-label")?.toLowerCase().includes("post") ||
      target.getAttribute("aria-label")?.toLowerCase().includes("comment") ||
      target.className?.includes("comments-comment-box__submit") ||
      target.closest(".comments-comment-box")?.querySelector("button[aria-label*='Post']") === target ||
      target.closest(".comments-comment-box")?.querySelector("button[aria-label*='Comment']") === target;
    
    if (isCommentButton && !target.dataset.sniffAttachedClick) {
      target.dataset.sniffAttachedClick = "true";
      console.log("LinkedIn: Comment button clicked (click listener)", target);
      setTimeout(() => {
        if (isExtensionContextValid()) {
          increment("linkedin");
        } else {
          console.warn("Extension context invalidated, skipping increment");
        }
      }, 600);
    }
  }, true);
}
