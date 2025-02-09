chrome.runtime.onInstalled.addListener(() => {
  console.log('Amazon Sustainability Calculator Extension Installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "calculateSustainability") {
      chrome.storage.sync.get(['apiKey'], (result) => {
          const apiKey = result.apiKey;
          if (!apiKey) {
              sendResponse({ error: 'API Key not set. Go to options and add your Gemini API key.' });
              return;
          }

          const prompt = `Evaluate the environmental impact of the following electronic product based on its description, category, and specifications. Predict sustainability based on key factors such as:

E-waste generation
Energy consumption
Material longevity
Recyclability

Strict Output Rules:
Sustainability Score (0.0 - 10.0):
Provide a single numeric value between 0.0 and 10.0 (up to 1 decimal places).
One-Line Justification:
Give a single concise sentence explaining the score based on environmental factors.
No Extra Text:
Do not add disclaimers, generic sustainability advice, or additional commentary.
Strict Output Format:


Sustainability Score: X.X/10.0 Reason: [One-line explanation]

Product Data:
- Title: ${request.product.title}
- Price: ${request.product.price}
- ASIN: ${request.product.asin}
- Category: ${request.product.category}
- Features: ${request.product.features.join(", ")}
`;

          const geminiApiKey = apiKey;
          const geminiApiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

          fetch(geminiApiEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  contents: [{
                      parts: [{ text: prompt }]
                  }]
              })
          })
          .then(response => response.json())
          .then(data => {
              console.log("Gemini API Response Data:", data);
              const sustainabilityScore = data.candidates?.[0]?.content?.parts?.[0]?.text || "Not Available";
              sendResponse({ sustainabilityScore });
          })
          .catch(error => {
              console.error("Error:", error);
              sendResponse({ error: "Failed to fetch sustainability score." });
          });
      });

      return true; // Keeps the message channel open for async response
  }
});