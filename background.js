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

E-waste Generation

Energy Consumption

Material Longevity

Recyclability

Carbon Footprint

Manufacturing Impact

Provide scores for each metric and calculate a final sustainability score based on weighted factors.

Strict Output Rules:

Output Format: JSON

The response should be a JSON object with the following keys:
- "E-waste Generation"
- "Energy Consumption"
- "Material Longevity"
- "Recyclability"
- "Carbon Footprint"
- "Manufacturing Impact"
- "Final Sustainability Score"
- "One-Line Justification"

Each key's value should be the score in the format "X.X/10.0" for scores, and a string for justification.

Example JSON Output:
{
  "E-waste Generation": "X.X/10.0",
  "Energy Consumption": "X.X/10.0",
  "Material Longevity": "X.X/10.0",
  "Recyclability": "X.X/10.0",
  "Carbon Footprint": "X.X/10.0",
  "Manufacturing Impact": "X.X/10.0",
  "Final Sustainability Score": "X.X/10.0",
  "One-Line Justification": "Justification for the final score in one line."
}

Product Data:
- Title: ${request.product.title}
- Price: ${request.product.price}
- ASIN: ${request.product.asin}
- Category: ${request.product.category}
- Features: ${request.product.features.join(", ")}`;

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
        let sustainabilityScoreResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Clean response by removing markdown code blocks
        const cleanedResponse = sustainabilityScoreResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        console.log("Cleaned Response:", cleanedResponse);

        try {
          const scoresJson = JSON.parse(cleanedResponse);
          let visualizationHTML = '<div class="sustainability-grid">';
          let finalScore = 0;
          
          // Process all metrics including final score
          for (const [key, value] of Object.entries(scoresJson)) {
            if (key === "Final Sustainability Score") {
                finalScore = parseFloat(value.split('/')[0]);
                continue; // Skip adding to grid
            }
            if (key === "One-Line Justification") continue;
            
            const score = parseFloat(value.split('/')[0]);
            const percentage = (score / 10) * 100;
            
            let colorClass = 'low';
            if (score >= 4 && score < 7) colorClass = 'medium';
            if (score >= 7) colorClass = 'high';

            visualizationHTML += `
                <div class="metric-card ${colorClass}">
                    <div class="progress-ring">
                        <svg width="80" height="80">
                            <circle class="progress-ring__background" cx="40" cy="40" r="36"/>
                            <circle class="progress-ring__circle ${colorClass}" 
                                    cx="40" cy="40" r="36"
                                    style="stroke-dashoffset: ${226 - (226 * percentage) / 100}"/>
                        </svg>
                        <div class="score">${score.toFixed(1)}</div>
                    </div>
                    <h3>${key}</h3>
                    <div class="score-text">${score.toFixed(1)}/10</div>
                </div>
            `;
          }
          
          // Add final score as first item
          visualizationHTML = `
            <div class="metric-card final-score">
                <div class="progress-ring">
                    <svg width="100" height="100">
                        <circle class="progress-ring__background" cx="50" cy="50" r="45"/>
                        <circle class="progress-ring__circle ${getColorClass(finalScore)}" 
                                cx="50" cy="50" r="45"
                                style="stroke-dashoffset: ${283 - (283 * (finalScore/10*100)) / 100}"/>
                    </svg>
                    <div class="score">${finalScore.toFixed(1)}</div>
                </div>
                <h3>Final Sustainability Score</h3>
            </div>
            ${visualizationHTML}
          `;
          
          visualizationHTML += `</div>
            <div class="justification">
                <strong>Analysis:</strong> ${scoresJson["One-Line Justification"]}
            </div>
          `;
          
          sendResponse({ sustainabilityFactors: visualizationHTML });
          
        } catch (e) {
          console.error("Error parsing response:", e);
          sendResponse({ error: "Failed to parse sustainability scores." });
        }
      })
      .catch(error => {
        console.error("Error:", error);
        sendResponse({ error: "Failed to fetch sustainability score." });
      });
    }); // Close chrome.storage.sync.get

    return true; // Keeps the message channel open for async response
  } // Close if (request.action === "calculateSustainability")
}); // Close chrome.runtime.onMessage.addListener

// Helper function for final score color
function getColorClass(score) {
  if (score < 4) return 'final-low';
  if (score < 7) return 'final-medium';
  return 'final-high';
}