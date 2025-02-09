const asinMatch = window.location.href.match(/\/dp\/([A-Z0-9]{10})/);
const asin = asinMatch ? asinMatch[1] : null;

if (asin) {
    chrome.runtime.sendMessage(
        { action: "calculateSustainability", asin: asin },
        (response) => {
            console.log(`Sustainability Score: ${response.sustainabilityScore}`);
        }
    );
}

function getProductDetails() {
    console.log("Attempting to extract product details...");

    // Only run on product pages
    if (!window.location.pathname.includes('/dp/') && !window.location.pathname.includes('/gp/product/')) {
        console.log("Not a product page, skipping extraction");
        return;
    }

    // Get product title
    let title = document.getElementById("productTitle")?.innerText.trim() || "Unknown Product";
    console.log("Title found:", title);
    
    // Get brand from product overview table
    let brand = document.querySelector('.po-brand .a-span9')?.innerText.trim() 
             || document.querySelector('#bylineInfo')?.innerText.trim()
             || "Unknown Brand";
    console.log("Brand found:", brand);
    
    // Get category from breadcrumb
    let category = "";
    const breadcrumb = document.querySelector("#wayfinding-breadcrumbs_feature_div");
    if (breadcrumb) {
        const categories = Array.from(breadcrumb.querySelectorAll(".a-link-normal"));
        category = categories[categories.length - 1]?.innerText.trim() || "";
    }
    console.log("Category found:", category);

    // Try to expand the "Show More" section first
    const showMoreButton = document.querySelector('.a-expander-prompt');
    if (showMoreButton && showMoreButton.textContent.includes('Show More')) {
        showMoreButton.click();
    }

    // Wait a brief moment for expansion animation
    setTimeout(() => {
        // Extract all features including main and expanded sections
        let features = [];
        
        // Get main features
        const mainFeatures = document.querySelectorAll("#feature-bullets .a-list-item");
        mainFeatures.forEach(item => {
            const text = item.innerText.trim();
            if (text) features.push(text);
        });

        // Get expanded features
        const expandedFeatures = document.querySelectorAll(".a-expander-content .a-list-item");
        expandedFeatures.forEach(item => {
            const text = item.innerText.trim();
            if (text) features.push(text);
        });

        console.log("All features found:", features);

        // Get any additional technical details
        let additionalDetails = [];
        const techSpecs = document.querySelectorAll("#productDetails_techSpec_section_1 tr, #productDetails_techSpec_section_2 tr");
        techSpecs.forEach(row => {
            const label = row.querySelector("th")?.innerText.trim();
            const value = row.querySelector("td")?.innerText.trim();
            if (label && value) {
                additionalDetails.push(`${label}: ${value}`);
            }
        });

        console.log("Additional details found:", additionalDetails);

        // Store the collected data
        const productData = {
            title,
            brand,
            category,
            features,
            additionalDetails,
            asin: document.querySelector("#ASIN")?.value || window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || "Unknown ASIN"
        };

        console.log("Storing product data:", productData);
        
        chrome.storage.local.set({ product: productData }, () => {
            console.log("Data saved to storage");
        });

        chrome.runtime.sendMessage(
            { action: "calculateSustainability", product: productData },
            (response) => {
                console.log(`Sustainability Score: ${response.sustainabilityScore}`);
            }
        );
    }, 500); // Wait 500ms for expansion animation
}

// Initialize observers and event listeners
let observers = [];
let isExtensionValid = true;

// Add message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "pageLoaded" || message.action === "forceRefresh") {
        console.log('Received refresh message');
        getProductDetails();
    }
});

// Run when DOM is ready
if (document) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', getProductDetails);
    } else {
        getProductDetails();
    }
}

// Run when URL changes (for single-page navigation)
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('URL changed, re-running extraction');
        getProductDetails();
    }
});
if (document) {
    urlObserver.observe(document, {subtree: true, childList: true});
    observers.push(urlObserver);
}