// content.js

// Listen for changes in localStorage
window.addEventListener('load', () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        chrome.runtime.sendMessage({ type: 'loginSuccess', token: token });
    }
});

// Create a MutationObserver to watch for changes in localStorage
const observer = new MutationObserver(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
        chrome.runtime.sendMessage({ type: 'loginSuccess', token: token });
    }
});

// Observe localStorage changes
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});