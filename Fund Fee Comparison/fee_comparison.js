// Helper function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2
   }).format(value);
}

// Function to calculate Future Value (FV) of an investment with monthly contributions
function calculateFutureValue(principal, monthlyContribution, annualReturn, years) {
   const months = years * 12;
   // Calculate the actual monthly rate (adjusted for fees later)
   const monthlyRate = annualReturn / 12 / 100;

   let totalBalance = principal;

   for (let m = 0; m < months; m++) {
       // Apply monthly growth (compounding)
       totalBalance *= (1 + monthlyRate);
       
       // Add monthly contribution at the end of the month
       totalBalance += monthlyContribution;
   }
   
   return totalBalance;
}

// =========================================================================
// FEE COMPARISON LOGIC
// =========================================================================

function compareFees() {
   // 1. Get Inputs
   const principal = parseFloat(document.getElementById('initialInvestment').value);
   const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value);
   const years = parseFloat(document.getElementById('years').value);
   const grossReturn = parseFloat(document.getElementById('grossReturn').value);
   const feeA = parseFloat(document.getElementById('feeA').value);
   const feeB = parseFloat(document.getElementById('feeB').value);
   
   const resultsDiv = document.getElementById('comparisonResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 2. Simple Validation
   if (isNaN(principal) || isNaN(monthlyContribution) || isNaN(years) || isNaN(grossReturn) || years <= 0 || grossReturn <= 0) {
       errorMessage.textContent = 'Please enter valid numbers for all investment details.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // 3. Calculate Net Returns
   const netReturnA = grossReturn - feeA;
   const netReturnB = grossReturn - feeB;

   if (netReturnA < 0 || netReturnB < 0) {
       errorMessage.textContent = 'Fees cannot exceed the gross return.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // 4. Calculate Final Balances
   const finalBalanceA = calculateFutureValue(principal, monthlyContribution, netReturnA, years);
   const finalBalanceB = calculateFutureValue(principal, monthlyContribution, netReturnB, years);
   
   // 5. Calculate Fee Difference
   const balanceDifference = Math.abs(finalBalanceA - finalBalanceB);
   const higherFeeFund = feeA > feeB ? 'Fund B' : 'Fund A';
   
   // Determine which fund has the higher final balance for messaging
   const differenceText = finalBalanceA > finalBalanceB
       ? `By choosing Fund A (lower fee), you save a projected total of ${formatCurrency(balanceDifference)}!`
       : `By choosing Fund B (lower fee), you save a projected total of ${formatCurrency(balanceDifference)}!`;


   // 6. Display Results
   resultsDiv.innerHTML = `
       <div class="result-row">
           <span class="result-label">Net Annual Return</span>
           <span class="result-value-a">${netReturnA.toFixed(2)}%</span>
           <span class="result-value-b">${netReturnB.toFixed(2)}%</span>
       </div>
       <div class="result-row">
           <span class="result-label">Final Balance after ${years} Years</span>
           <span class="result-value-a">${formatCurrency(finalBalanceA)}</span>
           <span class="result-value-b">${formatCurrency(finalBalanceB)}</span>
       </div>
       
       <div class="result-row difference-row">
           <span class="result-label">Difference in Final Balance</span>
           <span class="difference-value">${formatCurrency(balanceDifference)}</span>
       </div>
       
       <p style="margin-top: 15px; text-align: center; font-size: 1em;">
           ${differenceText}
       </p>
   `;

   // 7. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}