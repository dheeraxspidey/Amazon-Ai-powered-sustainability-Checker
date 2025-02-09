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
    const sustainabilityScore = document.getElementById('sustainability-score');
    sustainabilityScore.textContent = 'Refreshing product data...';
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
        }, (results) => {
            console.log('Product data refreshed');
            updateProductDisplay();
        });
    });
}

function fetchSustainabilityScore() {
    const sustainabilityScore = document.getElementById('sustainability-score');
    sustainabilityScore.textContent = 'Calculating sustainability score...';

    chrome.storage.local.get("product", ({ product }) => {
        if (product) {
            chrome.runtime.sendMessage(
                { action: "calculateSustainability", product: product },
                (response) => {
                    if (response && response.sustainabilityScore) {
                        sustainabilityScore.textContent = response.sustainabilityScore;
                    } else if (response && response.error) {
                        sustainabilityScore.textContent = response.error;
                    } else {
                        sustainabilityScore.textContent = 'Score not available';
                    }
                }
            );
        } else {
            sustainabilityScore.textContent = 'No product data available. Please refresh product data first.';
        }
    });
}