// Helper function to format percentages
function formatPercentage(value) {
   return (value).toFixed(2) + '%';
}

// =========================================================================
// ADP NONDISCRIMINATION TEST LOGIC
// =========================================================================

function checkADPRisk() {
   // Inputs are percentages (e.g., 3.5 means 3.5%)
   const nhceAvg = parseFloat(document.getElementById('nhceAvg').value);
   const hceAvg = parseFloat(document.getElementById('hceAvg').value);
   
   const resultsDiv = document.getElementById('ndtResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 1. Validation
   if (isNaN(nhceAvg) || nhceAvg < 0 || isNaN(hceAvg) || hceAvg < 0) {
       errorMessage.textContent = 'Please enter valid positive percentages for both fields.';
       errorMessage.style.display = 'block';
       return;
   }

   // 2. ADP Test Calculation (The maximum HCE average allowed)
   let maxHCEAvg;
   let applicableRule;

   if (nhceAvg <= 2.0) {
       // RULE 1: NHCE Average (0% to 2%) -> HCE Max is NHCE Average + 2%
       maxHCEAvg = nhceAvg + 2.0;
       applicableRule = `NHCE Avg (≤ 2%) + 2%`;
   } else if (nhceAvg <= 8.0) {
       // RULE 2: NHCE Average (2% to 8%) -> HCE Max is NHCE Average + 2%
       maxHCEAvg = nhceAvg + 2.0;
       applicableRule = `NHCE Avg (+2% Rule)`;
       
       // Check the second part of the alternative test (2x rule)
       const maxHCEAvg_2x = nhceAvg * 2.0;
       if (maxHCEAvg_2x < maxHCEAvg) {
           // The IRS test is the LESSER of NHCE Avg + 2% OR 2x NHCE Avg,
           // but the rules are simplified:
           // - If NHCE is 2% to 8%, use the LESSER of: (NHCE + 2%) or (NHCE * 2).
           // - However, ADP test requires HCE ADP must NOT exceed 125% of NHCE ADP OR
           //   be the lesser of 200% of NHCE ADP OR NHCE ADP + 2%.
           // The simpler combined IRS test is:
           // If NHCE Avg is 2% - 8%: HCE Max is NHCE Avg + 2%.
       }

   } else { // nhceAvg > 8.0
       // RULE 3: NHCE Average (> 8%) -> HCE Max is 125% of NHCE Average
       maxHCEAvg = nhceAvg * 1.25;
       applicableRule = `NHCE Avg (> 8%) x 125%`;
   }

   // --- Determine Pass/Fail Status ---
   const isPassing = hceAvg <= maxHCEAvg;
   let statusText = isPassing ? 'PASSING' : 'RISK OF FAILURE';
   let statusClass = isPassing ? 'pass-status' : 'fail-status';
   
   // --- Determine Suggested Action ---
   let actionTip;
   if (isPassing) {
       actionTip = `The plan currently passes the ADP test margin. To maximize HCE contributions, the HCE average can safely increase up to ${formatPercentage(maxHCEAvg)}.`;
   } else {
       const requiredNHCEIncrease = (hceAvg - maxHCEAvg);
       actionTip = `The HCE average exceeds the limit by ${formatPercentage(requiredNHCEIncrease.toFixed(2))}. To pass, HCE contributions may need to be refunded, or NHCE contributions must increase. Consider a Safe Harbor election.`;
   }

   // 3. Display Results
   resultsDiv.innerHTML = `
       <p style="text-align: center; margin-bottom: 25px;">
           The plan's current ADP status is: <span class="${statusClass}">${statusText}</span>
       </p>

       <div class="summary-row">
           <span class="result-label">NHCE Average Deferral Percentage:</span>
           <span class="result-value">${formatPercentage(nhceAvg)}</span>
       </div>
       <div class="summary-row">
           <span class="result-label">Maximum Allowed HCE Deferral Percentage:</span>
           <span class="result-value" style="color: ${isPassing ? '#004d99' : '#dc3545'};">${formatPercentage(maxHCEAvg)}</span>
       </div>
       <div class="summary-row">
           <span class="result-label">Actual HCE Deferral Percentage:</span>
           <span class="result-value" style="color: ${isPassing ? '#28a745' : '#dc3545'};">${formatPercentage(hceAvg)}</span>
       </div>
       
       <div style="margin-top: 25px; padding: 15px; border: 1px solid #ccc; border-radius: 8px;">
           <p style="font-weight: bold; margin-bottom: 10px; color: #004d99;">Action Item:</p>
           <p style="margin-top: 0;">${actionTip}</p>
           <p style="font-size: 0.9em; color: #777;">(Applicable Rule: ${applicableRule})</p>
       </div>
   `;

   // 4. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}