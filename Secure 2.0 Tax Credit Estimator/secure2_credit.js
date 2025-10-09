// --- DYNAMIC DATA SETUP (NEW) ---
let CURRENT_PLAN_RULES = null;
// Fallback limits are now defined and maintained centrally in dashboard.js.
// We keep a minimal object here just to safely handle missing keys.
const FALLBACK_LIMITS_KEYS = {
    secure2_admin_max: 5000, 
    secure2_comp_max: 1000,
    secure2_vesting_years: 5,
    secure2_phase_out_employees: 50
};

// Helper function to format currency
function formatCurrency(value) {
    // Ensure value is a number and fix to 0 decimal places before formatting
    return '$' + Math.abs(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper function to safely retrieve a limit (RESTORED)
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
        console.log("Received Plan Rules for SECURE 2.0 Calc:", CURRENT_PLAN_RULES);
        initializeCalculator(CURRENT_PLAN_RULES); 
    }
});

/**
 * Public function called by the 'Reload Config' button AND on initial load.
 * Sends a message to the parent dashboard requesting the config data be resent.
 */
function requestConfigReload() {
    const displayElement = document.getElementById('current-limits-display');
    if (displayElement) {
        displayElement.className = 'result-box result-info'; 
        displayElement.innerHTML = `<p style="font-weight: 600;">Requesting updated SECURE 2.0 Limits...</p>`;
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
    const ADMIN_MAX = getLimit('secure2_admin_max');
    const PHASE_OUT_EMPLOYEES = getLimit('secure2_phase_out_employees');
    
    let messageHtml = '';
    let statusClass = 'result-box result-success';
    
    // Check if the most critical limits were loaded successfully
    if (!rules || !rules.LIMITS || rules.LIMITS.secure2_admin_max === undefined) {
        statusClass = 'result-box result-warning';
        messageHtml = `
            <p style="color: var(--color-warning); font-weight: 600; margin-top: 5px;">
                ⚠️ Warning: SECURE 2.0 limits failed to load fully. Using default limits for calculation.
            </p>
        `;
    }

    const displayElement = document.getElementById('current-limits-display');
    
    if (displayElement) {
        displayElement.className = `${statusClass}`;
        displayElement.innerHTML = `
            <p style="font-weight: 600; margin-bottom: 5px;">Current SECURE 2.0 Limits (Loaded):</p>
            <div style="display: flex; justify-content: center; gap: 30px; font-size: 1.1em; flex-wrap: wrap;">
                <p><strong>Max Admin Cost Credit:</strong> <span style="font-weight: 700;">${formatCurrency(ADMIN_MAX)}</span></p>
                <p><strong>Contribution Credit Employee Limit:</strong> <span style="font-weight: 700;">${PHASE_OUT_EMPLOYEES} employees</span></p>
            </div>
            ${messageHtml}
        `;
    }
    
    // Auto-run calculation removed to prevent unwanted scroll/results on initial load.
}
// --- END DYNAMIC DATA SETUP ---


/**
 * Main function to calculate the SECURE 2.0 Tax Credit.
 */
function calculateCredit() {
    // Retrieve limits dynamically using the RESTORED helper function
    const MAX_ADMIN_COST_CREDIT = getLimit('secure2_admin_max'); // $5,000
    const MAX_COMPENSATION_FOR_CONTRIBUTION_CREDIT = getLimit('secure2_comp_max'); // $1,000
    const CONTRIBUTION_PHASE_OUT_YEARS = getLimit('secure2_vesting_years'); // 5
    const CREDIT_PHASE_OUT_THRESHOLD = getLimit('secure2_phase_out_employees'); // 50

    // Get Inputs
    const employees = parseInt(document.getElementById('employees').value);
    const avgSetupCost = parseFloat(document.getElementById('avgSetupCost').value);
    const avgComp = parseFloat(document.getElementById('avgComp').value);
    const resultsDiv = document.getElementById('creditResults');
    const errorMessage = document.getElementById('error-message');
    
    // Clear previous state
    resultsDiv.innerHTML = '';
    errorMessage.style.display = 'none';

    // 1. Validation
    if (isNaN(employees) || employees < 1 || isNaN(avgSetupCost) || avgSetupCost <= 0 || isNaN(avgComp) || avgComp <= 0) {
        errorMessage.textContent = 'Please enter valid numbers for the number of employees, setup cost, and average compensation.';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Eligibility Check
    if (employees > 100) {
        errorMessage.textContent = 'Eligibility failure: Businesses must have 100 or fewer employees earning over $5,000 to qualify for this credit.';
        errorMessage.style.display = 'block';
        return;
    }

    // --- 2. Calculate Admin Cost Credit (ACC) ---
    const adminCostRate = 0.5; // 50% credit for all eligible businesses
    const maxCreditPerYear = MAX_ADMIN_COST_CREDIT; // $5,000
    
    // The credit is 50% of the cost, maxed at $5,000.
    const calculatedAdminCredit = Math.min(avgSetupCost * adminCostRate, maxCreditPerYear);
    
    // The credit is available for 3 years (Years 1-3)
    const totalAdminCredit = calculatedAdminCredit * 3;


    // --- 3. Calculate Contribution Credit (CC) ---
    const employeeContributionCreditCap = MAX_COMPENSATION_FOR_CONTRIBUTION_CREDIT; // $1,000

    // SECURE 2.0 sets the *credit percentage* based on the number of employees.
    let contributionCreditRate;
    if (employees <= CREDIT_PHASE_OUT_THRESHOLD) { // 50 or fewer employees
        contributionCreditRate = 1.0; // 100% credit rate for 50 or fewer employees
    } else { // 51-100 employees
        // Contribution credit is phased out: 100% - 2% for every employee over 50.
        const reductionFactor = (employees - CREDIT_PHASE_OUT_THRESHOLD) * 0.02; 
        contributionCreditRate = Math.max(0, 1.0 - reductionFactor); // Reduces from 1.0 to 0.0
    }
    
    // The maximum contribution credit per employee in Year 1 is $1,000 (100% of $1,000 credit cap for 50 or fewer employees).
    const maxEmployeeCreditYear1 = employeeContributionCreditCap * contributionCreditRate;

    // Total Contribution Credit for each year (based on the number of eligible employees * max credit)
    const totalCreditPerYear = employees * maxEmployeeCreditYear1;

    // The contribution credit phases out over 5 years
    // Year 1: 100%, Year 2: 100%, Year 3: 75%, Year 4: 50%, Year 5: 25%
    const phaseOutRates = [1.0, 1.0, 0.75, 0.50, 0.25]; // Indexed 0-4
    
    let totalContributionCredit = 0;
    const yearlyContributionCredit = [];

    for (let i = 0; i < CONTRIBUTION_PHASE_OUT_YEARS; i++) {
        const credit = totalCreditPerYear * phaseOutRates[i];
        totalContributionCredit += credit;
        yearlyContributionCredit.push(credit);
    }
    
    
    // --- 4. Display Results ---
    const grandTotalCredit = totalAdminCredit + totalContributionCredit;

    resultsDiv.innerHTML = `
        <h2 style="color: var(--color-primary); margin-top: 0;">Total Estimated SECURE 2.0 Credit: ${formatCurrency(grandTotalCredit)}</h2>
        <p class="description">This estimate is for the first 5 years of the plan.</p>
        
        <div style="display: flex; justify-content: space-around; margin: 20px 0; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background-color: #f9f9f9;">
            <p><strong>Total Admin Credit (3 Yrs):</strong> <span style="color: var(--color-success); font-weight: bold;">${formatCurrency(totalAdminCredit)}</span></p>
            <p><strong>Total Contribution Credit (5 Yrs):</strong> <span style="color: var(--color-success); font-weight: bold;">${formatCurrency(totalContributionCredit)}</span></p>
        </div>

        <h3>Contribution Credit Breakdown (Years 1-5)</h3>
        <table class="data-grid-table" style="width: 80%; margin: 15px auto;">
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Credit Percentage</th>
                    <th>Est. Contribution Credit</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>1</td><td>${(phaseOutRates[0] * 100).toFixed(0)}%</td><td style="font-weight: bold;">${formatCurrency(yearlyContributionCredit[0])}</td></tr>
                <tr><td>2</td><td>${(phaseOutRates[1] * 100).toFixed(0)}%</td><td style="font-weight: bold;">${formatCurrency(yearlyContributionCredit[1])}</td></tr>
                <tr><td>3</td><td>${(phaseOutRates[2] * 100).toFixed(0)}%</td><td style="font-weight: bold;">${formatCurrency(yearlyContributionCredit[2])}</td></tr>
                <tr><td>4</td><td>${(phaseOutRates[3] * 100).toFixed(0)}%</td><td style="font-weight: bold;">${formatCurrency(yearlyContributionCredit[3])}</td></tr>
                <tr><td>5</td><td>${(phaseOutRates[4] * 100).toFixed(0)}%</td><td style="font-weight: bold;">${formatCurrency(yearlyContributionCredit[4])}</td></tr>
            </tbody>
        </table>
        
        <p class="hint-text" style="text-align: center; margin-top: 20px;">
            *The Contribution Credit calculation assumes the average employer contribution meets the ${formatCurrency(employeeContributionCreditCap)} per employee maximum used for the credit base.
        </p>
    `;
    
}


document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL INITIALIZATION STEP
    requestConfigReload();
});