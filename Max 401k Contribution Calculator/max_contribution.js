// --- Configuration: 2024 IRS Limits ---
const ELECTIVE_DEFERRAL_LIMIT = 23000;
const CATCH_UP_CONTRIBUTION = 7500;
const COMPENSATION_LIMIT = 345000;

// Helper function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 0
   }).format(value);
}

// =========================================================================
// MAX CONTRIBUTION LOGIC
// =========================================================================

function calculateMax() {
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
       
       <p><span class="result-label" style="font-size:1.1em;">Total Personal Max Contribution:</span> <span class="result-value" style="font-size:1.1em; color:#dc3545;">${formatCurrency(finalMaxContribution)}</span></p>
       
       <p class="note-text">
           *This is the limit for employee deferrals (Pre-tax or Roth) only. <br>
           *The total limit is ${formatCurrency(totalDeferralLimit)} or 100% of your compensation, whichever is less.
       </p>
   `;

   // 4. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}