// --- DYNAMIC DATA SETUP ---
let CURRENT_PLAN_RULES = null;

// Fallback limits for dynamic data access
const FALLBACK_LIMITS_KEYS = {
    // The statutory $50,000 loan limit (IRC 72(p)) is NOT configurable, but we define it here.
    loan_limit_statutory: 50000 
};

// Estimate for tax withholding on withdrawals (used for simplified penalty calculation)
const FEDERAL_TAX_RATE_ESTIMATE = 0.20; // 20% is a common default for elective tax withholding

// --- HELPER FUNCTIONS ---

// Helper function to format numbers to currency with customizable decimal precision
function formatCurrency(value, decimals = 0) {
   // Ensure value is a number and handle potential NaN or Infinity
   if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
       value = 0;
   }
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: decimals
   }).format(value);
}

// Helper function to safely retrieve a limit
function getLimit(key, fallbackValue) {
    // 1. Check current plan rules
    if (CURRENT_PLAN_RULES && CURRENT_PLAN_RULES.LIMITS && CURRENT_PLAN_RULES.LIMITS[key] !== undefined) {
        return CURRENT_PLAN_RULES.LIMITS[key];
    }
    // 2. Check local fallback keys if no specific fallback was provided
    if (FALLBACK_LIMITS_KEYS[key] !== undefined) {
        return FALLBACK_LIMITS_KEYS[key];
    }
    // 3. Return the specific fallback value if provided
    return fallbackValue !== undefined ? fallbackValue : 0;
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

/**
 * Manages the visibility of the three result sections.
 * @param {string} showId - The ID of the result section to show (e.g., 'maxLoanResults').
 */
function displayResultSection(showId) {
    // List of all result sections
    const sections = ['maxLoanResults', 'loanResults', 'withdrawalResults'];
    
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Show the requested section, hide all others
            el.style.display = (id === showId) ? 'block' : 'none';
        }
    });

    // Scroll to the results section after displaying
    const resultsContainer = document.getElementById('results');
    if (resultsContainer) {
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
}


// --- CONFIG LOADING AND RELOAD LOGIC ---

/**
 * Displays the explicit fallback limits with a warning status.
 */
function displayFallbackLimits() {
    const displayDiv = document.getElementById('current-limits-display');
    const statutoryLimit = getLimit('loan_limit_statutory');
    
    displayDiv.classList.remove('result-success', 'result-info');
    displayDiv.classList.add('result-warning');
    
    displayDiv.innerHTML = `
        <p class="font-bold text-red-700">Warning: Using Internal Fallback Limits.</p>
        <div style="padding-top: 5px;">
            <span class="font-semibold">IRC Section 72(p) Loan Limit:</span> 
            <span class="float-right">${formatCurrency(statutoryLimit)}</span>
        </div>
    `;
}

/**
 * Handles incoming plan configuration data (loan limits, etc.) from the parent dashboard.
 * @param {object} data - The configuration object.
 */
function handleConfigData(data) {
    const displayDiv = document.getElementById('current-limits-display');
    
    // Check if the received data is valid and contains limits
    if (data && data.LIMITS && data.LIMITS.loan_limit_statutory) {
        CURRENT_PLAN_RULES = data;
        const statutory = getLimit('loan_limit_statutory');
        
        displayDiv.classList.remove('result-warning', 'result-info');
        displayDiv.classList.add('result-success');
        displayDiv.innerHTML = `
            <p class="font-bold text-green-700">Current Plan Limits Loaded Successfully:</p>
            <div style="padding-top: 5px;">
                <span class="font-semibold">IRC Section 72(p) Loan Limit:</span> 
                <span class="float-right">${formatCurrency(statutory)}</span>
            </div>
        `;
    } else {
        // Fallback or error display
        displayFallbackLimits();
    }
}

/**
 * Sends a request to the parent dashboard to reload plan configuration data.
 */
