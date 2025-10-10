// --- DYNAMIC DATA SETUP ---
let CURRENT_PLAN_RULES = null;

// Fallback limits for dynamic data access
const FALLBACK_LIMITS_KEYS = {
    // The statutory $50,000 loan limit (IRC 72(p)) is NOT configurable, but we define it here.
    loan_limit_statutory: 50000 
};

// --- HELPER FUNCTIONS ---

// Helper function to format numbers to currency with customizable decimal precision
function formatCurrency(value, decimals = 0) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: decimals
   }).format(value);
}

// Helper function to safely retrieve a limit
function getLimit(key, fallbackValue) {
    if (CURRENT_PLAN_RULES && CURRENT_PLAN_RULES.LIMITS && CURRENT_PLAN_RULES.LIMITS[key] !== undefined) {
        return CURRENT_PLAN_RULES.LIMITS[key];
    }
    // Return the fallback value if provided, otherwise check the local fallback keys.
    return fallbackValue !== undefined ? fallbackValue : FALLBACK_LIMITS_KEYS[key];
}

/**
 * Displays an error message in the dedicated error div.
 * @param {string} message 
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    if (message) {
        errorDiv.classList.add('visible');
    } else {
        errorDiv.classList.remove('visible');
    }
}

// --- DYNAMIC DATA LISTENER (Universal Snippet) ---
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'INITIAL_PLAN_CONFIG') {
        CURRENT_PLAN_RULES = event.data.rules;
        console.log("Received Plan Rules for Loan Calc:", CURRENT_PLAN_RULES);
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
    // Update the display immediately while waiting for config
    document.getElementById('current-limits-display').innerHTML = '<p>Re-loading IRS limits...</p>';
}

/**
 * Initializes the tool by requesting config and displaying loaded limits.
 */
function initializeCalculator(rules) {
    const STATUTORY_LOAN_MAX = getLimit('loan_limit_statutory', 50000);
    
    document.getElementById('current-limits-display').innerHTML = `
        <p><strong>Statutory Loan Max:</strong> ${formatCurrency(STATUTORY_LOAN_MAX)}</p>
        <p><strong>Withdrawal Penalty Age:</strong> < 59.5 years</p>
    `;
    
    // Ensure the parent is prompted to send config on load if rules weren't immediately available.
    if (!rules) {
        requestConfigReload();
    }
}

// --- NEW: RUN ALL FUNCTION ---
/**
 * Executes all three calculation functions and clears the error message if successful.
 */
function runAllEstimators() {
    // Clear previous errors first
    showError("");
    
    // Get all input values (Note: parsing inputs inside runAll is primarily for quick validation)
    const vestedBalance = parseFloat(document.getElementById('vestedBalance').value);
    const outstandingLoan = parseFloat(document.getElementById('outstandingLoan').value);
    const amount = parseFloat(document.getElementById('amount').value);
    const age = parseInt(document.getElementById('age').value, 10);
    const loanInterest = parseFloat(document.getElementById('loanInterest').value);
    const loanTerm = parseFloat(document.getElementById('loanTerm').value);

    // Basic required inputs check
    // We only perform the basic checks here; detailed checks are handled within each calculation function.
    if (isNaN(vestedBalance) || vestedBalance < 0 || isNaN(outstandingLoan) || outstandingLoan < 0) {
        showError("Max Loan calculation requires valid Vested Balance and Outstanding Loan.");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showError("All calculations require a valid Loan/Withdrawal Amount.");
        return;
    }
    if (isNaN(age) || age < 18) {
        showError("Withdrawal calculation requires a valid Employee Age.");
        return;
    }
    if (isNaN(loanInterest) || loanInterest < 0 || isNaN(loanTerm) || loanTerm <= 0) {
         showError("Loan Repayment calculation requires a valid Interest Rate and Loan Term.");
         return;
    }
    
    // If all required inputs seem valid, run all three
    calculateMaxLoan();
    calculateLoan();
    calculateWithdrawal();
    
    // Scroll to results after running all
    const resultsElement = document.getElementById('results');
    if (resultsElement) resultsElement.scrollIntoView({ behavior: 'smooth' });
}


// --- 1. MAX LOAN ELIGIBILITY CALCULATION ---

