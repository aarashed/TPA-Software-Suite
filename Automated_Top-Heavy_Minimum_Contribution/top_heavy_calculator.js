// --- Global Constants ---
const TOP_HEAVY_THRESHOLD = 0.60; // 60% ratio
const REQUIRED_MINIMUM_RATE = 0.03; // 3% minimum contribution

// Helper function
function formatPercentage(value) {
   return (value * 100).toFixed(2) + '%';
}

function calculateTopHeavy() {
   const keyBalance = parseFloat(document.getElementById('keyBalance').value);
   const totalBalance = parseFloat(document.getElementById('totalBalance').value);
   const highestKeyRate = parseFloat(document.getElementById('highestKeyRate').value) / 100; // Convert to decimal
   
   const resultsDiv = document.getElementById('topHeavyResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 1. Validation
   if (isNaN(keyBalance) || keyBalance < 0 || isNaN(totalBalance) || totalBalance <= 0 || isNaN(highestKeyRate) || highestKeyRate < 0) {
       errorMessage.textContent = 'Please enter valid, non-negative numbers for all inputs. Total Plan Balance must be greater than zero.';
       errorMessage.style.display = 'block';
       return;
   }
   
   if (keyBalance > totalBalance) {
       errorMessage.textContent = "Error: Key Employee Balance cannot exceed the Total Plan Balance.";
       errorMessage.style.display = 'block';
       return;
   }


   // 2. Calculate Top-Heavy Ratio (THR)
   const topHeavyRatio = keyBalance / totalBalance;
   const isTopHeavy = topHeavyRatio > TOP_HEAVY_THRESHOLD;


   // 3. Determine Required Minimum Contribution Rate
   let requiredNKERate; // Non-Key Employee Rate
   let statusClass;
   let actionTip;
   
   if (isTopHeavy) {
       statusClass = 'fail-status';
       
       // The required rate is the lesser of 3% OR the highest key employee contribution rate.
       // If the highest key rate is 0%, the required rate is 0%.
       if (highestKeyRate > 0) {
           requiredNKERate = Math.min(REQUIRED_MINIMUM_RATE, highestKeyRate);
       } else {
           // If Key Employees received no contributions, no minimum is required
           requiredNKERate = 0;
       }

       if (requiredNKERate > 0) {
           actionTip = `**ACTION REQUIRED:** The plan is Top-Heavy. For the next plan year, all Non-Key Employees must receive a minimum employer contribution of **${formatPercentage(requiredNKERate)}%** of their compensation. This can be offset by existing match/profit sharing contributions.`;
       } else {
            actionTip = `**STATUS NOTE:** The plan is Top-Heavy, but since no Key Employee received a contribution greater than 0% this year, the required minimum contribution for Non-Key Employees is 0%.`;
       }
       
   } else {
       // Plan passes
       statusClass = 'pass-status';
       requiredNKERate = 0;
       actionTip = 'The plan is currently **NOT** Top-Heavy. No mandatory minimum contribution is required for Non-Key Employees for the next plan year based on this determination date.';
   }
   
   // 4. Display Results
   resultsDiv.innerHTML = `
       <div class="metric-row">
           <span class="metric-label">Key Employee Balance / Total Plan Balance</span>
           <span class="metric-value">${keyBalance.toLocaleString('en-US')} / ${totalBalance.toLocaleString('en-US')}</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Calculated Top-Heavy Ratio (THR)</span>
           <span class="metric-value ${topHeavyRatio > TOP_HEAVY_THRESHOLD ? 'fail-status' : 'pass-status'}" style="font-size: 1.2em;">${formatPercentage(topHeavyRatio)}</span>
       </div>
       <div class="metric-row" style="border-bottom: none;">
           <span class="metric-label">IRS Top-Heavy Threshold</span>
           <span class="metric-value">60.00%</span>
       </div>
       
       <div style="margin-top: 30px;">
           <div class="metric-row" style="border-top: 2px solid #ccc; padding-top: 15px;">
               <span class="metric-label">Compliance Status</span>
               <span class="metric-value ${statusClass}">${isTopHeavy ? 'FAIL' : 'PASS'}</span>
           </div>
           <div class="metric-row" style="border-bottom: 2px solid #ccc;">
               <span class="metric-label">Required Minimum Contribution for NKEs</span>
               <span class="metric-value ${requiredNKERate > 0 ? 'fail-status' : 'pass-status'}">${formatPercentage(requiredNKERate)}</span>
           </div>
       </div>

       <div class="action-tip">
           <p style="font-weight: bold;">TPA Action Item:</p>
           <p>${actionTip}</p>
       </div>
       
       <p class="hint-text" style="text-align: center; margin-top: 20px;">
           *Top-Heavy status is determined on the last day of the prior plan year (the determination date) and applies to the next plan year.
       </p>
   `;

   // 5. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}