// --- DYNAMIC DATA SETUP ---
let CURRENT_PLAN_RULES = null;
const API_KEY = ""; // If you want to use models other than gemini-2.5-flash-preview-05-20, provide an API key here. Otherwise, leave this as-is.
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// Global variable to store the successfully fetched state rate, or null if fetch failed.
let FETCHED_STATE_RATE_PERCENT = null; 

// Fallback limits for 401k contributions (must match Dashboard defaults)
const FALLBACK_LIMITS_KEYS = {
    deferral_402g: 23000, 
    catchup: 7500,
    comp_max: 345000 
};

// JSON Schema for structured data extraction
const TAX_SCHEMA = {
    type: "OBJECT",
    properties: {
        federalMarginalRate: { type: "NUMBER", description: "The current Federal marginal income tax rate (as a percentage, e.g., 24 for 24%)." },
        stateMarginalRate: { type: "NUMBER", description: "The current State marginal income tax rate (as a percentage, e.g., 6.3 for 6.3%). Use 0 if the state has no income tax." },
        summaryText: { type: "STRING", description: "A one-paragraph summary of the tax rates and brackets found for the specified income and filing status." }
    },
    required: ["federalMarginalRate", "stateMarginalRate", "summaryText"]
};

// List of US states for the dropdown
const US_STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut", 
    "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", 
    "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", 
    "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", 
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", 
    "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", 
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington", 
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
};

// --- Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper function to safely retrieve a limit
function getLimit(key) {
    let value = FALLBACK_LIMITS_KEYS[key]; // Start with fallback value

    // 1. Try to get value from dynamically loaded rules
    if (CURRENT_PLAN_RULES && CURRENT_PLAN_RULES.LIMITS && CURRENT_PLAN_RULES.LIMITS[key] !== undefined) {
        value = CURRENT_PLAN_RULES.LIMITS[key];
    }
    
    // 2. Final check: Ensure the value is a valid number before returning
    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }
    
    // 3. If invalid, return the fallback (must be defined in FALLBACK_LIMITS_KEYS)
    return FALLBACK_LIMITS_KEYS[key]; 
}

// Function to display fallback limits explicitly
function displayFallbackLimits() {
    const displayDiv = document.getElementById('current-limits-display');
    const deferralMaxFallback = getLimit('deferral_402g');
    const catchupMaxFallback = getLimit('catchup');
    
    displayDiv.classList.remove('result-success', 'result-info');
    displayDiv.classList.add('result-warning');
    
    displayDiv.innerHTML = `
        <p style="font-weight: bold; color: #cc5200;">Warning: Using Internal Fallback Limits.</p>
        <p class="hint-text" style="margin-bottom: 10px;">
            The central dashboard failed to provide current IRS limits. Calculations will use:
        </p>
        <div class="metric-row">
            <span class="metric-label">Employee Deferral Limit (402(g)):</span>
            <span class="metric-value">${formatCurrency(deferralMaxFallback)}</span>
        </div>
        <div class="metric-row" style="border-bottom: none;">
            <span class="metric-label">Catch-up Contribution Limit:</span>
            <span class="metric-value">${formatCurrency(catchupMaxFallback)} (Age 50+)</span>
        </div>
    `;
}

// Populate the state dropdown with US states
function populateStates() {
    const select = document.getElementById('state');
    select.innerHTML = '<option value="">Select State</option>'; // Default option
    
    for (const code in US_STATES) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = US_STATES[code];
        select.appendChild(option);
    }
}

// Handles incoming plan configuration data (401k limits)
function handleConfigData(data) {
    // Check if the received data is valid and contains limits
    if (data && data.LIMITS && Object.keys(data.LIMITS).length > 0) {
        CURRENT_PLAN_RULES = data;
        const displayDiv = document.getElementById('current-limits-display');
        
        const deferralMax = getLimit('deferral_402g');
        const catchupMax = getLimit('catchup');

        displayDiv.classList.remove('result-warning', 'result-info');
        displayDiv.classList.add('result-success');

        displayDiv.innerHTML = `
            <p style="font-weight: bold;">Current IRS Limits Loaded Successfully:</p>
            <div class="metric-row">
                <span class="metric-label">Employee Deferral Limit (402(g)):</span>
                <span class="metric-value">${formatCurrency(deferralMax)}</span>
            </div>
            <div class="metric-row" style="border-bottom: none;">
                <span class="metric-label">Catch-up Contribution Limit:</span>
                <span class="metric-value">${formatCurrency(catchupMax)} (Age 50+)</span>
            </div>
        `;
    } else {
        // If data is invalid or empty, fall back and display the warning.
        displayFallbackLimits();
    }
}

