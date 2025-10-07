// Helper function to format currency
function formatCurrency(value) {
   // Ensure value is a number and fix to 2 decimal places before formatting
   return '$' + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function calculate415cExcess() {
   // Inputs
   const comp = parseFloat(document.getElementById('participantCompensation').value);
   const statutoryLimit = parseFloat(document.getElementById('statutoryDollarLimit').value);
   const deferrals = parseFloat(document.getElementById('electiveDeferrals').value);
   const afterTax = parseFloat(document.getElementById('afterTaxContributions').value);
   const employerMatch = parseFloat(document.getElementById('employerMatch').value);
   const profitSharing = parseFloat(document.getElementById('profitSharing').value);
   const forfeitures = parseFloat(document.getElementById('forfeitureAllocations').value);
   
   const summaryDiv = document.getElementById('summaryResults');
   const correctionDiv = document.getElementById('correctionResults');
   const correctionCard = document.getElementById('correctionSummary');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   summaryDiv.innerHTML = '';
   correctionDiv.innerHTML = '';
   correctionCard.style.display = 'none';
   errorMessage.style.display = 'none';

   // 1. Validation and Constraints
   if (isNaN(comp) || comp <= 0 || isNaN(statutoryLimit) || statutoryLimit <= 0 ||
       isNaN(deferrals) || deferrals < 0 || isNaN(afterTax) || afterTax < 0 ||
       isNaN(employerMatch) || employerMatch < 0 || isNaN(profitSharing) || profitSharing < 0 ||
       isNaN(forfeitures) || forfeitures < 0) {
       errorMessage.textContent = 'Please enter valid positive values for Compensation and Statutory Limit, and non-negative values for all contributions.';
       errorMessage.style.display = 'block';
       // Auto-scroll to show error
       document.getElementById('error-message').scrollIntoView({ behavior: 'smooth', block: 'start' });
       return;
   }
   
   // 2. Calculate the 415(c) Limit
   // The limit is the lesser of the statutory dollar limit OR 100% of compensation
   const limit415c = Math.min(statutoryLimit, comp);
   
   // 3. Calculate Total Annual Additions
   const totalAdditions = deferrals + afterTax + employerMatch + profitSharing + forfeitures;
   
   // 4. Calculate the Excess
   let excessAmount = Math.max(0, totalAdditions - limit415c);
   
   // 5. Display Initial Summary
   summaryDiv.innerHTML = `
       <div class="metric-row">
           <span class="metric-label">415(c) Annual Additions Dollar Limit</span>
           <span class="metric-value">${formatCurrency(statutoryLimit)}</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">415(c) Annual Additions Compensation Limit (100% of Comp)</span>
           <span class="metric-value">${formatCurrency(comp)}</span>
       </div>
       <div class="metric-row" style="background-color: #f0fff4;">
           <span class="metric-label"><strong>Actual 415(c) Limit (Lesser of the two)</strong></span>
           <span class="metric-value" style="color: #28a745;"><strong>${formatCurrency(limit415c)}</strong></span>
       </div>
       <div class="metric-row" style="margin-top: 15px;">
           <span class="metric-label">Total Annual Additions Made</span>
           <span class="metric-value" style="color: ${excessAmount > 0 ? '#dc3545' : '#007bff'};">${formatCurrency(totalAdditions)}</span>
       </div>
       <div class="metric-row" style="border-top: 2px solid #004d99; padding-top: 15px;">
           <span class="metric-label"><strong>TOTAL EXCESS ANNUAL ADDITION</strong></span>
           <span class="metric-value" style="font-size: 1.3em; color: ${excessAmount > 0 ? '#dc3545' : '#28a745'};"><strong>${formatCurrency(excessAmount)}</strong></span>
       </div>
   `;

   // 6. Correction Logic (only run if there is an excess)
   if (excessAmount > 0) {
       correctionCard.style.display = 'block';
       let correctionSteps = '';

       // Working copies of contributions for correction hierarchy
       let w_afterTax = afterTax;
       let w_deferrals = deferrals;
       let w_match = employerMatch;
       let w_profitSharing = profitSharing;
       let totalRefunds = 0;
       let totalForfeitures = 0;
       
       // --- Correction Tier 1: Refund Unmatched After-Tax Contributions (if any) ---
       // Note: We are ignoring earnings for simplicity here, but a real TPA system would include them.
       let amountToRefund1 = Math.min(excessAmount, w_afterTax);
       if (amountToRefund1 > 0) {
           correctionSteps += `
               <div class="correction-step">
                   <span class="correction-type">STEP 1: REFUND (Employee Money)</span><br>
                   Refund **Unmatched After-Tax Contributions**: <span class="correction-value">${formatCurrency(amountToRefund1)}</span>
               </div>`;
           excessAmount -= amountToRefund1;
           w_afterTax -= amountToRefund1;
           totalRefunds += amountToRefund1;
       }

       // --- Correction Tier 2: Refund Unmatched Elective Deferrals ---
       // This is simplified to assume all deferrals are unmatched. A real plan may track matched/unmatched portions.
       // For a general calculator, we assume any remaining deferrals are available for refund.
       let amountToRefund2 = Math.min(excessAmount, w_deferrals);
       if (amountToRefund2 > 0) {
           correctionSteps += `
               <div class="correction-step">
                   <span class="correction-type">STEP 2: REFUND (Employee Money)</span><br>
                   Refund **Elective Deferrals (Pre-Tax/Roth)**: <span class="correction-value">${formatCurrency(amountToRefund2)}</span>
               </div>`;
           excessAmount -= amountToRefund2;
           w_deferrals -= amountToRefund2;
           totalRefunds += amountToRefund2;
       }

       // --- Correction Tier 3: Refund Matched Deferrals and Forfeit Associated Match ---
       // This is complex and usually requires a distribution/forfeiture ratio. We simplify by prioritizing refund/forfeit.
       // Since we already used all available deferrals in step 2 (simplified), we can skip a separate tier 3,
       // or prioritize forfeiting employer money (match) next if excess remains, which is the spirit of EPCRS.
       // For this tool, we move to forfeiting pure employer contributions.
       
       // --- Correction Tier 4: Forfeit Employer Matching Contributions ---
       let amountToForfeit1 = Math.min(excessAmount, w_match);
       if (amountToForfeit1 > 0) {
           correctionSteps += `
               <div class="correction-step">
                   <span class="correction-type">STEP 3: FORFEIT (Employer Money)</span><br>
                   Forfeit **Employer Matching Contributions** and move to 415 Suspense Account: <span class="correction-value">${formatCurrency(amountToForfeit1)}</span>
               </div>`;
           excessAmount -= amountToForfeit1;
           w_match -= amountToForfeit1;
           totalForfeitures += amountToForfeit1;
       }

       // --- Correction Tier 5: Forfeit Profit Sharing/Nonelective Contributions ---
       let amountToForfeit2 = Math.min(excessAmount, w_profitSharing);
       if (amountToForfeit2 > 0) {
           correctionSteps += `
               <div class="correction-step">
                   <span class="correction-type">STEP 4: FORFEIT (Employer Money)</span><br>
                   Forfeit **Profit Sharing/Nonelective Contributions** and move to 415 Suspense Account: <span class="correction-value">${formatCurrency(amountToForfeit2)}</span>
               </div>`;
           excessAmount -= amountToForfeit2;
           w_profitSharing -= amountToForfeit2;
           totalForfeitures += amountToForfeit2;
       }

       // --- Final Summary ---
       correctionDiv.innerHTML = correctionSteps;
       
       if (excessAmount > 0) {
           correctionDiv.insertAdjacentHTML('beforeend', `<div class="error-message">CRITICAL ERROR: Excess amount still remains: ${formatCurrency(excessAmount)}. Check inputs or use a more detailed method.</div>`);
       } else {
           // Final Summary Row
           correctionDiv.insertAdjacentHTML('beforeend', `
               <div class="metric-row" style="border-top: 3px solid #dc3545; margin-top: 20px;">
                   <span class="metric-label" style="color: #dc3545;"><strong>TOTAL REFUND TO PARTICIPANT (1099-R)</strong></span>
                   <span class="metric-value" style="color: #dc3545;"><strong>${formatCurrency(totalRefunds)}</strong></span>
               </div>
               <div class="metric-row">
                   <span class="metric-label" style="color: #dc3545;"><strong>TOTAL FORFEITURE TO 415 SUSPENSE ACCOUNT</strong></span>
                   <span class="metric-value" style="color: #dc3545;"><strong>${formatCurrency(totalForfeitures)}</strong></span>
               </div>
               <p class="hint-text" style="text-align: center; margin-top: 20px;">Total correction: ${formatCurrency(totalRefunds + totalForfeitures)}. The correction is complete. The forfeited amount must be tracked in a 415 Suspense Account.</p>
           `);
       }

       // 7. AUTO-SCROLL FIX: Scroll to the correction results for visibility
       correctionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

   } else {
       // If no excess
       correctionCard.style.display = 'block';
       correctionDiv.innerHTML = `<div class="success-message">No 415(c) excess was found. Total annual additions are within the limits.</div>`;
        // 7. AUTO-SCROLL FIX: Scroll to the results for visibility
       document.getElementById('limitSummary').scrollIntoView({ behavior: 'smooth', block: 'start' });
   }
}