function calculateMaxLoan() {
    const vestedBalance = parseFloat(document.getElementById('vestedBalance').value);
    const outstandingLoan = parseFloat(document.getElementById('outstandingLoan').value);
    
    if (isNaN(vestedBalance) || vestedBalance < 0 || isNaN(outstandingLoan) || outstandingLoan < 0) {
        document.getElementById('maxLoanResults').innerHTML = `<p style="color:var(--color-danger);">Error: Missing Vested Balance or Outstanding Loan input.</p>`;
        return;
    }
    
    const STATUTORY_LOAN_MAX = getLimit('loan_limit_statutory', 50000);
    
    // 1. Calculate the two limits for max loan:
    const halfVestedBalance = vestedBalance * 0.5;
    
    // 2. Determine the smaller of the two statutory limits. This is the max loan limit (before offset).
    const maxLoanLimitBeforeOffset = Math.min(STATUTORY_LOAN_MAX, halfVestedBalance);
    
    // 3. Subtract the outstanding balance to find the maximum new loan amount.
    const maxLoanAfterOffset = Math.max(0, maxLoanLimitBeforeOffset - outstandingLoan);

    // 4. Display Results
    const resultsDiv = document.getElementById('maxLoanResults');
    resultsDiv.innerHTML = `
        <h3>Max Loan Eligibility (IRC 72(p))</h3>
        <p><span class="result-label">50% of Vested Balance:</span> <span class="result-value">${formatCurrency(halfVestedBalance, 0)}</span></p>
        <p><span class="result-label">IRC 72(p) Statutory Max:</span> <span class="result-value">${formatCurrency(STATUTORY_LOAN_MAX, 0)}</span></p>
        <p><span class="result-label">Max Limit Before Offset:</span> <span class="result-value">${formatCurrency(maxLoanLimitBeforeOffset, 0)}</span></p>
        <p><span class="result-label">Outstanding Loan Balance:</span> <span class="result-value">${formatCurrency(outstandingLoan, 0)}</span></p>
        
        <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
            <p><strong><span class="result-label" style="font-size:1.1em;">Maximum New Loan Amount:</span> <span class="result-value" style="font-size:1.1em; color:var(--color-primary);">
                ${formatCurrency(maxLoanAfterOffset, 0)}
            </span></strong></p>
        </div>
        
        <p class="note-text" style="margin-top: 20px;">
            *This is the theoretical maximum based on IRS limits. Plan documents may impose lower limits.<br>
            *The current vested balance used is ${formatCurrency(vestedBalance, 0)}.
        </p>
    `;
}


// --- 2. LOAN REPAYMENT CALCULATION ---

function calculateLoan() {
    const principal = parseFloat(document.getElementById('amount').value);
    const annualRate = parseFloat(document.getElementById('loanInterest').value);
    const loanTermYears = parseFloat(document.getElementById('loanTerm').value);

    if (isNaN(principal) || principal <= 0 || isNaN(annualRate) || annualRate < 0 || isNaN(loanTermYears) || loanTermYears <= 0) {
        document.getElementById('loanResults').innerHTML = `<p style="color:var(--color-danger);">Error: Missing valid Loan Amount, Interest Rate, or Term.</p>`;
        return;
    }
    
    const months = loanTermYears * 12;
    // Monthly interest rate
    const monthlyRate = (annualRate / 100) / 12;

    let monthlyPayment;
    let totalInterestPaid;

    if (monthlyRate === 0) {
        // Simple case: 0% interest
        monthlyPayment = principal / months;
        totalInterestPaid = 0;
    } else {
        // Standard Amortization Formula: M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
        monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        const totalRepayment = monthlyPayment * months;
        totalInterestPaid = totalRepayment - principal;
    }

    const resultsDiv = document.getElementById('loanResults');
    resultsDiv.innerHTML = `
        <h3>Loan Repayment Schedule</h3>
        <p><span class="result-label">Loan Principal:</span> <span class="result-value">${formatCurrency(principal, 0)}</span></p>
        <p><span class="result-label">Annual Interest Rate:</span> <span class="result-value">${annualRate.toFixed(2)}%</span></p>
        <p><span class="result-label">Loan Term:</span> <span class="result-value">${loanTermYears} Years (${months} Months)</span></p>
        
        <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
            <p><span class="result-label" style="font-size:1.1em;">Estimated Monthly Payment:</span> <span class="result-value" style="font-size:1.1em; color:var(--color-primary);">${formatCurrency(monthlyPayment, 2)}</span></p>
            <p><span class="result-label">Total Interest Paid Over Term:</span> <span class="result-value">${formatCurrency(totalInterestPaid, 2)}</span></p>
            <p><span class="result-label">Total Repayment Amount:</span> <span class="result-value">${formatCurrency(principal + totalInterestPaid, 2)}</span></p>
        </div>
        
        <p class="note-text" style="margin-top: 20px;">
            *Repayments are typically made with after-tax dollars, and the interest is paid back into your own 401(k) account.
        </p>
    `;
}


