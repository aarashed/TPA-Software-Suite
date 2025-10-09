// --- DYNAMIC DATA SETUP (NEW) ---
let CURRENT_PLAN_RULES = null;
// Fallback values used if data fails to load (must match dashboard defaults)
const FALLBACK_LIMITS = {
    deferral_402g: 23000 // Placeholder for 2024
};

// --- DYNAMIC DATA LISTENER (Universal Snippet) ---
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'INITIAL_PLAN_CONFIG') {
        CURRENT_PLAN_RULES = event.data.rules;
        console.log("Received Plan Rules for 402g Calc:", CURRENT_PLAN_RULES);
        initializeCalculator(CURRENT_PLAN_RULES); 
    }
});

/**
 * Public function called by the 'Reload IRS Limits' button AND on initial load.
 * Sends a message to the parent dashboard requesting the config data be resent.
 */
function requestConfigReload() {
    // Show a loading state
    const displayElement = document.getElementById('current-limits-display');
    if (displayElement) {
        displayElement.className = 'result-box result-info'; 
        displayElement.innerHTML = `<p style="font-weight: 600;">Requesting updated IRS Limits...</p>`;
    }
    
    // CRITICAL FIX: Check if the script is running inside an iframe.
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_CONFIG' }, '*');
    } else {
        console.warn("Script is running outside of an iframe. Cannot send REQUEST_CONFIG. Using local defaults.");
        setTimeout(() => initializeCalculator(null), 50); 
    }
}

// Helper function to safely retrieve a limit (NEW)
function get402gLimit() {
    const rules = CURRENT_PLAN_RULES;
    if (rules && rules.LIMITS) {
        // The key in the dashboard payload is deferral_402g
        return rules.LIMITS.deferral_402g || FALLBACK_LIMITS.deferral_402g;
    }
    return FALLBACK_LIMITS.deferral_402g;
}


// Initialization function: Displays the dynamic status and limit (NEW)
function initializeCalculator(rules) {
    const deferralLimit = get402gLimit();
    
    let messageHtml = '';
    let statusClass = 'result-box result-info';
    
    // Check if the rules object is null or structurally incomplete
    if (!rules || !rules.LIMITS) {
        statusClass = 'result-box result-danger';
        messageHtml = `
            <p style="color: var(--color-danger); font-weight: 600; margin-top: 5px;">
                ⚠️ Warning: IRS 402(g) limit failed to load. Using default limit: ${formatCurrency(deferralLimit)}.
            </p>
        `;
    }

    const displayElement = document.getElementById('current-limits-display');
    const excessInputHint = document.getElementById('excessAmount').nextElementSibling;
    
    if (displayElement) {
        displayElement.className = `${statusClass}`;
        displayElement.innerHTML = `
            <p style="font-weight: 600; margin-bottom: 5px;">Current IRS Limit (Loaded):</p>
            <div style="display: flex; justify-content: center; gap: 30px; font-size: 1.1em;">
                <p><strong>402(g) Deferral Limit:</strong> <span style="font-weight: 700;">${formatCurrency(deferralLimit)}</span></p>
            </div>
            ${messageHtml}
        `;
    }
    
    // Update the hint text to show the loaded limit
    if (excessInputHint) {
        excessInputHint.textContent = `The 402(g) limit is currently loaded as ${formatCurrency(deferralLimit)} (used for reference).`;
    }
}


