// Helper function to format currency
function formatCurrency(value) {
   return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
* Calculates the fixed monthly payment (PMT) for an amortizing loan.
* Formula: P = [ L * i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
* Where:
* L = Loan amount
* i = Monthly interest rate (Annual Rate / 12)
* n = Total number of payments (Term in years * 12)
*/
function calculatePMT(loanAmount, monthlyRate, totalPayments) {
   if (monthlyRate === 0) {
       return loanAmount / totalPayments; // Simple division if interest is 0
   }
   const rateFactor = Math.pow(1 + monthlyRate, totalPayments);
   return loanAmount * monthlyRate * rateFactor / (rateFactor - 1);
}

function calculateAmortization() {
   const L = parseFloat(document.getElementById('loanAmount').value);
   const R_annual = parseFloat(document.getElementById('interestRate').value);
   const T_years = parseInt(document.getElementById('loanTermYears').value);
   
   const summaryDiv = document.getElementById('loanSummary');
   const scheduleCard = document.getElementById('scheduleCard');
   const tableBody = document.getElementById('amortizationTable').getElementsByTagName('tbody')[0];
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   summaryDiv.innerHTML = '';
   tableBody.innerHTML = '';
   scheduleCard.style.display = 'none';
   errorMessage.style.display = 'none';

   // 1. Validation and Constraints
   if (isNaN(L) || L <= 0 || isNaN(R_annual) || R_annual < 0 || isNaN(T_years) || T_years < 1 || T_years > 15) {
       errorMessage.textContent = 'Please enter valid positive values. Loan Term must be between 1 and 15 years.';
       errorMessage.style.display = 'block';
       return;
   }

   if (T_years > 5 && T_years <= 15) {
       // Enforce a stricter warning if term > 5 years (for residence loans)
       errorMessage.textContent = 'WARNING: A loan term greater than 5 years (up to 15 years) is generally only permitted for the purchase of a principal residence.';
       errorMessage.style.display = 'block';
   } else if (T_years > 15) {
       errorMessage.textContent = 'ERROR: The maximum allowed loan term is 15 years.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // 2. Prepare Variables for Calculation
   const R_monthly = (R_annual / 100) / 12; // Monthly rate as a decimal
   const N_total = T_years * 12;            // Total number of payments in months
   
   // 3. Calculate Monthly Payment (PMT)
   const pmt = calculatePMT(L, R_monthly, N_total);
   
   let remainingBalance = L;
   let totalInterest = 0;
   
   // 4. Generate Amortization Schedule
   for (let i = 1; i <= N_total; i++) {
       const interestPayment = remainingBalance * R_monthly;
       
       // This prevents the last payment from being slightly off due to floating point math
       let principalPayment;
       if (i === N_total) {
           principalPayment = remainingBalance;
       } else {
           principalPayment = pmt - interestPayment;
       }

       remainingBalance = Math.max(0, remainingBalance - principalPayment);
       totalInterest += interestPayment;

       // Round to 2 decimal places for display consistency
       const displayPayment = (i === N_total) ? (interestPayment + principalPayment) : pmt;
       
       const row = tableBody.insertRow();
       row.innerHTML = `
           <td>${i}</td>
           <td>${formatCurrency(displayPayment)}</td>
           <td>${formatCurrency(interestPayment)}</td>
           <td>${formatCurrency(principalPayment)}</td>
           <td>${formatCurrency(remainingBalance)}</td>
       `;
   }

   // 5. Display Summary
   const totalPayments = L + totalInterest;

   summaryDiv.innerHTML = `
       <div class="metric-row">
           <span class="metric-label">Required Monthly Payment (PMT)</span>
           <span class="metric-value" style="color: #dc3545;">${formatCurrency(pmt)}</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Total Principal Repaid</span>
           <span class="metric-value">${formatCurrency(L)}</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Total Interest Paid</span>
           <span class="metric-value">${formatCurrency(totalInterest)}</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Total Payments Over Term</span>
           <span class="metric-value">${formatCurrency(totalPayments)}</span>
       </div>
   `;

   // Show schedule card and auto-scroll
   scheduleCard.style.display = 'block';
   scheduleCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}