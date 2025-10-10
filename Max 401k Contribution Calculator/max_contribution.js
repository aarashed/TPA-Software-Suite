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

// List of US States and Territories for the dropdown
const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' }, 
    { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' }, { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, 
    { code: 'DC', name: 'Dist. of Columbia' }, { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, 
    { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' }, 
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, 
    { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, 
    { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' }, 
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, 
    { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, 
    { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' }, 
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, 
    { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, 
    { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];


// Helper function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 0
   }).format(value);
}

// Helper function to safely retrieve a limit
function getLimit(key) {
    if (CURRENT_PLAN_RULES && CURRENT_PLAN_RULES.LIMITS && CURRENT_PLAN_RULES.LIMITS[key] !== undefined) {
        return CURRENT_PLAN_RULES.LIMITS[key];
    }
    // Return the default fallback if the entire rules object is missing or the key is missing
    return FALLBACK_LIMITS_KEYS[key];
}


// --- UI POPULATION FUNCTIONS ---

/**
 * Populates the state dropdown with US states.
 */
function populateStates() {
    const select = document.getElementById('state');
    select.innerHTML = '<option value="" disabled selected>-- Select State --</option>';
    US_STATES.forEach(state => {
        const option = document.createElement('option');
        option.value = state.code;
        option.textContent = state.name;
        select.appendChild(option);
    });
    // Set a default state for immediate testing/use
    select.value = 'CA'; 
}


// --- API FUNCTIONS FOR DYNAMIC DATA (TAX BRACKETS) ---

/**
 * Handles exponential backoff for fetch requests.
 */
async function fetchWithBackoff(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status !== 429 && response.ok) {
                return response;
            }
            if (i < retries - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error(`API failed after ${retries} attempts: ${response.statusText}`);
            }
        } catch (error) {
            if (i === retries - 1) throw error;
        }
    }
}

/**
 * Manages UI elements based on the tax data fetch result (success or failure).
 * If fetch fails, it exposes the manual input box.
 * @param {object | null} taxData - The structured tax data from the API.
 */
function handleRateFetchResult(taxData) {
    const manualGroup = document.getElementById('manualRateGroup');
    const displayDiv = document.getElementById('stateTaxRateDisplay');
    const stateInput = document.getElementById('state');

    if (!stateInput.value) {
        displayDiv.innerHTML = 'Select state for rate';
        manualGroup.classList.add('hidden');
        FETCHED_STATE_RATE_PERCENT = null;
        return;
    }

    if (taxData && taxData.stateMarginalRate !== undefined) {
        // SUCCESS: Use fetched rate
        const rate = parseFloat(taxData.stateMarginalRate);
        if (!isNaN(rate)) {
            FETCHED_STATE_RATE_PERCENT = rate;
            displayDiv.innerHTML = `State Rate: <span style="font-weight: 700; color: var(--color-primary);">${rate.toFixed(2)}% (Auto-Fetched)</span>`;
            displayDiv.style.backgroundColor = 'var(--color-secondary-bg)';
            displayDiv.style.color = '#555';
            manualGroup.classList.add('hidden');
        } else {
             // Fetched data was non-numeric, treat as failure
             handleRateFetchFailure(displayDiv, manualGroup);
        }
    } else {
        // FAILURE: Fetch failed or returned unusable data
        handleRateFetchFailure(displayDiv, manualGroup);
    }
}

/**
 * Handles the UI state when the dynamic tax rate fetch fails.
 * @param {HTMLElement} displayDiv - The side display element.
 * @param {HTMLElement} manualGroup - The manual input group element.
 */
function handleRateFetchFailure(displayDiv, manualGroup) {
    FETCHED_STATE_RATE_PERCENT = null;
    displayDiv.innerHTML = 'Rate Fetch Failed. Enter Manually.';
    displayDiv.style.backgroundColor = '#f8d7da';
    displayDiv.style.color = '#721c24';
    manualGroup.classList.remove('hidden');
}


/**
 * Fetches tax bracket information using Google Search grounding.
 * @param {number} income - Annual income.
 * @param {string} filingStatus - IRS filing status.
 * @param {string} state - 2-letter state code.
 * @param {boolean} updateMainAnalysis - Whether to update the main analysis card with summary text.
 * @returns {object | null} The parsed JSON object with rates and summary, or null on failure.
 */
async function fetchTaxData(income, filingStatus, state, updateMainAnalysis = true) {
    const loadingDiv = document.getElementById('tax-loading-indicator');
    const resultsDiv = document.getElementById('taxBracketResults');
    const sourcesDiv = document.getElementById('tax-sources');

    // Only show loading indicators and clear results if updating the main analysis card
    if (updateMainAnalysis) {
        resultsDiv.innerHTML = 'Querying official sources...';
        sourcesDiv.innerHTML = '';
        loadingDiv.style.display = 'block';
    }

    const systemPrompt = `Act as a highly accurate CPA. Based on the search results, fill out the JSON object with the marginal tax rates for the provided income, filing status, and state. The 'summaryText' should be a professional, one-paragraph explanation of the findings.`;
    
    const userQuery = `Find the current year's Federal and ${state} marginal income tax rates and brackets for a person with an annual income of $${income.toLocaleString()} and a filing status of ${filingStatus.replace('_', ' ')}.`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: TAX_SCHEMA
        }
    };

    try {
        const response = await fetchWithBackoff(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const jsonText = candidate.content.parts[0].text;
            const parsedJson = JSON.parse(jsonText);
            
            if (updateMainAnalysis) {
                // Update Main Analysis Card with LLM Summary
                resultsDiv.innerHTML = `<p style="font-weight: 600;">Rate Findings:</p>${parsedJson.summaryText}`;
                
                // Extract and display sources
                let sources = [];
                const groundingMetadata = candidate.groundingMetadata;
                if (groundingMetadata && groundingMetadata.groundingAttributions) {
                    sources = groundingMetadata.groundingAttributions
                        .map(attribution => ({
                            uri: attribution.web?.uri,
                            title: attribution.web?.title,
                        }))
                        .filter(source => source.uri && source.title); 
                }
                
                if (sources.length > 0) {
                    let sourcesHtml = '<p style="font-weight: bold; margin-bottom: 5px;">Sources (Grounded Search):</p><ul>';
                    sources.slice(0, 3).forEach(source => { 
                        sourcesHtml += `<li><a href="${source.uri}" target="_blank" title="${source.title}">${source.title}</a></li>`;
                    });
                    sourcesHtml += '</ul>';
                    sourcesDiv.innerHTML = sourcesHtml;
                } else {
                    sourcesDiv.innerHTML = '<p>No specific government sources found for these rates.</p>';
                }
            }

            // Always update the global rate status, even for side label fetch (if successful)
            handleRateFetchResult(parsedJson); 
            return parsedJson;

        } else {
            if (updateMainAnalysis) {
                 resultsDiv.innerHTML = '<p style="color: var(--color-danger);">Error: Could not retrieve structured tax rate information from the API.</p>';
            }
            console.error("API response lacked structured candidate text:", result);
            handleRateFetchResult(null); // Failure
            return null;
        }

    } catch (error) {
        if (updateMainAnalysis) {
            resultsDiv.innerHTML = `<p style="color: var(--color-danger);">Calculation Error: Failed to fetch tax data. Check console for details.</p>`;
        }
        console.error("Tax Data Fetch Error:", error);
        handleRateFetchResult(null); // Failure
        return null;
    } finally {
        if (updateMainAnalysis) {
            loadingDiv.style.display = 'none';
        }
    }
}

