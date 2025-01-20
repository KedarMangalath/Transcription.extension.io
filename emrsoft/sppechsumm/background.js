// Set initial state when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ hasAudioPermission: false, authToken: null });
});

// Listen for messages from the popup or content scripts
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

        // Get the authentication token from storage
        chrome.storage.local.get(['authToken'], (result) => {
            const token = result.authToken;

            if (!token) {
                console.error('No authentication token found. Please log in.');
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'authError', error: 'No authentication token found. Please log in.' });
                });
                return;
            }

            // Create FormData to send the audio file to Django
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');

            // Send the audio file to Django backend for processing
            fetch('http://localhost:8000/process-audio/', {  // Remove 'api/' from the URL
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json',
                    Authorization: `Token ${token}`, // Include the token
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
        });
    }

    if (request.type === 'fetchHistory') {
        // Fetch history from Django backend
        chrome.storage.local.get(['authToken'], (result) => {
            const token = result.authToken;

            if (!token) {
                console.error('No authentication token found. Please log in.');
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'authError', error: 'No authentication token found. Please log in.' });
                });
                return;
            }

            fetch('http://localhost:8000/get-history/', {  // Remove 'api/' from the URL
                headers: {
                    Authorization: `Token ${token}`, // Include the token
                },
            })
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
        });
    }

    if (request.type === 'logout') {
        // Handle logout by removing the authentication token
        chrome.storage.local.remove('authToken', () => {
            console.log('User logged out. Token removed.');
            // Optionally, send a message to the popup to update the UI
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'logoutSuccess' });
            });
        });
    }

    if (request.type === 'loginSuccess') {
        // Handle successful login by storing the token and enabling extension features
        const token = request.token;
        chrome.storage.local.set({ authToken: token }, () => {
            console.log('Token saved:', token);
            // Notify the popup to update the UI
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'loginSuccess' });
            });
        });
    }
});

// Listen for tab updates to check if the user has logged in
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.includes('http://localhost:8000/dashboard/')) {
        // Check if the user has logged in by checking for the JWT token in localStorage
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return localStorage.getItem('authToken');
            },
        }, (result) => {
            if (result && result[0] && result[0].result) {
                const token = result[0].result;
                // Send the token to the background script
                chrome.runtime.sendMessage({ type: 'loginSuccess', token: token });
            }
        });
    }
});