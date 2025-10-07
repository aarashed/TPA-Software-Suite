// --- Configuration: IRS Limits for SECURE 2.0 (2023 onwards) ---
const MAX_ADMIN_CREDIT_PER_YEAR = 5000;
const MAX_COMPENSATION_FOR_CONTRIBUTION_CREDIT = 1000; // Limit is $1,000 per employee
const CONTRIBUTION_CREDIT_VESTING_YEARS = 5; // Credit percentage phases out over 5 years
const CREDIT_PHASE_OUT_THRESHOLD = 50; // Max credit for businesses with 50 or fewer employees

// Helper function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 0
   }).format(value);
}

// =========================================================================
// SECURE 2.0 TAX CREDIT LOGIC
// =========================================================================

function calculateCredit() {
   const employees = parseFloat(document.getElementById('employees').value);
   const setupCost = parseFloat(document.getElementById('avgSetupCost').value);
   const avgComp = parseFloat(document.getElementById('avgComp').value);
   
   const resultsDiv = document.getElementById('creditResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 1. Validation
   if (isNaN(employees) || employees < 1 || isNaN(setupCost) || setupCost < 0 || isNaN(avgComp) || avgComp < 0) {
       errorMessage.textContent = 'Please enter valid positive numbers for all fields.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // Check for eligibility based on the 100-employee limit for the credit
   if (employees > 100) {
       errorMessage.textContent = 'Credit not applicable: Businesses with more than 100 employees are generally not eligible.';
       errorMessage.style.display = 'block';
       return;
   }

   // 2. Determine Credit Percentages
   let adminCreditRate;
   let contributionCreditRate;

   // Phase-in of SECURE 2.0: Higher credit for small businesses (50 or fewer)
   if (employees <= CREDIT_PHASE_OUT_THRESHOLD) {
       // Business with 50 or fewer employees: 100% of admin cost (up to limit)
       adminCreditRate = 1.0;
       // Contribution credit: 100% in Years 1 & 2, then phases out
       contributionCreditRate = 1.0;
   } else {
       // Business with 51 to 100 employees: 50% of admin cost (up to limit)
       adminCreditRate = 0.5;
       // Contribution credit: 50% in all years
       contributionCreditRate = 0.5;
   }

   // --- Calculate Annual Credits for Years 1, 2, and 3 ---
   let totalCredit = 0;
   let annualDetails = '';
   
   for (let year = 1; year <= 3; year++) {
       
       // --- A. Administrative Cost Credit (Years 1, 2, 3) ---
       // Max credit is the LESSER of $5,000 or 50% of admin cost for 51-100 employees.
       // For 50 or less, it is the LESSER of $5,000 or 100% of cost.
       let adminCredit = Math.min(MAX_ADMIN_CREDIT_PER_YEAR, setupCost * adminCreditRate);

       // --- B. Employer Contribution Credit (New in SECURE 2.0) ---
       
       // The max contribution credit per employee is based on $1,000 of compensation.
       const maxContributionBase = employees * MAX_COMPENSATION_FOR_CONTRIBUTION_CREDIT;
       
       // Calculate the Annual Contribution Credit Percentage based on phase-out
       let actualContributionRate;
       if (employees <= CREDIT_PHASE_OUT_THRESHOLD) {
           // For 50 or less, the 100% rate phases out over 5 years (100, 100, 75, 50, 25)
           // We focus on the first three high-value years (100%, 100%, 75%)
           if (year === 1 || year === 2) {
               actualContributionRate = 1.0;
           } else if (year === 3) {
               actualContributionRate = 0.75;
           } else {
               actualContributionRate = 0; // Not calculating past year 3 for simplicity
           }
       } else {
           // For 51-100, the rate is fixed at 50% for all 5 years
           actualContributionRate = 0.5;
       }

       // The actual contribution credit is the lesser of the rate applied to the max base OR the actual match
       // Note: For simplicity, we assume the company contributes up to the employee limit (4% of $50k = $2,000)
       // Since $1,000 is the per-employee limit, this calculation works well for a simplified tool.
       const contributionCredit = maxContributionBase * actualContributionRate;
       
       // Total Credit for the Year
       const yearCredit = adminCredit + contributionCredit;
       totalCredit += yearCredit;
       
       annualDetails += `
           <p><strong>Year ${year} Estimated Credit:</strong> ${formatCurrency(yearCredit)}</p>
           <ul style="margin-top: 5px; font-size: 0.9em; list-style-type: disc; margin-left: 20px;">
               <li>Admin Cost Credit: ${formatCurrency(adminCredit)}</li>
               <li>Employer Contribution Credit (Phase-in Rate: ${actualContributionRate * 100}%): ${formatCurrency(contributionCredit)}</li>
           </ul>
       `;
   }

   // 4. Display Results
   resultsDiv.innerHTML = `
       <p style="text-align: center; margin-bottom: 25px;">The maximum available tax credit is calculated across the first three years of your plan.</p>
       
       <div class="credit-details">
           ${annualDetails}
       </div>
       
       <p style="margin-top: 30px; font-size: 1.1em; text-align: center;">
           <span class="result-label" style="width: 100%; display: block; margin-bottom: 5px;">Total Estimated Tax Credit (Years 1-3):</span>
           <span class="final-credit">${formatCurrency(totalCredit)}</span>
       </p>
       
       <p class="hint-text" style="text-align: center; margin-top: 25px;">
           *This is an estimate. The actual credit depends on plan type (e.g., matching vs. nonelective) and employee participation. Consult a tax professional for final figures.
       </p>
   `;

   // 5. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}