/**
 * Triggers an immediate fetch for the State Marginal Rate and updates the side label.
 */
async function fetchStateRateForDisplay() {
    const incomeInput = document.getElementById('annualIncome');
    const income = parseFloat(incomeInput.value);
    const filingStatus = document.getElementById('filingStatus').value;
    const state = document.getElementById('state').value;
    const displayDiv = document.getElementById('stateTaxRateDisplay');
    
    // Quick validation
    if (!state || isNaN(income) || income <= 0) {
        displayDiv.innerHTML = 'Select state for rate';
        displayDiv.style.backgroundColor = 'var(--color-secondary-bg)';
        document.getElementById('manualRateGroup').classList.add('hidden');
        return;
    }
    
    // Show loading indicator
    displayDiv.innerHTML = 'Fetching...';
    displayDiv.style.backgroundColor = '#fff3cd'; // Yellow for loading
    displayDiv.style.color = '#856404';

    // Fetch tax data without updating the main results card (updateMainAnalysis = false)
    await fetchTaxData(income, filingStatus, state, false); 
    
    // The handleRateFetchResult function updates the UI based on the outcome of fetchTaxData
}


/**
 * Calculates the tax savings based on max deferral and combined marginal rate.
 * @param {number} maxDeferral - The maximum calculated employee contribution.
 * @param {number} federalRate - The federal marginal tax rate (as a decimal).
 * @param {number} stateRate - The state marginal tax rate (as a decimal).
 * @param {string} stateRateSource - 'Fetched' or 'Manual'.
 */