// Function to send a message to the parent to reload config data
function requestConfigReload() {
    const displayDiv = document.getElementById('current-limits-display');
    
    // 1. Give immediate feedback that a reload is attempting
    displayDiv.classList.remove('result-success', 'result-warning');
    displayDiv.classList.add('result-info');
    displayDiv.innerHTML = '<p>Attempting to reload limits from dashboard...</p>';
    
    // 2. Send the message to the parent
    if (window.parent) {
        window.parent.postMessage({ type: 'REQUEST_CONFIG_RELOAD' }, '*');
    }

    // 3. Set a timeout to display the fallback if no message is received within 3 seconds
    setTimeout(() => {
        if (!CURRENT_PLAN_RULES) {
            displayFallbackLimits();
        }
    }, 3000); // 3-second timeout
}

// Listen for messages from the parent window (dashboard)
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'CONFIG_DATA') {
        handleConfigData(event.data.config);
    }
});


// Main calculation function
async function calculateMax() {
    // Clear previous results and errors
    document.getElementById('contributionResults').innerHTML = '<p>Calculating...</p>';
    document.getElementById('savingsAnalysisResults').innerHTML = '<p>Analyzing Tax Savings...</p>';
    document.getElementById('taxBracketResults').innerHTML = '<p>Fetching tax data...</p>';
    document.getElementById('tax-sources').innerHTML = '';
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';

    // 1. Show Calculation in Progress (AWAITING FEEDBACK)
    const progressIndicator = document.getElementById('calculation-in-progress');
    const calculateButton = document.getElementById('calculate-btn');
    calculateButton.disabled = true;
    progressIndicator.style.display = 'block';


    // 2. Get Inputs and Validate
    const age = parseInt(document.getElementById('age').value);
    const annualIncome = parseFloat(document.getElementById('annualIncome').value);
    const filingStatus = document.getElementById('filingStatus').value;
    const stateCode = document.getElementById('state').value;
    const contributionsMade = parseFloat(document.getElementById('contributionsMade').value);
    
    // NEW: Get both manual inputs
    const manualStateRateInput = document.getElementById('manualStateRate').value;
    const manualFederalRateInput = document.getElementById('manualFederalRate').value;
    const manualStateRate = parseFloat(manualStateRateInput);
    const manualFederalRate = parseFloat(manualFederalRateInput);

    if (isNaN(age) || age < 18 || isNaN(annualIncome) || annualIncome < 0 || annualIncome === 0 || stateCode === "" || isNaN(contributionsMade) || contributionsMade < 0) {
        errorMessage.textContent = 'Please enter valid, positive values for Age, Annual Income, Contributions Made, and select a State.';
        errorMessage.style.display = 'block';
        
        calculateButton.disabled = false;
        progressIndicator.style.display = 'none';
        return;
    }

    // --- Core 401(k) Limit Calculation ---
    const deferralMax = getLimit('deferral_402g');
    const catchupLimit = getLimit('catchup');
    const catchUpMax = age >= 50 ? catchupLimit : 0;
    
    const statutoryLimit = deferralMax + catchUpMax;
    const finalMaxContribution = Math.min(statutoryLimit, annualIncome);
    const remainingContributionRoom = Math.max(0, finalMaxContribution - contributionsMade);


    // --- STEP 2.5: Tax Rate Lookup (API Call) ---
    document.getElementById('tax-loading-indicator').style.display = 'block';
    
    let taxData = null;
    try {
        // Await the API call while the progress indicator is visible
        taxData = await fetchTaxRates(annualIncome, filingStatus, stateCode);
    } catch (error) {
        console.error("Tax API call failed:", error);
    } finally {
        // Hide tax-specific loading indicator
        document.getElementById('tax-loading-indicator').style.display = 'none';
        // Hide general calculation progress indicator and re-enable button (CRITICAL FOR AWAITING FEEDBACK)
        progressIndicator.style.display = 'none';
        calculateButton.disabled = false;
    }


    // --- STEP 3: Display Limits and Progress ---
    displayContributionLimits(deferralMax, catchUpMax, finalMaxContribution, remainingContributionRoom, contributionsMade);
    updateProgressVisualization(contributionsMade, finalMaxContribution, remainingContributionRoom);


    // --- STEP 4: Determine Effective Tax Rates (Auto or Manual) ---
    let effectiveFederalRate = 0;
    let effectiveStateRate = 0;
    let rateSource = 'N/A';
    let canAnalyzeSavings = false;
    const manualGroup = document.getElementById('manual-tax-rate-group');

    if (taxData && taxData.rates) {
        // Case A: Successful API Fetch
        effectiveFederalRate = taxData.rates.federalMarginalRate;
        effectiveStateRate = taxData.rates.stateMarginalRate;
        rateSource = 'Automated';
        FETCHED_STATE_RATE_PERCENT = effectiveStateRate;
        canAnalyzeSavings = true;
        manualGroup.classList.add('hidden'); // Hide manual input

    } else if (manualFederalRateInput && manualStateRateInput && !isNaN(manualFederalRate) && !isNaN(manualStateRate)) {
        // Case B: API failed, but BOTH manual rates have been entered and are valid numbers
        effectiveFederalRate = manualFederalRate;
        effectiveStateRate = manualStateRate;
        rateSource = 'Manual Override';
        FETCHED_STATE_RATE_PERCENT = 0; 
        canAnalyzeSavings = true;
        manualGroup.classList.remove('hidden'); // Keep manual input visible
    } else {
        // Case C: No successful fetch, and manual rates are incomplete/invalid.
        FETCHED_STATE_RATE_PERCENT = null;
        canAnalyzeSavings = false;
        manualGroup.classList.remove('hidden'); // Reveal manual input
    }
    
    // Display the Tax Summary and Source Card
    displayTaxRatesAndSources(taxData, stateCode, annualIncome, filingStatus, effectiveFederalRate, effectiveStateRate, rateSource);

    // --- STEP 5: Analyze Savings (Only if we have rates) ---
    if (canAnalyzeSavings) {
        analyzeTaxSavings(remainingContributionRoom, effectiveFederalRate, effectiveStateRate, rateSource);
    } else {
        document.getElementById('savingsAnalysisResults').innerHTML = `
            <p style="color: #cc5200; font-weight: 600;">
                Tax Analysis Blocked: Automated tax rate fetch failed. Please enter **both** Federal and State Marginal Tax Rates in the override section above to calculate tax savings.
            </p>`;
    }

    // --- STEP 6: Auto-Scroll to Results
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}


