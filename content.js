console.log("[sniff] Content script loaded");

// ---------------- Daily reset ----------------
function checkDailyReset() {
  const today = new Date().toLocaleDateString();
  chrome.storage.local.get(["lastResetDate"], res => {
    console.log("[sniff] Checking daily reset", res.lastResetDate, "vs", today);
    if (res.lastResetDate !== today) {
      chrome.storage.local.set({
        lastResetDate: today,
        xRepliesToday: 0,
        linkedinRepliesToday: 0,
        xTimeToday: 0,
        linkedinTimeToday: 0
      }, () => console.log("[sniff] Daily counters reset"));
    }
  });
}
checkDailyReset();

// ---------------- Increment function ----------------
function increment(platform) {
  console.log(`[sniff] Increment called for platform: ${platform}`);
  try {
    chrome.storage.local.get([`${platform}RepliesToday`], res => {
      console.log(`[sniff] Current count for ${platform}:`, res[`${platform}RepliesToday`] || 0);
      chrome.storage.local.set({
        [`${platform}RepliesToday`]: (res[`${platform}RepliesToday`] || 0) + 1
      }, () => console.log(`[sniff] New count for ${platform} saved`));
    });
  } catch (err) {
    console.error("[sniff] Error in increment:", err);
  }
}

// ---------------- X / Twitter ----------------
if (location.hostname.includes("twitter.com") || location.hostname.includes("x.com")) {
  console.log("[sniff] X/Twitter script active");
  const observer = new MutationObserver(() => {
    const replyButtonInline = document.querySelector('[data-testid="tweetButtonInline"]:not([disabled])');
    const replyButton = document.querySelector('[data-testid="tweetButton"]:not([disabled])');
    if (replyButton) {
      console.log("[sniff] X: Reply button detected");
      replyButton.onclick = () => {
        console.log("[sniff] X: Reply button clicked");
        setTimeout(() => increment("x"), 600);
      };
    }
    if (replyButtonInline) {
      console.log("[sniff] X: Reply button detected");
      replyButtonInline.onclick = () => {
        console.log("[sniff] X: Reply button clicked");
        setTimeout(() => increment("x"), 600);
      };
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ---------------- LinkedIn ----------------
if (location.hostname.includes("linkedin.com") || location.hostname.includes("www.linkedin.com")) {
  console.log("[sniff] LinkedIn script active");

  const observer = new MutationObserver(() => {
    const buttons = document.querySelectorAll("button.comments-comment-box__submit-button--cr");
    buttons.forEach(btn => {
      if (btn.dataset.sniffAttached) return;
      btn.dataset.sniffAttached = "true";

      btn.addEventListener("click", () => {
        console.log("[sniff] LinkedIn: Comment button clicked");
        setTimeout(() => increment("linkedin"), 600);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Form submit via Enter key
  document.addEventListener("submit", (ev) => {
    const form = ev.target;
    if (form.className.includes("comments-comment-box__form")) {
      console.log("[sniff] LinkedIn: Form submitted (Enter key)");
      setTimeout(() => increment("linkedin"), 600);
    }
  }, true);
}
