// --- IRS Uniform Lifetime Table (2022 Revision) ---
// Age -> Distribution Period (Factor)
const UNIFORM_LIFETIME_TABLE = {
   73: 26.5, 74: 25.5, 75: 24.5, 76: 23.5, 77: 22.5, 78: 21.5, 79: 20.6,
   80: 19.8, 81: 19.0, 82: 18.2, 83: 17.5, 84: 16.8, 85: 16.1, 86: 15.4,
   87: 14.7, 88: 14.1, 89: 13.4, 90: 12.8, 91: 12.2, 92: 11.6, 93: 11.0,
   94: 10.5, 95: 10.0, 96: 9.5, 97: 9.0, 98: 8.5, 99: 8.1, 100: 7.7,
   101: 7.3, 102: 6.9, 103: 6.5, 104: 6.2, 105: 5.9, 106: 5.6, 107: 5.3,
   108: 5.0, 109: 4.8, 110: 4.5, 111: 4.2, 112: 4.0, 113: 3.8, 114: 3.6,
   115: 3.4, 116: 3.1, 117: 2.9, 118: 2.7, 119: 2.5, 120: 2.3, 121: 2.1,
   122: 1.9, 123: 1.7, 124: 1.5, 125: 1.3, 126: 1.1, 127: 1.0, 128: 1.0,
   129: 1.0, 130: 1.0 // Should cover all cases
};

// Helper function
function formatCurrency(value) {
   return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function calculateRMD() {
   const priorYearBalance = parseFloat(document.getElementById('priorYearBalance').value);
   const currentAge = parseInt(document.getElementById('currentAge').value);
   
   const resultsDiv = document.getElementById('rmdResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 1. Validation
   if (isNaN(priorYearBalance) || priorYearBalance < 0 || isNaN(currentAge) || currentAge < 73 || currentAge > 125) {
       errorMessage.textContent = 'Please enter a valid Account Balance and an Age between 73 and 125.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // 2. Look up the Distribution Factor
   const factor = UNIFORM_LIFETIME_TABLE[currentAge];

   if (!factor) {
       errorMessage.textContent = `Error: Could not find a distribution factor for age ${currentAge}. Check age constraints.`;
       errorMessage.style.display = 'block';
       return;
   }

   // 3. Calculate RMD
   // RMD = Prior Year-End Balance / Distribution Factor
   const rmdAmount = priorYearBalance / factor;

   // 4. Display Results
   const formattedRmd = formatCurrency(rmdAmount);

   let actionTip = '';
   if (priorYearBalance === 0) {
        actionTip = `**Note:** The RMD is $0.00 since the account balance was $0.00 on the prior year-end.`;
   } else {
        actionTip = `**CRITICAL DEADLINE:** The participant must take a distribution of at least ${formattedRmd} by **December 31st** of the current year. Failure to do so may result in a 25% penalty on the under-distributed amount.`;
   }

   resultsDiv.innerHTML = `
       <div class="metric-row">
           <span class="metric-label">Account Balance (Prior Year End)</span>
           <span class="metric-value">${formatCurrency(priorYearBalance)}</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Participant's Age (Current Year End)</span>
           <span class="metric-value">${currentAge}</span>
       </div>
       <div class="metric-row" style="border-bottom: none;">
           <span class="metric-label">IRS Distribution Factor (from Table)</span>
           <span class="metric-value">${factor.toFixed(1)}</span>
       </div>
       
       <div style="margin-top: 30px;">
           <div class="metric-row" style="border-top: 2px solid #ccc; padding-top: 15px;">
               <span class="metric-label">Calculated Required Minimum Distribution (RMD)</span>
               <span class="metric-value rmd-result">${formattedRmd}</span>
           </div>
       </div>

       <div class="action-tip">
           <p style="font-weight: bold;">TPA Action Item/Warning:</p>
           <p>${actionTip}</p>
       </div>
       
       <p class="hint-text" style="text-align: center; margin-top: 20px;">
           **RMD Calculation Formula:** Prior Year-End Balance / Distribution Factor
       </p>
   `;

   // 5. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}