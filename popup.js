document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded");
    
    // Initialize display with stored data
    updateProductDisplay();
    
    // Setup refresh button
    const refreshButton = document.getElementById('refresh-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshProductData);
        console.log("Refresh button listener added");
    } else {
        console.error("Refresh button not found");
    }

    // Setup score button
    const scoreButton = document.getElementById('score-btn');
    if (scoreButton) {
        scoreButton.addEventListener('click', fetchSustainabilityScore);
        console.log("Score button listener added");
    } else {
        console.error("Score button not found");
    }

    // Listen for storage updates
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.product) {
            updateProductDisplay();
        }
    });
});

function updateProductDisplay() {
    chrome.storage.local.get("product", ({ product }) => {
        const productInfo = document.getElementById("product-info");
        const featuresList = document.getElementById("features-list");
        const detailsList = document.getElementById("details-list");
        const sustainabilityScore = document.getElementById("sustainability-score");

        if (product) {
            // Basic product info
            productInfo.innerHTML = `
                <strong>${product.title}</strong><br>
                <span class="brand">${product.brand}</span><br>
                <span class="category">${product.category}</span>
            `;

            // Features list
            const features = Array.isArray(product.features) ? product.features : [];
            featuresList.innerHTML = features
                .map(feature => `<li>${feature}</li>`)
                .join('');

            // Additional details
            const additionalDetails = Array.isArray(product.additionalDetails) ? product.additionalDetails : [];
            detailsList.innerHTML = additionalDetails
                .map(detail => `<li>${detail}</li>`)
                .join('');

            sustainabilityScore.textContent = 'Click "Get Score" to calculate sustainability';
        } else {
            productInfo.innerHTML = '<p class="error">No product data available</p>';
            featuresList.innerHTML = '';
            detailsList.innerHTML = '';
            sustainabilityScore.textContent = 'Please refresh product data first';
        }
    });
}

function refreshProductData() {
    console.log("Refreshing product data...");
    
    // Clear existing displays
    const factorsDisplay = document.getElementById('factorsDisplay');
    const errorDisplay = document.getElementById('errorDisplay');
    
    if (factorsDisplay) factorsDisplay.innerHTML = '<div class="loading">Refreshing data...</div>';
    if (errorDisplay) errorDisplay.textContent = '';

    // Get fresh product data from content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "forceRefresh"}, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Refresh error:", chrome.runtime.lastError);
                if (errorDisplay) errorDisplay.textContent = 'Error refreshing data. Try reloading the page.';
                return;
            }
            
            if (response?.success) {
                console.log("Refresh successful");
                updateProductDisplay();
            } else {
                console.log("Refresh failed");
                if (errorDisplay) errorDisplay.textContent = 'Failed to refresh product data';
            }
        });
    });
}

function fetchSustainabilityScore() {
    const factorsDisplay = document.getElementById('factorsDisplay');
    const sustainabilityScore = document.getElementById('sustainability-score');
    factorsDisplay.innerHTML = '<div class="loading">Calculating sustainability score...</div>';

    chrome.storage.local.get("product", ({ product }) => {
        if (product) {
            chrome.runtime.sendMessage(
                { action: "calculateSustainability", product: product },
                (response) => {
                    if (response?.sustainabilityFactors) {
                        factorsDisplay.innerHTML = response.sustainabilityFactors;
                        sustainabilityScore.textContent = ''; // Clear the old text display
                    } else if (response?.error) {
                        factorsDisplay.innerHTML = `<div class="error">${response.error}</div>`;
                    }
                }
            );
        } else {
            factorsDisplay.innerHTML = '<div class="error">No product data available</div>';
        }
    });
}