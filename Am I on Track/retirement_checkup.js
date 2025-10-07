// Helper function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 0 // Use 0 for simpler retirement goal numbers
   }).format(value);
}

// Function to calculate Future Value (FV) of a series of contributions (Annuity)
function calculateFutureValue(principal, contribution, rate, years) {
   const r = rate / 100;
   const n = years;
   
   // FV of current principal (lump sum)
   const fv_principal = principal * Math.pow(1 + r, n);
   
   // FV of contributions (annuity due formula for beginning of year contributions)
   // Formula: Contribution * [((1 + r)^n - 1) / r] * (1 + r)
   const fv_contributions = contribution * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
   
   return fv_principal + fv_contributions;
}

// =========================================================================
// RETIREMENT CHECKUP LOGIC
// =========================================================================

// Industry-standard benchmark for total savings needed by a certain age
// Source: Fidelity (simplified for this calculator)
const BENCHMARKS = {
   30: 1.0,  // 1x annual income by age 30
   35: 2.0,  // 2x annual income by age 35
   40: 3.0,  // 3x annual income by age 40
   45: 4.0,
   50: 6.0,
   55: 7.0,
   60: 8.0,
   67: 10.0 // 10x annual income by age 67 for retirement
};


function runCheckup() {
   // 1. Get Inputs
   const currentAge = parseFloat(document.getElementById('currentAge').value);
   const retirementAge = parseFloat(document.getElementById('retirementAge').value);
   const currentSavings = parseFloat(document.getElementById('currentSavings').value);
   const annualContribution = parseFloat(document.getElementById('annualContribution').value);
   const annualIncome = parseFloat(document.getElementById('annualIncome').value);
   const resultsDiv = document.getElementById('checkupResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 2. Simple Validation
   if (isNaN(currentAge) || isNaN(retirementAge) || currentAge >= retirementAge || currentAge < 18 || annualIncome <= 0) {
       errorMessage.textContent = 'Please enter valid ages (Current Age < Retirement Age) and income.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // 3. Define Assumptions
   const yearsUntilRetirement = retirementAge - currentAge;
   // Conservative average annual return
   const assumedAnnualReturn = 6.0;
   // Assumed retirement goal multiple (using 10x income at 67 as a simplified goal)
   const finalGoalMultiple = BENCHMARKS[67];
   const finalRetirementGoal = finalGoalMultiple * annualIncome;

   // 4. Calculate Future Value (FV)
   const projectedBalance = calculateFutureValue(
       currentSavings,
       annualContribution,
       assumedAnnualReturn,
       yearsUntilRetirement
   );
   
   // 5. Determine Checkup Status (Benchmark Comparison)
   
   // Find the closest current benchmark age (rounding down to nearest 5 or 0)
   const currentBenchmarkAge = Object.keys(BENCHMARKS)
       .map(Number)
       .filter(age => age <= currentAge)
       .pop() || 0; // Use 0 if age is below 30
       
   const currentBenchmarkMultiple = BENCHMARKS[currentBenchmarkAge] || BENCHMARKS[30] * (currentAge < 30 ? 0.5 : 1); // Adjust for <30
   const targetSavingsForAge = currentBenchmarkMultiple * annualIncome;
   
   let statusHTML;
   let statusText;
   
   // Check against current age benchmark
   if (currentSavings >= targetSavingsForAge * 1.0) {
       statusText = 'On Track';
       statusHTML = `<div class="status-indicator status-on-track">Status: ${statusText}</div>`;
   } else if (currentSavings >= targetSavingsForAge * 0.8) {
       statusText = 'Lagging Slightly';
       statusHTML = `<div class="status-indicator status-lagging">Status: ${statusText}</div>`;
   } else {
       statusText = 'Urgent Action Needed';
       statusHTML = `<div class="status-indicator status-urgent">Status: ${statusText}</div>`;
   }

   // 6. Display Results
   resultsDiv.innerHTML = `
       <h3>Your Current Status</h3>
       <p><span class="result-label">Benchmark Goal for Age ${currentAge}:</span> <span class="result-value">${formatCurrency(targetSavingsForAge)}</span></p>
       <p><span class="result-label">Your Current Savings:</span> <span class="result-value">${formatCurrency(currentSavings)}</span></p>
       ${statusHTML}
       
       <h3 style="margin-top: 25px;">Retirement Forecast at Age ${retirementAge}</h3>
       <p><span class="result-label">Total Projected Retirement Balance:</span> <span class="result-value">${formatCurrency(projectedBalance)}</span></p>
       <p><span class="result-label">Recommended Final Goal (10x Income):</span> <span class="result-value">${formatCurrency(finalRetirementGoal)}</span></p>
       
       <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
           *Assumes ${assumedAnnualReturn}% annual return. <br>
           *Results are estimates based on simplified formulas and may not reflect actual investment performance.
       </p>
   `;

   // 7. Auto-Scroll to Results (as per your request)
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}