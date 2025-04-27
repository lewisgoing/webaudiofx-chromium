console.log("Content script loaded.");

// Function to inject the main script
function injectScript(filePath) {
  // Check if already injected to prevent duplicates
  if (document.getElementById('webaudio-extension-injected-script')) {
    console.log('Injected script already present.');
    return;
  }
  const script = document.createElement('script');
  script.id = 'webaudio-extension-injected-script'; // Add an ID for checking
  script.src = chrome.runtime.getURL(filePath);
  script.onload = function() {
    console.log("Injected script loaded successfully:", filePath);
  };
  script.onerror = function(e) {
    console.error("Error loading injected script:", filePath, e);
  };
  (document.head || document.documentElement).appendChild(script);
}

// Listen for parameters from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setEffectParams") {
    console.log("Received parameters:", request);

    // Check if the main script needs injection
    // Use the flag set by injected.js itself for reliability
    if (!window.webAudioExtensionInitialized) {
        console.log("Injecting main script (injected.js)...");
        injectScript('injected.js');
    } else {
        console.log("Main script (injected.js) already initialized.");
    }

    // Send parameters to the injected script via postMessage regardless
    // Use a specific type to avoid conflicts with other messages
    const messagePayload = {
      type: "WEBAUDIO_EFFECT_PARAMS",
      payload: {
        gainValue: request.gainValue,
        reverbEnabled: request.reverbEnabled
      }
    };
    console.log("Posting message to window:", messagePayload);
    window.postMessage(messagePayload, "*"); // Target can be more specific if needed

    sendResponse({ status: "params sent to page via postMessage" });

  }
  return true; // Keep channel open for async response possibility
});