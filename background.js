chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "applyEffect") {
      // Get the currently active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          console.error("No active tab found.");
          sendResponse({ status: "error", message: "No active tab." });
          return;
        }
        const targetTabId = tabs[0].id;
  
        // Inject the content script which will then inject the main script
        chrome.scripting.executeScript({
          target: { tabId: targetTabId },
          files: ['content.js']
        })
        .then(() => {
          console.log("Content script injected. Sending parameters...");
          // Now send the parameters to the injected content script
          chrome.tabs.sendMessage(targetTabId, {
            action: "setEffectParams",
            gainValue: message.gainValue,
            reverbEnabled: message.reverbEnabled
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending parameters to content script:", chrome.runtime.lastError.message);
              // Don't overwrite original error if sendResponse was already called on injection failure
              // Maybe send a different response or just log
            } else {
              console.log("Parameters sent to content script:", response);
            }
          });
          // Send response back to popup confirming injection started
          sendResponse({ status: "injection initiated" });
        })
        .catch(err => {
          console.error("Failed to inject content script:", err);
          sendResponse({ status: "error", message: err.toString() });
        });
      });
      // Return true to indicate you wish to send a response asynchronously
      return true;
    }
  });
  
  console.log("Background service worker started.");