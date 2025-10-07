// Helper function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 0
   }).format(value);
}

// Function to calculate Future Value (FV) of an investment with monthly contributions
function calculateFutureValue(principal, monthlyContribution, annualReturn, years) {
   const months = years * 12;
   const monthlyRate = annualReturn / 12 / 100;

   let totalBalance = principal;

   for (let m = 0; m < months; m++) {
       // Apply monthly growth (compounding)
       totalBalance *= (1 + monthlyRate);
       
       // Add monthly contribution
       totalBalance += monthlyContribution;
   }
   
   return totalBalance;
}

// =========================================================================
// COMPOUNDING VISUALIZER LOGIC
// =========================================================================

function calculateCompounding() {
   const initialSavings = parseFloat(document.getElementById('initialSavings').value);
   const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value);
   const years = parseFloat(document.getElementById('years').value);
   const annualReturn = parseFloat(document.getElementById('annualReturn').value);
   
   const resultsDiv = document.getElementById('compoundingResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 1. Validation
   if (isNaN(initialSavings) || initialSavings < 0 || isNaN(monthlyContribution) || monthlyContribution < 0 || isNaN(years) || years <= 0 || isNaN(annualReturn) || annualReturn <= 0) {
       errorMessage.textContent = 'Please enter valid positive numbers for all fields.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // 2. Calculation
   const finalBalance = calculateFutureValue(initialSavings, monthlyContribution, annualReturn, years);
   
   // Calculate Total Contributions (The "Money In")
   const totalContributions = initialSavings + (monthlyContribution * years * 12);
   
   // Calculate Total Interest Earned (The "Money Earned")
   const totalInterestEarned = finalBalance - totalContributions;

   // 3. Display Results
   resultsDiv.innerHTML = `
       <div class="summary-row">
           <span class="result-label">Total Money Contributed (Initial + Monthly):</span>
           <span class="result-value">${formatCurrency(totalContributions)}</span>
       </div>
       <div class="summary-row">
           <span class="result-label">Total Interest/Earnings:</span>
           <span class="result-value">${formatCurrency(totalInterestEarned)}</span>
       </div>
       
       <div style="margin-top: 25px; text-align: center; padding: 15px; background-color: #e6f7ff; border-radius: 8px; border: 1px solid #cceeff;">
           <p style="margin-bottom: 5px; font-size: 1.1em; color: #004d99;">Your Projected Balance After ${years} Years:</p>
           <p class="final-value">${formatCurrency(finalBalance)}</p>
       </div>
       
       <p style="margin-top: 20px; font-size: 0.9em; color: #666; text-align: center;">
           This calculation shows that ${formatCurrency(totalInterestEarned)} of your final balance came from compounding growth!
       </p>
   `;

   // 4. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}