// --- FUNCTION: Update Contribution Progress Visualization ---
function updateProgressVisualization(contributed, finalMax, remaining) {
    const totalMax = finalMax;
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarText = document.getElementById('progress-bar-text');
    const progressMade = document.getElementById('progress-made');
    const progressRemaining = document.getElementById('progress-remaining');
    const progressTotalMax = document.getElementById('progress-total-max');

    if (totalMax === 0) {
        progressBarFill.style.width = '0%';
        progressBarFill.style.backgroundColor = '#e9ecef';
        progressBarText.textContent = '0% Completed ($0.00 Remaining)';
        progressMade.textContent = formatCurrency(contributed);
        progressRemaining.textContent = formatCurrency(remaining);
        progressTotalMax.textContent = formatCurrency(totalMax);
        return;
    }
    
    const percentage = Math.min(100, (contributed / totalMax) * 100);
    progressBarFill.style.width = `${percentage}%`;
    
    let barColor = '#28a745'; 
    let statusText = `${percentage.toFixed(1)}% Completed (${formatCurrency(remaining)} Remaining)`;

    if (percentage === 100) {
        barColor = '#28aa45'; 
        statusText = `100% Completed (Limit Reached)`;
    } else if (contributed > totalMax) {
        barColor = '#dc3545'; // Red for over-contribution warning
        statusText = `>100% Completed (Over Limit by ${formatCurrency(contributed - totalMax)})`;
    } else if (percentage > 75) {
        barColor = '#ffc107'; 
    }
    
    progressBarFill.style.backgroundColor = barColor;
    progressBarText.textContent = statusText;
    progressMade.textContent = formatCurrency(contributed);
    progressRemaining.textContent = formatCurrency(remaining);
    progressTotalMax.textContent = formatCurrency(totalMax);
}


