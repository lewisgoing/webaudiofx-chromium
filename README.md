# Audio Effects Chromium Extension (MVP)

## Overview

This is a Minimum Viable Product (MVP) for a Chromium extension designed to apply audio effects to web page audio. The eventual goal is to allow users to create, save, and apply complex audio signal chains (like reverb, delay, etc.) using a visual editor adapted from the [webaudio-playground](https://github.com/lewisgoing/webaudio-playground) project.

**This MVP version demonstrates the core audio interception mechanism but has limited functionality.**

## MVP Features

* Applies a single, hardcoded **Gain Node** (reducing volume by 50%) to `<audio>` and `<video>` elements on a webpage.
* Effect is applied when the user clicks the "Apply Gain" button in the extension popup.
* Uses Manifest V3, Service Workers, and the `chrome.scripting` API.
* Includes basic DOM observation to attempt applying the effect to dynamically loaded media elements.

## MVP Limitations

* **No Visual Editor:** Does not include the node editor interface.
* **No Presets:** Cannot save or load custom effect chains.
* **Single Effect Only:** Only applies a simple gain reduction.
* **Limited Web Audio API Interception:** Primarily targets `<audio>` and `<video>` elements via `captureStream()`. Full interception of arbitrary `AudioContext` usage on a page is not implemented in this MVP.
* **Basic Error Handling:** Error handling is minimal.

## Installation (MVP - Load Unpacked)

1.  **Clone or Download:** Get the extension files (`manifest.json`, `popup.html`, `popup.js`, `background.js`, `content.js`, `injected.js`) into a single directory (e.g., `audio-effects-extension-mvp`).
2.  **Open Chrome Extensions:** Navigate to `chrome://extensions` in your Chrome browser.
3.  **Enable Developer Mode:** Ensure the "Developer mode" toggle (usually in the top-right corner) is enabled.
4.  **Load Unpacked:** Click the "Load unpacked" button.
5.  **Select Directory:** Browse to and select the directory containing the extension files.
6.  The "Audio Effects MVP" extension should now appear in your list of extensions.

## How to Use (MVP)

1.  Navigate to a web page containing standard HTML `<audio>` or `<video>` elements (e.g., a simple test page, some news sites, YouTube).
2.  Click the extension's icon in your Chrome toolbar.
3.  In the popup window, click the "Apply Gain" button.
4.  The volume of the audio/video elements on the page should noticeably decrease.
5.  You can check the browser's developer console (F12) on the *web page* (not the extension popup) to see log messages from the injected script.

## Project Structure (MVP)

audio-effects-extension-mvp/├── manifest.json         # Defines the extension's properties and permissions├── popup.html            # UI for the extension's toolbar popup├── popup.js              # Logic for the popup UI (button click)├── background.js         # Service worker (handles messages, injects scripts)├── content.js            # Injected into the page to load injected.js└── injected.js           # Runs in page context, modifies audio elements
## Future Plans

This MVP serves as a proof-of-concept. The next steps involve implementing the full features outlined in the original plan, including:

* Adapting the React-based visual node editor from `webaudio-playground`.
* Implementing preset creation, saving, and loading using `chrome.storage`.
* Adding various Web Audio API nodes (Reverb, Delay, Filter, Compressor, etc.).
* Developing more robust interception for the general Web Audio API usage on pages.
* Improving UI/UX for the popup and editor.
* Adding comprehensive error handling and performance optimization.

## License

*This project adapts components and concepts from [webaudio-playground](https://github.com/lewisgoing/webaudio-playground). Assuming the original repository's license (MIT) applies, this derived work would likely also be under the MIT License. Please verify licensing requirements.*
# webaudiofx-chromium
