// injected.js
(function() {
  console.log("Injected script starting...");

  // --- Initialize global parameters FIRST ---
  // Ensure this exists *before* any function potentially uses it.
  if (typeof window.latestAudioParams === 'undefined') {
      window.latestAudioParams = { gainValue: 0.7, reverbEnabled: false };
      console.log("Initialized window.latestAudioParams");
  }

  // --- Global Setup & State (run only once) ---
  if (!window.webAudioExtensionInitialized) {
    console.log("Performing one-time initialization...");
    window.webAudioExtensionInitialized = true;
    window.audioEffectNodes = new WeakMap(); // element -> { ctx, source, gain, convolver? }
    window.sharedAudioContext = null;
    window.reverbBuffer = null; // Cache for reverb impulse
    // latestAudioParams is already initialized above

    window.addEventListener("message", (event) => {
       if (event.source === window && event.data && event.data.type === "WEBAUDIO_EFFECT_PARAMS") {
          console.log("Injected script received params via postMessage:", event.data.payload);
          window.latestAudioParams = event.data.payload; // Update global params
          console.log("Re-applying effects to existing elements with new params...");
          findAllMediaElements(document.body).forEach(element => {
              if (window.audioEffectNodes.has(element)) {
                   applyOrUpdateEffects(element); // Apply with new global params
              }
          });
       }
    });

    // --- MutationObserver Setup (modified logic below after functions defined) ---
    // Placeholder, defined properly later
    window.mediaObserver = null;

    console.log("Web Audio Extension Initialized (Listeners, Observer, Maps pending...). Processing initial elements...");
  }
  // --- End Global Setup ---


  // --- Use existing global context and maps ---
  const audioEffectNodes = window.audioEffectNodes;
  let sharedAudioContext = window.sharedAudioContext;
  let reverbBuffer = window.reverbBuffer;
  const processedThisRun = new WeakSet(); // For initial scan

  // --- Function to find media elements, including Shadow DOM ---
  function findAllMediaElements(rootNode) {
      const mediaElements = new Set(); // Use Set to avoid duplicates
      try {
          // Find elements in the light DOM of the current root
          rootNode.querySelectorAll('audio, video').forEach(el => mediaElements.add(el));
          // Find elements in Shadow DOMs recursively
          rootNode.querySelectorAll('*').forEach(el => {
              if (el.shadowRoot) {
                  findAllMediaElements(el.shadowRoot).forEach(shadowEl => mediaElements.add(shadowEl)); // Recurse
              }
          });
      } catch (e) {
          // Ignore errors (e.g., security restrictions on some elements)
          // console.warn("Error traversing for media elements:", e);
      }
      return Array.from(mediaElements); // Return as array
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { console.warn("Web Audio API not supported."); return; }

    // --- Reverb IR Generation --- 
    function getOrCreateReverbImpulseResponse(audioCtx) {
        // ... (same as before) ...
        if (reverbBuffer && reverbBuffer.sampleRate === audioCtx.sampleRate) return reverbBuffer;
        const sampleRate = audioCtx.sampleRate; const duration = 1.8; const decay = 2.0;
        const length = Math.max(1, Math.floor(sampleRate * duration));
        const impulse = audioCtx.createBuffer(2, length, sampleRate);
        // console.log(`Generating IR: ${duration}s, ${length} samples, ${sampleRate} Hz`);
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) { channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay); }
        }
        window.reverbBuffer = impulse; reverbBuffer = impulse;
        // console.log("Generated IR."); 
        return impulse;
    }

    // --- Function to apply/update effects ---
    function applyOrUpdateEffects(element) {
        const elementId = element.id || element.src || element.tagName; // For logging
        console.log(`[${elementId}] Attempting apply/update...`); // Log start

        const { gainValue: currentGain, reverbEnabled: currentReverbEnabled } = window.latestAudioParams;

        if (!element) { console.log(`[${elementId}] Skipped: Element is null.`); return; }
        if (typeof element.captureStream !== 'function') {
            console.log(`[${elementId}] Skipped: captureStream not a function.`);
            return; // Skip if no element or no captureStream method
        }
        // It's possible for an element (like in an iframe) to be non-null but not in the main document body
        // Check if it's connected to the document node we are observing
         if (!document.contains(element)) {
             console.log(`[${elementId}] Skipped: Element not in main document.`);
             if(audioEffectNodes.has(element)) audioEffectNodes.delete(element);
             return;
         }
        // Prevent double-processing during initial scan vs observer overlap
        if (processedThisRun.has(element) && !audioEffectNodes.has(element)) {
             console.log(`[${elementId}] Skipped: Already processed this run.`);
             return;
        }
        if (!audioEffectNodes.has(element)) processedThisRun.add(element);

        let ctx;
        let stream; // To check stream state
        try {
            if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
                console.log(`[${elementId}] Creating new shared AudioContext.`);
                sharedAudioContext = new AudioContext(); window.sharedAudioContext = sharedAudioContext;
                reverbBuffer = null; window.reverbBuffer = null;
            }
            ctx = sharedAudioContext;
            console.log(`[${elementId}] Context state before resume check: ${ctx.state}`);
            if (ctx.state === 'suspended') {
                console.log(`[${elementId}] Context suspended, attempting resume...`);
                 ctx.resume().then(() => {
                     console.log(`[${elementId}] Context resumed successfully.`);
                 }).catch(e => {console.warn(`[${elementId}] Context resume failed:`, e);});
            }
            // Test captureStream before proceeding
            console.log(`[${elementId}] Attempting captureStream...`);
            stream = element.captureStream();
            if (!stream) {
                console.warn(`[${elementId}] captureStream() returned null/undefined.`);
                return;
            }
             if (!stream.active) {
                 console.warn(`[${elementId}] captureStream() returned inactive stream.`);
                 // Sometimes inactive streams become active later, maybe don't return immediately?
                 // Consider only returning if it's consistently inactive? For now, let's log and continue.
                 // return;
             } else {
                 console.log(`[${elementId}] captureStream() succeeded, stream active.`);
             }
        } catch (err) {
             console.error(`[${elementId}] Ctx/capture error:`, err);
             return; // Cannot proceed
        }

        let nodes = audioEffectNodes.get(element);
        let source, gain, convolver;

        if (nodes) { // Update
             console.log(`[${elementId}] Updating existing nodes. Context state: ${ctx.state}`);
            ({ ctx, source, gain, convolver } = nodes); // Re-assign ctx just in case it was recreated? Unlikely here.
            const oldGain = gain.gain.value; const oldReverbState = !!convolver;
            if (Math.abs(oldGain - currentGain) < 0.001 && oldReverbState === currentReverbEnabled) {
                 console.log(`[${elementId}] Params unchanged, skipping update.`);
                 return;
            }
            console.log(`[${elementId}] Updating params: Gain ${currentGain}, Reverb ${currentReverbEnabled}`);
            gain.gain.setTargetAtTime(currentGain, ctx.currentTime, 0.01); // Smoother gain change
            const needsReverb = currentReverbEnabled; const hasReverb = !!convolver;
            let graphChanged = false;
            if (needsReverb && !hasReverb) {
                console.log(`[${elementId}] Adding reverb node.`);
                convolver = ctx.createConvolver(); const impulse = getOrCreateReverbImpulseResponse(ctx); if (!impulse) return;
                convolver.buffer = impulse; gain.disconnect(); gain.connect(convolver).connect(ctx.destination);
                nodes.convolver = convolver;
                graphChanged = true;
            } else if (!needsReverb && hasReverb) {
                console.log(`[${elementId}] Removing reverb node.`);
                gain.disconnect(); convolver.disconnect(); gain.connect(ctx.destination);
                nodes.convolver = null;
                graphChanged = true;
            }
            // Ensure muted only if context is running
            if (ctx.state === 'running' && !element.muted) {
                 console.log(`[${elementId}] Setting element.muted = true (update)`);
                 element.muted = true;
            } else if (ctx.state !== 'running') {
                 console.log(`[${elementId}] Context not running (${ctx.state}), not muting yet.`);
            }
             if (graphChanged) console.log(`[${elementId}] Audio graph updated.`);
        } else { // Create
             console.log(`[${elementId}] Creating new nodes. Context state: ${ctx.state}`);
            try {
                 // Capture stream again - needed for createMediaStreamSource
                 console.log(`[${elementId}] Creating MediaStreamSource...`);
                 source = ctx.createMediaStreamSource(element.captureStream()); // Use the checked stream? No, API requires fresh capture.
                 console.log(`[${elementId}] Creating GainNode (Gain: ${currentGain})...`);
                 gain = ctx.createGain(); gain.gain.setValueAtTime(currentGain, ctx.currentTime);
                 nodes = { ctx, source, gain, convolver: null };
                 let lastNode = gain; // Keep track of the last node to connect to destination

                 if (currentReverbEnabled) {
                     console.log(`[${elementId}] Creating ConvolverNode...`);
                     convolver = ctx.createConvolver(); const impulse = getOrCreateReverbImpulseResponse(ctx); if (!impulse) throw new Error("Failed to get impulse");
                     convolver.buffer = impulse;
                     console.log(`[${elementId}] Connecting source -> gain -> convolver -> destination`);
                     source.connect(gain).connect(convolver).connect(ctx.destination);
                     nodes.convolver = convolver;
                 } else {
                     console.log(`[${elementId}] Connecting source -> gain -> destination`);
                     source.connect(gain).connect(ctx.destination);
                 }
                 audioEffectNodes.set(element, nodes);
                 console.log(`[${elementId}] Nodes created and stored in WeakMap.`);

                 // Mute handling
                 if (ctx.state === 'running') {
                     console.log(`[${elementId}] Setting element.muted = true (create, context running)`);
                     element.muted = true;
                 } else {
                     console.log(`[${elementId}] Context not running (${ctx.state}), adding statechange listener for mute.`);
                     const muteOnRunning = () => {
                         if(ctx.state === 'running') {
                              console.log(`[${elementId}] Context switched to running, setting element.muted = true.`);
                              element.muted = true;
                              // Clean up listener? Not strictly needed with {once: true} but good practice
                              // ctx.removeEventListener('statechange', muteOnRunning);
                         } else if (ctx.state === 'closed') {
                              console.log(`[${elementId}] Context closed before running, removing listener.`);
                              // ctx.removeEventListener('statechange', muteOnRunning);
                         }
                     };
                     ctx.addEventListener('statechange', muteOnRunning, { once: true }); // Use {once: true}
                 }
            } catch (err) {
                 console.error(`[${elementId}] Graph setup error:`, err);
                 if (source) try { source.disconnect(); } catch(e){}
                 if (gain) try { gain.disconnect(); } catch(e){}
                 if (convolver) try { convolver.disconnect(); } catch(e){}
                 audioEffectNodes.delete(element);
                 console.log(`[${elementId}] Cleaned up nodes after error.`);
            }
        }
    }

    // --- Define and Start Mutation Observer (if not already done) ---
    if (!window.mediaObserver) {
         window.mediaObserver = new MutationObserver((mutations) => {
           mutations.forEach((mutation) => {
             mutation.addedNodes.forEach((node) => {
               if (node.nodeType === Node.ELEMENT_NODE) {
                   findAllMediaElements(node).forEach(el => applyOrUpdateEffects(el));
               }
             });
             mutation.removedNodes.forEach(node => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                      const elementsToRemove = findAllMediaElements(node); // Find elements within removed node too
                      if (node.matches && node.matches('audio, video')) elementsToRemove.push(node);
                      elementsToRemove.forEach(el => { if(audioEffectNodes.has(el)) audioEffectNodes.delete(el); });
                  }
             });
           });
         });
         window.mediaObserver.observe(document.body, { childList: true, subtree: true });
         console.log("Mutation Observer started.");
    }

    // --- Initial Scan for Elements ---
    if (!window.processedInitialElements) {
         console.log("Processing existing elements (Shadow DOM)...");
         findAllMediaElements(document.body).forEach(el => applyOrUpdateEffects(el));
         window.processedInitialElements = true;
    }

    console.log("Injected script run finished.");

  } catch (error) { console.error("Error in injected script exec:", error); }
})();