// Helper function for monthly payment calculation (Amortization Formula)
function calculateMonthlyPayment(principal, annualRate, years) {
   const monthlyRate = annualRate / 12 / 100;
   const numberOfPayments = years * 12;

   if (monthlyRate === 0) {
       return principal / numberOfPayments;
   }

   const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
   return payment;
}

// Function to format numbers to currency
function formatCurrency(value) {
   return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2
   }).format(value);
}

// =========================================================================
// LOAN CALCULATION LOGIC
// =========================================================================
function calculateLoan() {
   const loanAmount = parseFloat(document.getElementById('amount').value);
   const interestRate = parseFloat(document.getElementById('loanInterest').value);
   const loanTerm = parseFloat(document.getElementById('loanTerm').value);
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous results
   document.getElementById('loanResults').innerHTML = '';
   document.getElementById('withdrawalResults').innerHTML = '';
   errorMessage.style.display = 'none';

   if (isNaN(loanAmount) || loanAmount <= 0 || isNaN(interestRate) || isNaN(loanTerm) || loanTerm <= 0) {
       errorMessage.textContent = 'Please enter valid numbers for loan amount, interest rate, and term.';
       errorMessage.style.display = 'block';
       return;
   }

   // Calculation
   const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, loanTerm);
   const totalPayments = monthlyPayment * loanTerm * 12;
   const totalInterestPaid = totalPayments - loanAmount;

   // Display Results
   document.getElementById('loanResults').innerHTML = `
       <h3>Loan Repayment Details</h3>
       <p><span class="result-label">Monthly Payment:</span> <span class="result-value">${formatCurrency(monthlyPayment)}</span></p>
       <p><span class="result-label">Total Interest Paid:</span> <span class="result-value">${formatCurrency(totalInterestPaid)}</span></p>
       <p><span class="result-label">Total Amount Repaid:</span> <span class="result-value">${formatCurrency(totalPayments)}</span></p>
       <p class="warning-text">⚠️ Note: This calculation assumes interest is paid back to your own 401(k) account.</p>
   `;
const resultsElement = document.getElementById('results');
resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =========================================================================
// WITHDRAWAL CALCULATION LOGIC
// =========================================================================
function calculateWithdrawal() {
   const withdrawalAmount = parseFloat(document.getElementById('amount').value);
   const currentBalance = parseFloat(document.getElementById('currentBalance').value);
   const errorMessage = document.getElementById('error-message');

   // Clear previous results
   document.getElementById('loanResults').innerHTML = '';
   document.getElementById('withdrawalResults').innerHTML = '';
   errorMessage.style.display = 'none';

   if (isNaN(withdrawalAmount) || withdrawalAmount <= 0 || withdrawalAmount > currentBalance) {
       errorMessage.textContent = 'Please enter a valid withdrawal amount that is less than your current balance.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // Assumed standard penalties/taxes (simplified for this easy solution)
   const taxRate = 0.25; // Example: Assumed effective tax rate
   const earlyWithdrawalPenalty = 0.10; // Standard 10% penalty for under age 59.5

   // Calculation
   const penaltyAmount = withdrawalAmount * earlyWithdrawalPenalty;
   const taxAmount = withdrawalAmount * taxRate;
   const totalDeductions = penaltyAmount + taxAmount;
   const netTakeHome = withdrawalAmount - totalDeductions;

   // Display Results
   document.getElementById('withdrawalResults').innerHTML = `
       <h3>Withdrawal Penalty Details (Assumed Early Withdrawal)</h3>
       <p><span class="result-label">10% Early Withdrawal Penalty:</span> <span class="result-value">${formatCurrency(penaltyAmount)}</span></p>
       <p><span class="result-label">Estimated Tax Withholding (25%):</span> <span class="result-value">${formatCurrency(taxAmount)}</span></p>
       <p><span class="result-label">Total Deductions:</span> <span class="result-value text-danger">${formatCurrency(totalDeductions)}</span></p>
       <p><strong><span class="result-label">Net Take-Home Amount:</span> <span class="result-value">${formatCurrency(netTakeHome)}</span></strong></p>
       <p class="warning-text">🚨 Disclaimer: Taxes/penalties are estimates and depend on personal income and circumstances.</p>
   `;
const resultsElement = document.getElementById('results');
resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}