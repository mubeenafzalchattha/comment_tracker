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

// ---------------- Daily reset ----------------
function checkDailyReset() {
  if (!isExtensionContextValid()) {
    console.warn("Extension context invalidated, skipping daily reset");
    return;
  }
  try {
    const today = new Date().toLocaleDateString();
    try {
      chrome.storage.local.get(["lastResetDate"], res => {
        try {
          const error = getRuntimeError();
          if (error) {
            console.error("Error accessing storage:", error.message);
            return;
          }
          if (res.lastResetDate !== today) {
            try {
              chrome.storage.local.set({
                lastResetDate: today,
                xRepliesToday: 0,
                linkedinRepliesToday: 0,
                xTimeToday: 0,
                linkedinTimeToday: 0
              }, () => {
                try {
                  const saveError = getRuntimeError();
                  if (saveError) {
                    console.error("Error saving reset:", saveError.message);
                  } else {
                    console.log("Daily counters reset");
                  }
                } catch (e) {
                  console.error("Error checking save result:", e);
                }
              });
            } catch (e) {
              console.error("Error in storage.set:", e);
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
    console.error("Error in checkDailyReset:", err);
  }
}
checkDailyReset();

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
            chrome.storage.local.set({
              [`${platform}RepliesToday`]: (res[`${platform}RepliesToday`] || 0) + 1
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

// ---------------- X / Twitter ----------------
if (location.hostname.includes("twitter.com") || location.hostname.includes("x.com")) {
  console.log("X/Twitter script active");
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

  const observer = new MutationObserver(() => {
    const buttons = document.querySelectorAll("button.comments-comment-box__submit-button--cr");
    buttons.forEach(btn => {
      if (btn.dataset.sniffAttached) return;
      btn.dataset.sniffAttached = "true";

      btn.addEventListener("click", () => {
        console.log("LinkedIn: Comment button clicked");
        setTimeout(() => {
          if (isExtensionContextValid()) {
            increment("linkedin");
          } else {
            console.warn("Extension context invalidated, skipping increment");
          }
        }, 600);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Form submit via Enter key
  document.addEventListener("submit", (ev) => {
    const form = ev.target;
    if (form.className.includes("comments-comment-box__form")) {
      console.log("LinkedIn: Form submitted (Enter key)");
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