// Helper function to format currency
function formatCurrency(value) {
    return '$' + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Calculates the earnings (or loss) allocable to the excess deferral
 * using the standard "Fractional Method" for the year of deferral.
 * * Formula: Earnings = [ Excess Deferral * (Ending Balance - Beginning Balance - Contributions) ] / [ (Beginning Balance + Contributions) ]
 */
function calculateAllocableEarnings(excess, balStart, totalContrib, balEnd) {
    // 1. Calculate the Net Earnings/Loss on the entire account for the year of deferral
    // Net_Gain_Loss = Ending_Balance - Beginning_Balance - Contributions
    const netGainLoss = balEnd - balStart - totalContrib;

    // 2. Calculate the Adjusted Beginning Balance (Denominator for the allocation fraction)
    // Adjusted_Bal_Start = Beginning_Balance + Contributions (used to scale the gain/loss)
    const adjustedBalStart = balStart + totalContrib;

    // Handle the case where Adjusted Beginning Balance is zero (e.g., brand new participant)
    if (adjustedBalStart === 0) {
        // Since we have an excess, there MUST have been contributions. The net gain loss is entirely due to the excess/contributions.
        return totalContrib === 0 ? 0 : excess * (netGainLoss / totalContrib);
    }

    // 3. Calculate the Allocable Earnings
    // Allocable_Earnings = Excess * ( Net_Gain_Loss / Adjusted_Bal_Start )
    const E_allocable = excess * (netGainLoss / adjustedBalStart);

    return {
        E_allocable: E_allocable,
        netGainLoss: netGainLoss
    };
}


// =========================================================================
// 402(g) REFUND CALCULATION LOGIC
// =========================================================================

function calculate402gRefund() {
    // Get inputs
    const L = parseFloat(document.getElementById('excessAmount').value); // L = Excess Deferral Principal
    const B = parseFloat(document.getElementById('accountBalanceYearStart').value); // B = Start Balance
    const C = parseFloat(document.getElementById('totalContributions').value); // C = Total Contributions during year
    const E = parseFloat(document.getElementById('accountBalanceYearEnd').value); // E = End Balance
    
    const summaryDiv = document.getElementById('refundSummary');
    const errorMessage = document.getElementById('error-message');

    // Clear previous state
    summaryDiv.innerHTML = '';
    errorMessage.style.display = 'none';

    // 1. Validation
    if (isNaN(L) || L <= 0 || isNaN(B) || B < 0 || isNaN(C) || C < 0 || isNaN(E) || E < 0) {
        errorMessage.textContent = 'Please enter valid non-negative numbers for all inputs, and a positive Excess Deferral Principal.';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Check for logical consistency (Excess L cannot be more than total contributions C)
    if (L > C) {
        errorMessage.textContent = 'The Excess Deferral Principal ($' + L.toFixed(2) + ') cannot be greater than the Total Contributions During Year of Deferral ($' + C.toFixed(2) + '). Please check your inputs.';
        errorMessage.style.display = 'block';
        return;
    }

    // 2. Calculate Allocable Earnings
    const { E_allocable, netGainLoss } = calculateAllocableEarnings(L, B, C, E);

    // 3. Calculate Total Refund Amount
    const totalRefund = L + E_allocable;

    // 4. Display Results
    summaryDiv.innerHTML = `
        <div class="metric-row">
            <span class="metric-label">Net Gain/Loss on Total Account (Year of Deferral)</span>
            <span class="metric-value" style="color: ${netGainLoss >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${formatCurrency(netGainLoss)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Allocable Earnings (or Loss) on Excess</span>
            <span class="metric-value" style="color: ${E_allocable >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${formatCurrency(E_allocable)}</span>
        </div>
        <div class="metric-row" style="border-top: 2px solid var(--color-primary); margin-top: 15px;">
            <span class="metric-label">Excess Deferral Principal to Refund</span>
            <span class="metric-value">${formatCurrency(L)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label"><strong>TOTAL REQUIRED REFUND AMOUNT</strong></span>
            <span class="metric-value" style="font-size: 1.3em; color: var(--color-info);"><strong>${formatCurrency(totalRefund)}</strong></span>
        </div>
    `;

    // Note for TPA
    summaryDiv.insertAdjacentHTML('beforeend', `<p class="hint-text" style="text-align: center; margin-top: 20px;">*The full Total Required Refund Amount must be distributed to the participant by April 15 of the following year to avoid double taxation.</p>`);

    // 5. AUTO-SCROLL FIX: Scroll to the results for visibility
    document.getElementById('summary').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// CRITICAL INITIALIZATION STEP
document.addEventListener('DOMContentLoaded', () => {
    // This runs immediately on load and handles both the immediate display and the request for config.
    requestConfigReload();
});