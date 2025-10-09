// --- DYNAMIC DATA SETUP ---
let CURRENT_PLAN_RULES = null;

// Fallback limits for the annual compensation cap (must match Dashboard defaults)
const FALLBACK_LIMITS_KEYS = {
    comp_max: 345000 // 2024 Limit, used for fallback
};

// Helper function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2
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
        console.log("Received Plan Rules for Match Calc:", CURRENT_PLAN_RULES);
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
        displayElement.innerHTML = `<p style="font-weight: 600;">Requesting updated Plan Configuration...</p>`;
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
    // Safely retrieve the needed limit
    const COMPENSATION_LIMIT = getLimit('comp_max');
    
    let messageHtml = '';
    let statusClass = 'result-box result-success';
    
    // Check if limits were loaded successfully
    if (!rules || !rules.LIMITS || rules.LIMITS.comp_max === undefined) {
        statusClass = 'result-box result-warning';
        messageHtml = `
            <p style="color: var(--color-warning); font-weight: 600; margin-top: 5px;">
                ⚠️ Warning: Max Compensation limit failed to load fully. Using default limit for calculation.
            </p>
        `;
    }

    const displayElement = document.getElementById('current-limits-display');
    const hintElement = document.getElementById('salary-hint');
    
    if (displayElement) {
        displayElement.className = `${statusClass}`;
        displayElement.innerHTML = `
            <p style="font-weight: 600; margin-bottom: 5px;">Current IRS Compensation Limit (Loaded):</p>
            <div style="display: flex; justify-content: center; gap: 30px; font-size: 1.1em; flex-wrap: wrap;">
                <p><strong>Section 401(a)(17) Max Comp:</strong> <span style="font-weight: 700;">${formatCurrency(COMPENSATION_LIMIT)}</span></p>
            </div>
            ${messageHtml}
        `;
    }

    if (hintElement) {
        hintElement.textContent = `Note: Only the first ${formatCurrency(COMPENSATION_LIMIT)} of salary is legally eligible for match calculation.`;
    }
}
// --- END DYNAMIC DATA SETUP ---


// =========================================================================
// EMPLOYER MATCH CALCULATION LOGIC
// =========================================================================

function calculateMatch() {
   // Retrieve dynamic limit
   const COMPENSATION_LIMIT = getLimit('comp_max');
    
   const salary = parseFloat(document.getElementById('annualSalary').value);
   const employeeRate = parseFloat(document.getElementById('employeeContribution').value) / 100;
   const matchRate = parseFloat(document.getElementById('matchRate').value) / 100;
   const matchLimitRate = parseFloat(document.getElementById('matchLimit').value) / 100;
   
   const resultsDiv = document.getElementById('matchResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 1. Validation
   if (isNaN(salary) || salary <= 0 || isNaN(employeeRate) || employeeRate < 0 || isNaN(matchRate) || matchRate < 0 || isNaN(matchLimitRate) || matchLimitRate < 0) {
       errorMessage.textContent = 'Please enter valid numbers for all fields.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // ** CRITICAL STEP: Apply the Compensation Cap (401(a)(17) **
   const cappedSalary = Math.min(salary, COMPENSATION_LIMIT);
   
   // 2. Determine the MATCH-ELIGIBLE Contribution Amount
   
   // a) Calculate the employee's total contribution amount (based on CAPPED salary)
   const employeeTotalContribution = cappedSalary * employeeRate;

   // b) Calculate the maximum amount of contribution the employer will match (based on CAPPED salary)
   const matchLimitDollar = cappedSalary * matchLimitRate;
   
   // c) The portion of the employee's contribution eligible for match is the lesser of
   //    their total contribution or the dollar match limit.
   const contributionForMatch = Math.min(employeeTotalContribution, matchLimitDollar);

   // 3. Calculate the Final Employer Match
   const finalEmployerMatch = contributionForMatch * matchRate;
   
   // 4. Generate Advice
   let adviceText = '';
   if (employeeTotalContribution < matchLimitDollar) {
       adviceText = `Your contribution rate (${(employeeRate * 100).toFixed(1)}%) is less than the employer's match limit of ${matchLimitRate * 100}%. You are not receiving the full available match. Consider increasing your contribution to at least ${matchLimitRate * 100}%.`;
   } else {
       adviceText = 'Your contribution rate is at or above the employer match limit, which is great for your savings! You are receiving the full available match.';
   }

   // 5. Display Results
   resultsDiv.innerHTML = `
       <div style="text-align: center; margin-bottom: 20px;">
           <p style="font-size: 1.1em; font-weight: bold;">Annual Match Formula: ${matchRate * 100}% up to ${matchLimitRate * 100}% of Salary</p>
       </div>
       
       <p><span class="result-label">Capped Salary Used for Calculation:</span> ${formatCurrency(cappedSalary)}</p>
       <p><span class="result-label">Your Annual Contribution:</span> ${formatCurrency(employeeTotalContribution)}</p>
       <p><span class="result-label">Contribution Matched By Employer:</span> ${formatCurrency(contributionForMatch)}</p>
       
       <div style="margin-top: 20px; padding: 15px; background-color: #e6ffec; border-radius: 6px;">
           <p><span class="result-label" style="font-size: 1.2em; color: var(--color-success);">Total Annual Employer Match:</span>
               <span class="result-value" style="color: var(--color-success);"><strong>${formatCurrency(finalEmployerMatch)}</strong></span>
           </p>
       </div>
       
       <p style="margin-top: 25px; color: var(--color-primary); font-weight: bold;">Advice:</p>
       <p style="font-size: 1em;">${adviceText}</p>

       <p class="note-text">
           *This assumes the match is paid as a lump sum annually. Consult your plan documents for specific pay period details.
       </p>
   `;
}

// CRITICAL INITIALIZATION STEP
document.addEventListener('DOMContentLoaded', () => {
    requestConfigReload();
});