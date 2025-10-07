// Helper function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2
   }).format(value);
}

// =========================================================================
// EMPLOYER MATCH CALCULATION LOGIC
// =========================================================================

function calculateMatch() {
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
   
   // 2. Determine the MATCH-ELIGIBLE Contribution Amount
   
   // a) Calculate the employee's total contribution amount
   const employeeTotalContribution = salary * employeeRate;
   
   // b) Calculate the maximum amount of the employee's contribution that is eligible for a match
   // This is the salary multiplied by the match limit percentage
   const matchEligibleContributionLimit = salary * matchLimitRate;
   
   // c) The actual contribution amount the employer will look at is the LOWER of:
   //    - The employee's total contribution (A)
   //    - The plan's maximum match-eligible amount (B)
   const contributionForMatch = Math.min(employeeTotalContribution, matchEligibleContributionLimit);
   
   // 3. Calculate the FINAL Match Amount
   const finalEmployerMatch = contributionForMatch * matchRate;
   
   // 4. Calculate Key Takeaway Metrics
   const totalSavings = employeeTotalContribution + finalEmployerMatch;
   const differenceToMaxMatch = matchEligibleContributionLimit - contributionForMatch;
   
   let adviceText = '';

   if (employeeRate < matchLimitRate) {
       adviceText = `You are not contributing enough to receive the full match. Increase your contribution by ${formatCurrency(differenceToMaxMatch)} per year to get the maximum free money.`;
   } else if (employeeRate === matchLimitRate) {
       adviceText = 'Fantastic! You are contributing exactly what is needed to receive the maximum employer match.';
   } else { // employeeRate > matchLimitRate
       adviceText = 'You are contributing more than the match limit, which is great for your savings! You are receiving the full available match.';
   }

   // 5. Display Results
   resultsDiv.innerHTML = `
       <div style="text-align: center; margin-bottom: 20px;">
           <p style="font-size: 1.1em; font-weight: bold;">Annual Match Formula: ${matchRate * 100}% up to ${matchLimitRate * 100}% of Salary</p>
       </div>
       
       <p><span class="result-label">Your Annual Contribution:</span> ${formatCurrency(employeeTotalContribution)}</p>
       <p><span class="result-label">Contribution Matched By Employer:</span> ${formatCurrency(contributionForMatch)}</p>
       
       <div style="margin-top: 20px; padding: 15px; background-color: #e6ffec; border-radius: 6px;">
           <p><span class="result-label" style="font-size: 1.2em; color: #333;">Total Annual Employer Match:</span>
               <span class="result-value" style="color: #28a745;">${formatCurrency(finalEmployerMatch)}</span>
           </p>
       </div>
       
       <p style="margin-top: 25px; color: #004d99; font-weight: bold;">Advice:</p>
       <p style="font-size: 1em;">${adviceText}</p>

       <p class="note-text">
           *This assumes the match is paid as a lump sum annually. Consult your plan documents for specific pay frequencies and vesting rules.
       </p>
   `;

   // 6. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}