function analyzeTaxSavings(maxDeferral, federalRate, stateRate, stateRateSource) {
    const analysisDiv = document.getElementById('savingsAnalysisResults');
    const combinedRate = federalRate + stateRate;

    if (combinedRate === 0) {
        analysisDiv.innerHTML = '<p style="color: var(--color-warning);">Cannot perform Pre-Tax/Roth analysis because current tax rates could not be reliably fetched or manually entered.</p>';
        return;
    }

    const preTaxSavings = maxDeferral * combinedRate;

    const analysisHtml = `
        <p><span class="result-label">Estimated Federal Marginal Rate:</span> 
            <span class="result-value" style="font-weight: bold;">${(federalRate * 100).toFixed(2)}%</span>
        </p>
         <p><span class="result-label">Estimated State Marginal Rate (${stateRateSource}):</span> 
            <span class="result-value" style="font-weight: bold;">${(stateRate * 100).toFixed(2)}%</span>
        </p>
        <p><span class="result-label">Estimated Combined Marginal Rate:</span> 
            <span class="result-value" style="font-weight: bold; color: var(--color-primary);">${(combinedRate * 100).toFixed(2)}%</span>
        </p>
        <div style="margin: 15px 0; padding: 10px; border-left: 4px solid var(--color-success-dark); background-color: #e6fff1;">
            <p style="font-size: 1.1em; font-weight: 600; color: #008000;">
                Pre-Tax Savings Potential:
            </p>
            <p style="font-size: 1.5em; font-weight: bold; color: var(--color-success-dark); margin-top: 5px;">
                ${formatCurrency(preTaxSavings)}
            </p>
        </div>
        
        <p class="note-text" style="margin-top: 15px;">
            This **${formatCurrency(preTaxSavings)}** is the approximate cash-in-hand tax reduction (Federal + State) if the full max deferral is made using **Pre-Tax** (Traditional) contributions.
        </p>
        <p class="note-text" style="margin-top: 5px;">
            Choosing **Roth** means you pay the taxes on ${formatCurrency(maxDeferral)} now, but all future growth and qualified distributions are tax-free.
        </p>
    `;

    analysisDiv.innerHTML = analysisHtml;
}


// --- DYNAMIC DATA LISTENER (Universal Snippet) ---
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'INITIAL_PLAN_CONFIG') {
        CURRENT_PLAN_RULES = event.data.rules;
        console.log("Received Plan Rules for Max 401k Calc:", CURRENT_PLAN_RULES);
        initializeCalculator(CURRENT_PLAN_RULES); 
    }
});

/**
 * Sends a message to the parent dashboard requesting the config data be resent.
 */
function requestConfigReload() {
    if (window.parent) {
        window.parent.postMessage({ type: 'REQUEST_CONFIG' }, '*');
    }
}

// --- INITIALIZATION AND CORE CALCULATION ---

function initializeCalculator(rules) {
    const limitsDiv = document.getElementById('current-limits-display');
    const deferralLimit = getLimit('deferral_402g');
    const catchupLimit = getLimit('catchup');
    
    limitsDiv.innerHTML = `
        <p><strong>Current IRS 401(k) Limits (from Config):</strong></p>
        <p>Annual Deferral (402(g)): ${formatCurrency(deferralLimit)}</p>
        <p>Catch-Up (Age 50+): ${formatCurrency(catchupLimit)}</p>
    `;
    
    // Populate the new state dropdown
    populateStates();
    
    // Check if initial rules have been received, if not, request them.
    if (!rules) {
        requestConfigReload();
    }
    
    // Initial call to populate the rate display with defaults
    fetchStateRateForDisplay();
}


/**
 * Main calculation function. Now includes dynamic tax data fetching and savings analysis.
 */
