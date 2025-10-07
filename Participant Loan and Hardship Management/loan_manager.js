// Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.max(0, value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
* Calculates loan eligibility and generates the amortization schedule.
*/
function calculateLoan() {
   // 1. Data Collection
   const vestedBalance = parseFloat(document.getElementById('vestedBalance').value);
   const outstandingBalance = parseFloat(document.getElementById('outstandingBalance').value);
   const proposedLoanAmount = parseFloat(document.getElementById('proposedLoanAmount').value);
   const interestRate = parseFloat(document.getElementById('interestRate').value);
   const termYears = parseFloat(document.getElementById('termYears').value);
   const paymentFrequency = parseFloat(document.getElementById('paymentFrequency').value);

   const resultsSummary = document.getElementById('resultsSummary');
   const amortizationTableBody = document.getElementById('amortizationTableBody');
   const eligibilityConclusion = document.getElementById('eligibilityConclusion');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsSummary.style.display = 'none';
   errorMessage.style.display = 'none';
   amortizationTableBody.innerHTML = '';
   eligibilityConclusion.innerHTML = '';

   // 2. Validation
   if ([vestedBalance, outstandingBalance, proposedLoanAmount, interestRate, termYears, paymentFrequency].some(isNaN) || vestedBalance <= 0 || proposedLoanAmount <= 0) {
       errorMessage.textContent = 'Please ensure all inputs are valid positive numbers.';
       errorMessage.style.display = 'block';
       return;
   }

   if (termYears > 5 && proposedLoanAmount > 0) {
       errorMessage.textContent = 'Standard loan term cannot exceed 5 years unless it is a primary residence loan (not supported in this tool).';
       errorMessage.style.display = 'block';
       return;
   }


   // 3. MAXIMUM ELIGIBILITY CALCULATION (IRC Section 72(p))
   
   // Test A: 50% of Vested Balance
   const maxA = vestedBalance * 0.50;
   
   // Test B: $50,000 less the highest outstanding balance in the last 12 months (simplified to current outstanding)
   const maxB = 50000.00 - outstandingBalance;

   // The maximum permissible loan amount is the lesser of the two statutory limits:
   const maxLoanEligibility = Math.max(0, Math.min(maxA, maxB));

   // 4. ELIGIBILITY CONCLUSION
   let conclusionClass = 'conclusion-fail';
   let conclusionText = '';
   
   if (proposedLoanAmount > maxLoanEligibility) {
       conclusionText = `
           <p><strong>LOAN DENIED (EXCEEDS LIMIT)!</strong></p>
           <p>Maximum Loan Eligibility: ${formatCurrency(maxLoanEligibility)}</p>
           <p>Proposed Loan: ${formatCurrency(proposedLoanAmount)}</p>
           <p class="hint-text">The proposed amount is too high. The participant may only borrow up to ${formatCurrency(maxLoanEligibility)}.</p>
       `;
   } else {
       conclusionClass = 'conclusion-pass';
       conclusionText = `
           <p><strong>LOAN APPROVED (MEETS LIMITS)!</strong></p>
           <p>Maximum Loan Eligibility: ${formatCurrency(maxLoanEligibility)}</p>
           <p>Proposed Loan: ${formatCurrency(proposedLoanAmount)}</p>
           <p class="hint-text">The proposed amount is within the statutory limits. Proceed to amortization schedule.</p>
       `;
   }
   
   eligibilityConclusion.className = `conclusion-section ${conclusionClass}`;
   eligibilityConclusion.innerHTML = conclusionText;


   // 5. AMORTIZATION SCHEDULE CALCULATION (regardless of approval, we calculate the proposed schedule)

   const loanPrincipal = proposedLoanAmount;
   const rate = interestRate / 100;
   const paymentsPerYear = paymentFrequency;
   const totalPayments = termYears * paymentsPerYear;
   
   // The periodic interest rate (i)
   const periodicRate = rate / paymentsPerYear;
   
   // Calculate the fixed periodic payment (P)
   // Formula: P = L [ i(1 + i)^n ] / [ (1 + i)^n – 1 ]
   const periodicPayment = loanPrincipal * (periodicRate * Math.pow(1 + periodicRate, totalPayments)) / (Math.pow(1 + periodicRate, totalPayments) - 1);
   
   let remainingBalance = loanPrincipal;
   let cumulativeInterest = 0;
   
   // Display Summary Metrics
   document.getElementById('metricSummary').innerHTML = `
       <div class="metric-item">
           <div class="metric-value">${formatCurrency(maxLoanEligibility)}</div>
           <div class="metric-label">Max. New Loan Eligibility</div>
       </div>
       <div class="metric-item">
           <div class="metric-value">${periodicPayment > 0 ? formatCurrency(periodicPayment) : formatCurrency(0)}</div>
           <div class="metric-label">Fixed Payment Amount</div>
       </div>
       <div class="metric-item">
           <div class="metric-value">${totalPayments}</div>
           <div class="metric-label">Total Payments (Count)</div>
       </div>
   `;

   // Generate Amortization Table
   for (let i = 1; i <= totalPayments; i++) {
       const interestPayment = remainingBalance * periodicRate;
       let principalPayment = periodicPayment - interestPayment;
       
       // Final payment adjustment for rounding error
       if (i === totalPayments) {
           principalPayment = remainingBalance;
       }

       remainingBalance -= principalPayment;
       cumulativeInterest += interestPayment;

       const row = amortizationTableBody.insertRow();
       row.innerHTML = `
           <td>${i}</td>
           <td>${i === 1 ? 'Start Date + 1 Period' : '+ 1 Period'}</td>
           <td>${formatCurrency(periodicPayment)}</td>
           <td>${formatCurrency(interestPayment)}</td>
           <td>${formatCurrency(principalPayment)}</td>
           <td>${formatCurrency(Math.max(0, remainingBalance))}</td>
       `;

       if (i === totalPayments) {
            row.style.fontWeight = 'bold';
            row.style.backgroundColor = '#ecf0f1'; // Light grey for the final row
       }
   }

   resultsSummary.style.display = 'block';
   resultsSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}