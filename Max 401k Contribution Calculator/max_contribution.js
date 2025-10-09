// --- DYNAMIC DATA SETUP ---
let CURRENT_PLAN_RULES = null;

// Fallback limits for 401k contributions (must match Dashboard defaults)
const FALLBACK_LIMITS_KEYS = {
    deferral_402g: 23000, 
    catchup: 7500,
    comp_max: 345000 
};

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
    const displayElement = document.getElementById('current-limits-display');
    if (displayElement) {
        displayElement.className = 'result-box result-info'; 
        displayElement.innerHTML = `<p style="font-weight: 600;">Requesting updated IRS Limits...</p>`;
    }
    
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_CONFIG' }, '*');
    } else {
        console.warn("Script is running outside of an iframe. Cannot send REQUEST_CONFIG. Using local defaults.");
        setTimeout(() => initializeCalculator(null), 50); 
    }
}

// Initialization function: Displays the dynamic status and limit
function initializeCalculator(rules) {
    // Safely retrieve all needed limits using the helper
    const ELECTIVE_DEFERRAL_LIMIT = getLimit('deferral_402g');
    const CATCH_UP_CONTRIBUTION = getLimit('catchup');
    const COMPENSATION_LIMIT = getLimit('comp_max');
    
    let messageHtml = '';
    let statusClass = 'result-box result-success';
    
    // Check if limits were loaded successfully
    if (!rules || !rules.LIMITS || rules.LIMITS.deferral_402g === undefined) {
        statusClass = 'result-box result-warning';
        messageHtml = `
            <p style="color: var(--color-warning); font-weight: 600; margin-top: 5px;">
                ⚠️ Warning: IRS limits failed to load fully. Using default limits for calculation.
            </p>
        `;
    }

    const displayElement = document.getElementById('current-limits-display');
    
    if (displayElement) {
        displayElement.className = `${statusClass}`;
        displayElement.innerHTML = `
            <p style="font-weight: 600; margin-bottom: 5px;">Current IRS Contribution Limits (Loaded):</p>
            <div style="display: flex; justify-content: center; gap: 30px; font-size: 1.1em; flex-wrap: wrap;">
                <p><strong>402(g) Deferral Limit:</strong> <span style="font-weight: 700;">${formatCurrency(ELECTIVE_DEFERRAL_LIMIT)}</span></p>
                <p><strong>Catch-Up Limit:</strong> <span style="font-weight: 700;">${formatCurrency(CATCH_UP_CONTRIBUTION)}</span></p>
                <p><strong>Max Compensation:</strong> <span style="font-weight: 700;">${formatCurrency(COMPENSATION_LIMIT)}</span></p>
            </div>
            ${messageHtml}
        `;
    }
}
// --- END DYNAMIC DATA SETUP ---


// =========================================================================
// MAX CONTRIBUTION LOGIC
// =========================================================================

function calculateMax() {
    // Retrieve limits dynamically
    const ELECTIVE_DEFERRAL_LIMIT = getLimit('deferral_402g');
    const CATCH_UP_CONTRIBUTION = getLimit('catchup');
    // const COMPENSATION_LIMIT = getLimit('comp_max'); // Not strictly needed for this calc, but available

    const age = parseFloat(document.getElementById('age').value);
    const annualIncome = parseFloat(document.getElementById('annualIncome').value);
    const resultsDiv = document.getElementById('contributionResults');
    const errorMessage = document.getElementById('error-message');
    
    // Clear previous state
    resultsDiv.innerHTML = '';
    errorMessage.style.display = 'none';

    // 1. Validation
    if (isNaN(age) || isNaN(annualIncome) || age < 18 || annualIncome <= 0) {
        errorMessage.textContent = 'Please enter a valid age (18+) and annual income.';
        errorMessage.style.display = 'block';
        return;
    }
    
    // 2. Determine Contribution Eligibility
    const isCatchUpEligible = age >= 50;
    
    // Calculate the total limit (Elective Deferral + Catch-up)
    const totalDeferralLimit = isCatchUpEligible
        ? ELECTIVE_DEFERRAL_LIMIT + CATCH_UP_CONTRIBUTION
        : ELECTIVE_DEFERRAL_LIMIT;
    
    // Calculate the limit based on 100% of compensation
    const maxBasedOnIncome = annualIncome;
    
    // The final maximum is the LOWER of the two limits (IRS total limit vs. 100% of income)
    const finalMaxContribution = Math.min(totalDeferralLimit, maxBasedOnIncome);

    // 3. Display Results
    resultsDiv.innerHTML = `
        <p><span class="result-label">Base Contribution Limit:</span> <span class="result-value">${formatCurrency(ELECTIVE_DEFERRAL_LIMIT)}</span></p>
        
        ${isCatchUpEligible ?
            `<p><span class="result-label">Catch-Up Contribution (Age 50+):</span> <span class="result-value">${formatCurrency(CATCH_UP_CONTRIBUTION)}</span></p>`
            : '<p><span class="result-label">Catch-Up Contribution:</span> <span class="result-value">N/A</span></p>'
        }
        
        <p><span class="result-label" style="font-size:1.1em;">Total Personal Max Contribution:</span> <span class="result-value" style="font-size:1.1em; color:var(--color-primary);">${formatCurrency(finalMaxContribution)}</span></p>
        
        <p class="note-text" style="margin-top: 20px;">
            *This is the limit for employee deferrals (Pre-tax or Roth) only. <br>
            *The total statutory limit is ${formatCurrency(totalDeferralLimit)} or 100% of your compensation, whichever is less.
        </p>
    `;
}


document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL INITIALIZATION STEP
    requestConfigReload();
});