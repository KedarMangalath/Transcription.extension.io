chrome.runtime.onInstalled.addListener(() => {
    // Set initial state
    chrome.storage.local.set({ hasAudioPermission: false });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'requestAudioPermission') {
        // Handle audio permission request
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'requestAudioAccess' });
        });
    }

    if (request.type === 'processAudio') {
        // Forward the audio processing request to Django backend
        const audioBlob = request.audioBlob;

        // Create FormData to send the audio file to Django
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        // Send the audio file to Django backend for processing
        fetch('http://localhost:8000/api/process-audio/', {
            method: 'POST',
            body: formData,
            headers: {
                Accept: 'application/json',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then((data) => {
                // Send the processed data back to the popup
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'audioProcessed', data });
                });
            })
            .catch((error) => {
                console.error('Error processing audio:', error);
                // Send the error back to the popup
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'audioProcessingError', error: error.message });
                });
            });
    }

    if (request.type === 'fetchHistory') {
        // Fetch history from Django backend
        fetch('http://localhost:8000/api/get-history/')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then((data) => {
                // Send the history data back to the popup
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'historyFetched', data });
                });
            })
            .catch((error) => {
                console.error('Error fetching history:', error);
                // Send the error back to the popup
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'historyFetchError', error: error.message });
                });
            });
    }
});