async function calculateMax() {
    const age = parseInt(document.getElementById('age').value);
    const annualIncome = parseFloat(document.getElementById('annualIncome').value);
    const filingStatus = document.getElementById('filingStatus').value;
    const state = document.getElementById('state').value;
    const resultsDiv = document.getElementById('contributionResults');
    const errorDiv = document.getElementById('error-message');
    const manualGroup = document.getElementById('manualRateGroup');
    
    errorDiv.textContent = '';
    
    if (isNaN(age) || isNaN(annualIncome) || annualIncome <= 0 || !filingStatus || !state) {
        errorDiv.textContent = 'Please enter valid numbers for age and income, and select a filing status and state.';
        return;
    }
    
    // --- STEP 1: Core 401(k) Limit Calculation ---

    const ELECTIVE_DEFERRAL_LIMIT = getLimit('deferral_402g');
    const CATCH_UP_CONTRIBUTION = getLimit('catchup');
    const isCatchUpEligible = age >= 50;
    
    let totalDeferralLimit = ELECTIVE_DEFERRAL_LIMIT;
    
    if (isCatchUpEligible) {
        totalDeferralLimit += CATCH_UP_CONTRIBUTION;
    }
    
    const maxBasedOnIncome = annualIncome;
    const finalMaxContribution = Math.min(totalDeferralLimit, maxBasedOnIncome);

    // 2. Display Core Limits
    resultsDiv.innerHTML = `
        <p><span class="result-label">Base Contribution Limit (402(g)):</span> <span class="result-value">${formatCurrency(ELECTIVE_DEFERRAL_LIMIT)}</span></p>
        
        ${isCatchUpEligible ?
            `<p><span class="result-label">Catch-Up Contribution (Age 50+):</span> <span class="result-value">${formatCurrency(CATCH_UP_CONTRIBUTION)}</span></p>`
            : '<p><span class="result-label">Catch-Up Contribution:</span> <span class="result-value">N/A</span></p>'
        }
        
        <hr style="margin: 10px 0;">
        <p><span class="result-label" style="font-size:1.1em; font-weight: bold;">Total Personal Max Deferral:</span> <span class="result-value" style="font-size:1.1em; color:var(--color-primary);">${formatCurrency(finalMaxContribution)}</span></p>
        
        <p class="note-text" style="margin-top: 20px;">
            *This is the limit for employee deferrals (Pre-tax or Roth) only.
        </p>
    `;


    // --- STEP 2: Fetch Dynamic Tax Information for Full Analysis ---
    
    // Pass 'true' to update the main analysis card with full text and sources
    const taxData = await fetchTaxData(annualIncome, filingStatus, state, true); 
    
    let effectiveFederalRate = 0;
    let effectiveStateRate = 0;
    let stateRateSource = 'N/A';
    let canAnalyzeSavings = false;
    
    const taxResultsDiv = document.getElementById('taxBracketResults');
    const taxSourcesDiv = document.getElementById('tax-sources');

    if (taxData) {
        // Case A: Successful Fetch
        effectiveFederalRate = (taxData.federalMarginalRate || 0) / 100;
        effectiveStateRate = (taxData.stateMarginalRate || 0) / 100;
        stateRateSource = 'Auto-Fetched';
        canAnalyzeSavings = true;
    } else if (!manualGroup.classList.contains('hidden')) {
        // Case B: Fetch Failed, Manual Input is Visible. Try to use manual input.
        const manualRateInput = document.getElementById('manualStateRate');
        const manualRate = parseFloat(manualRateInput.value);

        if (!isNaN(manualRate) && manualRate >= 0) {
            // If the automated Federal rate failed, we set a high default guess (24%) for a comprehensive analysis
            effectiveFederalRate = 0.24; 
            effectiveStateRate = manualRate / 100;
            stateRateSource = 'Manual';
            canAnalyzeSavings = true;

            // --- CRITICAL UPDATE: Update Tax Bracket Source & Summary card here ---
            taxResultsDiv.innerHTML = `
                <p style="font-weight: 600; color: var(--color-warning);">Tax Analysis Override:</p>
                <p>The system failed to retrieve dynamic tax bracket data from external sources. Analysis is proceeding using manually provided rates:</p>
                <ul>
                    <li><span style="font-weight: bold;">Federal Marginal Rate Assumed:</span> 24.00% (This is a generic assumption for high income; requires user verification.)</li>
                    <li><span style="font-weight: bold;">State Marginal Rate Used:</span> ${manualRate.toFixed(2)}% (Manually entered by the user.)</li>
                </ul>
                <p class="note-text" style="margin-top: 10px;">
                    **ACTION REQUIRED:** Please verify these rates against official IRS and State government sources for accuracy.
                </p>
            `;
            taxSourcesDiv.innerHTML = ''; // Clear out any previous source information/errors
            // --- END CRITICAL UPDATE ---
            
        } else {
            document.getElementById('savingsAnalysisResults').innerHTML = `
                <p style="color: var(--color-warning);">
                    Tax Analysis Blocked: Automated fetch failed. Please enter a **valid** State Marginal Tax Rate manually to proceed.
                </p>`;
             manualGroup.classList.remove('hidden');
        }
    } else {
        // Case C: No fetch data, no manual input shown. Error.
        document.getElementById('savingsAnalysisResults').innerHTML = `
            <p style="color: var(--color-warning);">
                Tax Analysis Blocked: Automated fetch failed. Please click 'Calculate Max Contribution' again to reveal the manual rate entry, or check your console for API errors.
            </p>`;
    }


    // --- STEP 3: Analyze Savings ---
    if (canAnalyzeSavings) {
        analyzeTaxSavings(finalMaxContribution, effectiveFederalRate, effectiveStateRate, stateRateSource);
    } 
}

// --- INITIAL DYNAMIC SETUP ---
window.addEventListener('DOMContentLoaded', function() {
    // Populate the dropdown on load
    populateStates();
    // Request config data when the calculator iframe is loaded
    requestConfigReload();
});
