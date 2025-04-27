document.addEventListener('DOMContentLoaded', () => {
    const gainSlider = document.getElementById('gainSlider');
    const gainValueDisplay = document.getElementById('gainValueDisplay');
    const reverbToggle = document.getElementById('reverbToggle');
    const applyButton = document.getElementById('applyEffects');

    // --- Load saved settings on popup open ---
    chrome.storage.local.get(['gainValue', 'reverbEnabled'], (result) => {
        console.log("Loaded settings:", result);
        if (result.gainValue !== undefined) {
            gainSlider.value = result.gainValue;
            gainValueDisplay.textContent = parseFloat(result.gainValue).toFixed(2);
        } else {
            // Set default display if nothing saved
             gainValueDisplay.textContent = parseFloat(gainSlider.value).toFixed(2);
        }
        if (result.reverbEnabled !== undefined) {
            reverbToggle.checked = result.reverbEnabled;
        }
    });
    // --- End Load ---

    // Update display when slider moves
    gainSlider.addEventListener('input', () => {
        gainValueDisplay.textContent = parseFloat(gainSlider.value).toFixed(2);
        // Don't save here, only on apply
    });

    // Apply button listener
    applyButton.addEventListener('click', () => {
        const gainValue = parseFloat(gainSlider.value);
        const reverbEnabled = reverbToggle.checked;

        console.log(`Apply clicked - Gain: ${gainValue}, Reverb: ${reverbEnabled}`);

        // --- Save settings on apply ---
        chrome.storage.local.set({ gainValue, reverbEnabled }, () => {
             console.log("Settings saved:", { gainValue, reverbEnabled });
        });
        // --- End Save ---

        // Send message to background script
        chrome.runtime.sendMessage({
            action: "applyEffect",
            gainValue: gainValue,
            reverbEnabled: reverbEnabled
        }, (response) => {
             if (chrome.runtime.lastError) {
                 console.error("Error sending message:", chrome.runtime.lastError);
             } else {
                 console.log("Message sent, response:", response);
             }
             // Maybe close popup after applying?
             // window.close();
        });
    });
});