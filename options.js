// Load saved API key when options page opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['apiKey'], (result) => {
        if (result.apiKey) {
            document.getElementById('api-key').value = result.apiKey;
        }
    });
});

// Save API key when save button is clicked
document.getElementById('save-btn').addEventListener('click', () => {
    const apiKey = document.getElementById('api-key').value.trim();
    const statusDiv = document.getElementById('status');

    if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
    }

    // Save to chrome.storage.sync
    chrome.storage.sync.set({ apiKey: apiKey }, () => {
        if (chrome.runtime.lastError) {
            showStatus('Error saving API key: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showStatus('API key saved successfully!', 'success');
            
            // Test the API key
            testApiKey(apiKey);
        }
    });
});

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    // Hide status after 3 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

async function testApiKey(apiKey) {
    const testEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const testPrompt = {
        contents: [{
            parts: [{ text: "Hello, this is a test message." }]
        }]
    };

    try {
        const response = await fetch(testEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPrompt)
        });

        if (!response.ok) {
            const errorData = await response.json();
            showStatus(`API Key test failed: ${errorData.error?.message || 'Unknown error'}`, 'error');
            return;
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            showStatus('API Key verified successfully!', 'success');
        } else {
            showStatus('API Key test failed: Unexpected response format', 'error');
        }
    } catch (error) {
        showStatus(`API Key test failed: ${error.message}`, 'error');
    }
} 