// --- FUNCTION: Display Main Contribution Limits and Summary ---
function displayContributionLimits(deferralMax, catchUpMax, finalMaxContribution, remainingContributionRoom, contributionsMade) {
    const isOverLimit = contributionsMade > finalMaxContribution;
    const isRoomRemaining = remainingContributionRoom > 0;

    const resultsHtml = `
        <div class="result-box ${isOverLimit ? 'result-warning' : (isRoomRemaining ? 'result-success' : 'result-info')}">
            <h3 class="final-result">Remaining Maximum Contribution: 
                <span style="float: right;">${formatCurrency(remainingContributionRoom)}</span>
            </h3>
        </div>
        
        ${isOverLimit ? `
            <p class="fail-status" style="font-weight: bold; margin-top: 10px;">
                Warning: Your contributions to date (${formatCurrency(contributionsMade)}) exceed your calculated final max limit of ${formatCurrency(finalMaxContribution)}.
            </p>
        ` : ''}

        <div class="metric-row">
            <span class="metric-label">Employee Max Deferral Limit (402(g))</span>
            <span class="metric-value">${formatCurrency(deferralMax)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Catch-up Contribution Limit (Age 50+)</span>
            <span class="metric-value">${formatCurrency(catchUpMax)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Statutory Total Max Limit (402(g) + Catch-up)</span>
            <span class="metric-value">${formatCurrency(deferralMax + catchUpMax)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Your Annual Income Limit (100% of Compensation)</span>
            <span class="metric-value">${formatCurrency(document.getElementById('annualIncome').value)}</span>
        </div>
        <div class="metric-row" style="font-weight: bold;">
            <span class="metric-label">Calculated Final Max Limit (Lesser of above)</span>
            <span class="metric-value">${formatCurrency(finalMaxContribution)}</span>
        </div>
        <div class="metric-row" style="border-bottom: none;">
            <span class="metric-label">Contributions Already Made This Year</span>
            <span class="metric-value">${formatCurrency(contributionsMade)}</span>
        </div>
    `;

    document.getElementById('contributionResults').innerHTML = resultsHtml;
}


// --- FUNCTION: Fetch Tax Rates using Gemini API with Structured Output and Backoff ---
async function fetchTaxRates(annualIncome, filingStatus, stateCode) {
    const userPrompt = `Find the current Federal and ${stateCode} marginal income tax rates for an annual taxable income of $${annualIncome} filing as ${filingStatus}. Provide a brief, single-paragraph summary of the tax rates and brackets found.`;

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: "Act as a tax accountant. Find the current marginal tax rates for the provided income, filing status, and state. Use the specified JSON schema for the response." }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: TAX_SCHEMA
        }
    };
    
    // Implement Exponential Backoff
    const maxRetries = 3;
    const baseDelay = 1000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, baseDelay * (2 ** attempt) + Math.random() * 1000));
                    continue; // Retry
                }
                throw new Error(`API returned status ${response.status}`);
            }

            const result = await response.json();
            const candidate = result.candidates?.[0];
            
            if (candidate && candidate.content?.parts?.[0]?.text) {
                const jsonText = candidate.content.parts[0].text;
                const rates = JSON.parse(jsonText);

                let sources = [];
                const groundingMetadata = candidate.groundingMetadata;
                if (groundingMetadata && groundingMetadata.groundingAttributions) {
                    sources = groundingMetadata.groundingAttributions
                        .map(attribution => ({ uri: attribution.web?.uri, title: attribution.web?.title }))
                        .filter(source => source.uri && source.title);
                }
                
                return { rates, sources };

            } else {
                throw new Error("API response structure is invalid or content is missing.");
            }
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error);
            if (attempt === maxRetries - 1) {
                throw error; 
            }
            await new Promise(resolve => setTimeout(resolve, baseDelay * (2 ** attempt) + Math.random() * 1000));
        }
    }
    return null; 
}


// --- FUNCTION: Analyze Tax Savings ---
function analyzeTaxSavings(remainingContributionRoom, federalRate, stateRate, source) {
    const savingsDiv = document.getElementById('savingsAnalysisResults');
    
    const totalMarginalRate = federalRate + stateRate;
    const potentialTaxSavings = remainingContributionRoom * (totalMarginalRate / 100);
    
    savingsDiv.innerHTML = `
        <div class="result-box result-info">
            <h3 style="font-size: 1.2em; color: #004085; margin-bottom: 10px;">Potential Tax Reduction</h3>
            <div class="metric-row" style="font-size: 1.5em; font-weight: bold; border: none;">
                <span class="metric-label">Savings on Remaining Contribution:</span>
                <span class="metric-value">${formatCurrency(potentialTaxSavings)}</span>
            </div>
            <p class="hint-text" style="text-align: center; margin-top: 15px;">
                This represents the estimated tax reduction for contributing the full remaining room (${formatCurrency(remainingContributionRoom)}) at your marginal tax rate.
            </p>
        </div>
        <div class="metric-row">
            <span class="metric-label">Estimated Federal Marginal Rate:</span>
            <span class="metric-value">${federalRate.toFixed(2)}%</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Estimated State Marginal Rate (${source}):</span>
            <span class="metric-value">${stateRate.toFixed(2)}%</span>
        </div>
        <div class="metric-row" style="font-weight: bold;">
            <span class="metric-label">Total Effective Marginal Rate:</span>
            <span class="metric-value">${totalMarginalRate.toFixed(2)}%</span>
        </div>
    `;
}