// --- 3. WITHDRAWAL PENALTY CALCULATION ---

function calculateWithdrawal() {
    const amount = parseFloat(document.getElementById('amount').value);
    const age = parseInt(document.getElementById('age').value, 10);
    const yearsVested = parseInt(document.getElementById('yearsVested').value, 10);

    if (isNaN(amount) || amount <= 0 || isNaN(age) || age < 18 || isNaN(yearsVested) || yearsVested < 0) {
        document.getElementById('withdrawalResults').innerHTML = `<p style="color:var(--color-danger);">Error: Missing valid Withdrawal Amount, Age, or Years Vested.</p>`;
        return;
    }
    
    // Assume 22% Federal Tax Bracket for basic estimation, 10% Early Withdrawal Penalty.
    const FEDERAL_TAX_RATE_ESTIMATE = 0.22;
    const EARLY_WITHDRAWAL_PENALTY_RATE = 0.10;
    const AGE_LIMIT = 59.5;
    const VESTING_THRESHOLD_FOR_PLAN = 3; // Placeholder for common 3-year cliff vesting

    let isPenaltyExempt = false;
    let exemptionReason = "Not Applicable";
    
    // Common IRS Age/Exception Checks
    if (age >= AGE_LIMIT) {
        isPenaltyExempt = true;
        exemptionReason = "Age 59.5 or Older";
    } else if (age >= 55) {
        // Rule of 55 (Separation from Service at 55 or older)
        exemptionReason = "Rule of 55 (requires separation from service)";
    } 
    // Other common exceptions not explicitly calculated: Disability, SEPP, QDRO, etc.

    // A simple vesting check to demonstrate using plan rules (for internal TPA info)
    const isVested = yearsVested >= VESTING_THRESHOLD_FOR_PLAN;
    
    let penaltyAmount = 0;

    if (!isPenaltyExempt) {
        penaltyAmount = amount * EARLY_WITHDRAWAL_PENALTY_RATE;
    }
    
    // NOTE: Taxable amount is estimated at a flat rate for withholding purposes.
    const taxWithholdingEstimate = amount * FEDERAL_TAX_RATE_ESTIMATE; 
    
    const totalWithheldEstimate = penaltyAmount + taxWithholdingEstimate;
    const netTakeHome = amount - totalWithheldEstimate;
    
    const resultsDiv = document.getElementById('withdrawalResults');
    resultsDiv.innerHTML = `
        <h3>Withdrawal Penalty Estimate</h3>
        <p><span class="result-label">Withdrawal Gross Amount:</span> <span class="result-value">${formatCurrency(amount, 0)}</span></p>
        <p><span class="result-label">Employee Age:</span> <span class="result-value">${age} Years</span></p>
        <p><span class="result-label">Vesting Status (Plan-Specific):</span> <span class="result-value">${isVested ? 'Fully Vested' : 'Not Fully Vested'}</span></p>
        
        <div style="margin-top: 15px; padding-top: 15px;">
            ${!isPenaltyExempt ? 
                `<p><span class="result-label">10% Early Withdrawal Penalty:</span> <span class="result-value" style="color: var(--color-danger);">${formatCurrency(penaltyAmount, 0)}</span></p>` 
                : `<p><span class="result-label">10% Early Withdrawal Penalty:</span> <span class="result-value" style="color: var(--color-success);">EXEMPT (${exemptionReason})</span></p>`
            }

            <p><span class="result-label">Estimated Federal Tax Withholding (${(FEDERAL_TAX_RATE_ESTIMATE * 100).toFixed(0)}%):</span> <span class="result-value">${formatCurrency(taxWithholdingEstimate, 0)}</span></p>
            
            <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
                <p><strong><span class="result-label" style="font-size:1.1em;">Estimated Net Take-Home:</span> <span class="result-value" style="font-size:1.1em; color:var(--color-primary);">${formatCurrency(netTakeHome, 0)}</span></strong></p>
                <p class="note-text">(Total estimated penalty/tax: ${formatCurrency(totalWithheldEstimate, 0)})</p>
            </div>
        </div>
        
        <p class="note-text" style="margin-top: 20px;">
            *This is an estimation based on a 22% tax bracket and a simplified exemption check. Actual tax liability may vary greatly.
        </p>
    `;
}

// Initial configuration request on script load
window.onload = function() {
    initializeCalculator(); 
};