function requestConfigReload() {
    const displayDiv = document.getElementById('current-limits-display');
    
    // 1. Give immediate feedback that a reload is attempting
    displayDiv.classList.remove('result-success', 'result-warning');
    displayDiv.classList.add('result-info');
    displayDiv.innerHTML = '<p class="text-blue-700">Attempting to reload limits from dashboard...</p>';
    
    // 2. Send the message to the parent
    if (window.parent) {
        window.parent.postMessage({ type: 'REQUEST_CONFIG_RELOAD' }, '*');
    }

    // 3. Set a timeout to display the fallback if no message is received within 3 seconds
    setTimeout(() => {
        if (!CURRENT_PLAN_RULES || !CURRENT_PLAN_RULES.LIMITS) {
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


// --- CALCULATION FUNCTIONS (FIXED & UPDATED) ---

/**
 * Calculates the maximum loan eligibility based on the lesser of the statutory limit or 50% of the vested balance,
 * minus any prior outstanding loan balance.
 */
function calculateMaxLoan() {
    showError('');
    const vestedBalance = parseFloat(document.getElementById('vestedBalance').value);
    const priorLoanBalance = parseFloat(document.getElementById('priorLoanBalance')?.value) || 0; 

    if (isNaN(vestedBalance) || vestedBalance <= 0) {
        showError('Please enter a valid Vested Account Balance.');
        return;
    }

    // Step 1: Get the statutory limit ($50,000 or the configurable limit)
    const statutoryLimit = getLimit('loan_limit_statutory', FALLBACK_LIMITS_KEYS.loan_limit_statutory);
    
    // Step 2: Calculate 50% of the vested balance
    const fiftyPercentVested = vestedBalance * 0.50;
    
    // Step 3: Max eligible loan before prior loan offset (lesser of Step 1 or Step 2)
    const maxBeforeOffset = Math.min(statutoryLimit, fiftyPercentVested);
    
    // Step 4: Max loan after subtracting prior outstanding balance
    const maxLoanAfterOffset = Math.max(0, maxBeforeOffset - priorLoanBalance);

    const maxLoanResultsDiv = document.getElementById('maxLoanResults');
    maxLoanResultsDiv.innerHTML = `
        <h3 class="text-xl font-bold mb-4" style="color: var(--color-primary);">Maximum Eligible Loan Amount: 
            <span class="float-right text-2xl">${formatCurrency(maxLoanAfterOffset)}</span>
        </h3>
        
        <div class="metric-row">
            <span class="result-label">Limit A: Statutory Limit (Max):</span> 
            <span class="result-value">${formatCurrency(statutoryLimit)}</span>
        </div>
        <div class="metric-row">
            <span class="result-label">Limit B: 50% of Vested Balance (${formatCurrency(vestedBalance)}):</span> 
            <span class="result-value">${formatCurrency(fiftyPercentVested)}</span>
        </div>
        <div class="metric-row font-bold bg-blue-50">
            <span class="result-label">Maximum Loan Eligible (Lesser of A or B):</span> 
            <span class="result-value">${formatCurrency(maxBeforeOffset)}</span>
        </div>
        <div class="metric-row" style="color: var(--color-danger);">
            <span class="result-label">Minus: Prior Outstanding Loan Balance:</span> 
            <span class="result-value">${formatCurrency(priorLoanBalance)}</span>
        </div>
        <div class="metric-row" style="border-bottom: none; font-size: 1.1em; font-weight: bold; padding-top: 10px;">
            <span class="result-label">Net Eligible Loan Amount:</span> 
            <span class="result-value">${formatCurrency(maxLoanAfterOffset)}</span>
        </div>
        <p class="note-text mt-4">*The maximum loan is the lesser of the statutory limit or 50% of your vested balance, reduced by any existing loan balances.</p>
    `;
    
    // CRITICAL FIX: Show ONLY the max loan result section
    displayResultSection('maxLoanResults');
}

/**
 * Calculates the loan repayment schedule and generates a detailed amortization table.
 */
function calculateLoan() {
    showError('');
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const loanTerm = parseInt(document.getElementById('loanTerm').value);
    const loanInterestRate = parseFloat(document.getElementById('loanInterestRate').value) / 100;
    
    if (isNaN(loanAmount) || loanAmount <= 0 || isNaN(loanTerm) || loanTerm <= 0 || isNaN(loanInterestRate) || loanInterestRate < 0) {
        showError('Please enter valid, positive values for Desired Loan Amount, Term, and Annual Interest Rate.');
        return;
    }

    const n = loanTerm * 12; // Total payments (monthly)
    const i = loanInterestRate / 12; // Monthly interest rate

    let monthlyPayment;
    let totalInterestPaid = 0;
    
    // Calculate Monthly Payment using Amortization Formula
    if (i === 0) {
        monthlyPayment = loanAmount / n;
    } else {
        monthlyPayment = loanAmount * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    }
    
    // --- Amortization Table Generation ---
    let tableHtml = `
        <table class="amortization-table">
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Beginning Balance</th>
                    <th>Payment</th>
                    <th>Interest</th>
                    <th>Principal</th>
                    <th>Ending Balance</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let currentBalance = loanAmount;
    let totalInterest = 0;
    
    for (let month = 1; month <= n; month++) {
        const interestPayment = currentBalance * i;
        let principalPayment = monthlyPayment - interestPayment;
        
        let endingBalance = currentBalance - principalPayment;
        let finalPayment = monthlyPayment;

        if (month === n) {
            // Last payment: ensure principal is exactly the remaining balance
            principalPayment = currentBalance;
            endingBalance = 0;
            const finalInterestPayment = currentBalance * i;
            finalPayment = principalPayment + finalInterestPayment;
        }

        // Handle floating point errors near zero
        if (month !== n && endingBalance < 0.005) { 
            principalPayment += endingBalance; // Adjust principal
            endingBalance = 0;
        }
        
        // Log interest only if it's positive
        if (interestPayment > 0) {
           totalInterest += interestPayment;
        }


        tableHtml += `
            <tr>
                <td>${month}</td>
                <td>${formatCurrency(currentBalance, 2)}</td>
                <td>${formatCurrency(finalPayment, 2)}</td>
                <td>${formatCurrency(interestPayment, 2)}</td>
                <td>${formatCurrency(principalPayment, 2)}</td>
                <td>${formatCurrency(endingBalance, 2)}</td>
            </tr>
        `;
        
        currentBalance = endingBalance;
        
        if (currentBalance <= 0) break; // Stop loop if balance is cleared early
    }
    
    tableHtml += '</tbody></table>';

    const totalPaid = loanAmount + totalInterest;
    
    // Display Summary and Table
    const loanResultsDiv = document.getElementById('loanResults');
    loanResultsDiv.innerHTML = `
        <h3 class="text-xl font-bold mb-4" style="color: var(--color-primary);">Estimated Repayment Summary</h3>
        <div class="metric-row">
            <span class="result-label">Estimated Monthly Payment:</span> 
            <span class="result-value text-xl font-bold">${formatCurrency(monthlyPayment)}</span>
        </div>
        <div class="metric-row">
            <span class="result-label">Total Interest Paid:</span> 
            <span class="result-value">${formatCurrency(totalInterest)}</span>
        </div>
        <div class="metric-row">
            <span class="result-label">Total Amount Repaid:</span> 
            <span class="result-value">${formatCurrency(totalPaid)}</span>
        </div>
        <div class="metric-row" style="border-bottom: none; margin-top: 5px;">
            <span class="result-label">Loan Details:</span> 
            <span class="result-value">${formatCurrency(loanAmount)} at ${(loanInterestRate * 100).toFixed(2)}% for ${loanTerm} years</span>
        </div>
        
        <h3 class="text-lg font-bold mt-6 mb-3 border-t pt-4">Detailed Amortization Schedule</h3>
        <div class="table-scroll-container">${tableHtml}</div>
    `;

    // CRITICAL FIX: Show ONLY the loan result section
    displayResultSection('loanResults');
}


/**
 * Calculates the estimated penalty and taxes for a non-qualified withdrawal.
 */
function calculateWithdrawal() {
    showError('');
    const withdrawalAmount = parseFloat(document.getElementById('withdrawalAmount').value);
    const ageAtWithdrawal = parseInt(document.getElementById('ageAtWithdrawal').value);
    const exemptionReason = document.getElementById('exemptionReason').value;

    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0 || isNaN(ageAtWithdrawal) || ageAtWithdrawal < 18) {
        showError('Please enter a valid, positive Withdrawal Amount and Age.');
        return;
    }

    // Check for 10% penalty exemption
    const isPenaltyExempt = ageAtWithdrawal >= 59.5 || exemptionReason !== 'none';
    const penaltyRate = isPenaltyExempt ? 0 : 0.10;
    
    const penaltyAmount = withdrawalAmount * penaltyRate;
    const taxWithholdingEstimate = withdrawalAmount * FEDERAL_TAX_RATE_ESTIMATE;
    const totalWithheldEstimate = penaltyAmount + taxWithholdingEstimate;
    const netTakeHome = withdrawalAmount - totalWithheldEstimate;

    const withdrawalResultsDiv = document.getElementById('withdrawalResults');
    
    withdrawalResultsDiv.innerHTML = `
        <h3 class="text-xl font-bold mb-4" style="color: #4b5563;">Withdrawal Summary (${formatCurrency(withdrawalAmount, 0)})</h3>
        
        <div class="p-4 border border-gray-200 rounded-lg">
            ${!isPenaltyExempt ? 
                `<div class="metric-row"><span class="result-label font-bold text-red-600">10% Early Withdrawal Penalty:</span> <span class="result-value font-bold text-red-600">${formatCurrency(penaltyAmount, 0)}</span></div>` 
                : `<div class="metric-row"><span class="result-label font-bold text-green-600">10% Early Withdrawal Penalty:</span> <span class="result-value font-bold text-green-600">EXEMPT (${exemptionReason.replace('_', ' ')})</span></div>`
            }

            <div class="metric-row">
                <span class="result-label">Estimated Federal Tax Withholding (${(FEDERAL_TAX_RATE_ESTIMATE * 100).toFixed(0)}%):</span> 
                <span class="result-value">${formatCurrency(taxWithholdingEstimate, 0)}</span>
            </div>
            
            <div class="mt-4 pt-4 border-t border-dashed border-gray-300">
                <div class="metric-row border-b-0">
                    <strong class="text-lg text-gray-800">Estimated Net Take-Home:</strong> 
                    <strong class="text-lg text-blue-700">${formatCurrency(netTakeHome, 0)}</strong>
                </div>
                <p class="note-text text-sm text-gray-500">(Total estimated penalty/tax withheld: ${formatCurrency(totalWithheldEstimate, 0)})</p>
            </div>
        </div>
        
        <p class="note-text mt-4">
            *This is an estimation based on simplified federal tax and penalty rules. State taxes and actual tax liability may vary. Consult a tax professional.
        </p>
    `;

    // CRITICAL FIX: Show ONLY the withdrawal result section
    displayResultSection('withdrawalResults');
}


// --- INITIAL DYNAMIC SETUP ---
window.addEventListener('DOMContentLoaded', function() {
    
    // 1. Request config data when the calculator iframe is loaded
    requestConfigReload();
    
    // 2. Set an initial timeout to ensure fallback limits are displayed if the message isn't received quickly
    setTimeout(() => {
        // If CURRENT_PLAN_RULES hasn't been set by the parent response, display fallback
        if (!CURRENT_PLAN_RULES) {
            displayFallbackLimits();
        }
    }, 1000); 
});