// --- Updated Tax Rate Display Function ---
function displayTaxRatesAndSources(taxData, stateCode, annualIncome, filingStatus, federalRate, stateRate, source) {
    const taxBracketResultsDiv = document.getElementById('taxBracketResults');
    const taxSourcesDiv = document.getElementById('tax-sources');
    const manualGroup = document.getElementById('manual-tax-rate-group');
    
    // Clear previous results
    taxBracketResultsDiv.innerHTML = '';
    taxSourcesDiv.innerHTML = '';

    if (taxData && taxData.rates) {
        // Case A: Successful API Fetch
        const apiFederalRate = taxData.rates.federalMarginalRate;
        const apiStateRate = taxData.rates.stateMarginalRate;
        const summary = taxData.rates.summaryText;

        manualGroup.classList.add('hidden');

        taxBracketResultsDiv.innerHTML = `
            <ul class="rate-list">
                <li>
                    <span class="rate-label">Federal Marginal Rate (Automated):</span>
                    <span class="rate-value">${apiFederalRate.toFixed(2)}%</span>
                </li>
                <li>
                    <span class="rate-label">${stateCode} Marginal Rate (Automated):</span>
                    <span class="rate-value">${apiStateRate.toFixed(2)}%</span>
                </li>
            </ul>
            <p style="margin-top: 15px; font-style: italic; font-size: 0.9em;">
                Summary for $${annualIncome.toLocaleString()} (${filingStatus}): ${summary}
            </p>
        `;

        if (taxData.sources && taxData.sources.length > 0) {
            const sourcesHtml = taxData.sources.map(source => 
                `<li><a href="${source.uri}" target="_blank" rel="noopener noreferrer" title="${source.title}">${source.title || 'Source Link'}</a></li>`
            ).join('');
            taxSourcesDiv.innerHTML = `
                <p style="font-weight: 600;">Grounding Sources:</p>
                <ul class="source-list">${sourcesHtml}</ul>
            `;
        } else {
             taxSourcesDiv.innerHTML = `<p class="hint-text">No external grounding sources were available for this query.</p>`;
        }

    } else if (source === 'Manual Override') {
        // Case B: API failed, and Manual Override was used (rates passed from calculateMax)
        
        manualGroup.classList.remove('hidden');

        taxBracketResultsDiv.innerHTML = `
            <ul class="rate-list">
                <li>
                    <span class="rate-label">Federal Marginal Rate (Manual):</span>
                    <span class="rate-value">${federalRate.toFixed(2)}%</span>
                </li>
                <li>
                    <span class="rate-label">${stateCode} Marginal Rate (Manual):</span>
                    <span class="rate-value">${stateRate.toFixed(2)}%</span>
                </li>
            </ul>
            <p style="margin-top: 15px; font-weight: bold; color: #cc5200;">
                Calculation using **manual** rates: Federal rate set to ${federalRate.toFixed(2)}% and State rate set to ${stateRate.toFixed(2)}%.
            </p>
        `;
        taxSourcesDiv.innerHTML = `
            <p class="hint-text" style="color: #dc3545; font-weight: bold;">
                WARNING: Tax rates are manually entered due to API failure. Please verify these rates against official government sources.
            </p>
        `;
    } else {
        // Case C: API failed and manual override inputs are incomplete/invalid.
        
        manualGroup.classList.remove('hidden'); // Reveal manual input
        
        taxBracketResultsDiv.innerHTML = `
            <p class="hint-text">
                Tax rates could not be retrieved due to an API error. Please enter **both** the Federal and State Marginal Tax Rates manually in the override section above.
            </p>
        `;
        taxSourcesDiv.innerHTML = `
             <p class="hint-text" style="color: #dc3545;">API Failure: Could not retrieve tax bracket data for analysis.</p>
        `;
    }
}


// --- INITIAL DYNAMIC SETUP ---
window.addEventListener('DOMContentLoaded', function() {
    // Populate the dropdown on load
    populateStates();
    
    // 1. Request config data when the calculator iframe is loaded
    requestConfigReload();
    
    // 2. Set an initial timeout to ensure fallback limits are displayed if the message isn't received quickly
    setTimeout(() => {
        if (!CURRENT_PLAN_RULES) {
            displayFallbackLimits();
        }
    }, 1000); 
});
