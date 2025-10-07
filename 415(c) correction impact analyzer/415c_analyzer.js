// Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.round(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
* Core logic to analyze the 415(c) impact of an ADP/ACP refund.
*/
function analyze415c() {
   // 1. Data Collection
   const comp = parseFloat(document.getElementById('comp').value);
   const limit415cStatutory = parseFloat(document.getElementById('limit415c').value);
   
   const deferrals = parseFloat(document.getElementById('deferrals').value);
   const match = parseFloat(document.getElementById('match').value);
   const ps = parseFloat(document.getElementById('ps').value);
   const forfeitures = parseFloat(document.getElementById('forfeitures').value);
   
   const refundAmount = parseFloat(document.getElementById('refundAmount').value);

   const resultsSummary = document.getElementById('resultsSummary');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsSummary.style.display = 'none';
   errorMessage.style.display = 'none';
   document.getElementById('comparisonTableBody').innerHTML = '';
   document.getElementById('conclusion').innerHTML = '';

   // 2. Validation
   if ([comp, limit415cStatutory, deferrals, match, ps, forfeitures, refundAmount].some(isNaN) || comp <= 0) {
       errorMessage.textContent = 'Please ensure all inputs are valid positive numbers.';
       errorMessage.style.display = 'block';
       return;
   }

   // Determine the true 415(c) Annual Additions Limit
   const limit415c = Math.min(limit415cStatutory, comp);

   // 3. Initial (Pre-Refund) Annual Additions Calculation
   const initialAnnualAdditions = deferrals + match + ps + forfeitures;
   const initialExcess = Math.max(0, initialAnnualAdditions - limit415c);

   // 4. Post-Refund Annual Additions Calculation
   
   // Key Rule: A refund of elective deferrals (the ADP correction) REDUCES the Elective Deferral component of the 415(c) Annual Addition.
   const postRefundDeferrals = Math.max(0, deferrals - refundAmount);

   // All other components (Match, PS, Forfeitures) are UNCHANGED by the ADP refund, as they are not returned in the ADP correction process.
   // NOTE: This assumes the refund was ONLY elective deferrals, not a return of matched deferrals (ACP correction).
   // If the refund included matched deferrals, the associated match would also be forfeited/returned, which would decrease the match component.
   // For simplicity, we assume ADP (Deferral) refund only.
   
   const postRefundAnnualAdditions = postRefundDeferrals + match + ps + forfeitures;
   const postRefundExcess = Math.max(0, postRefundAnnualAdditions - limit415c);

   // 5. Display Summary Metrics
   document.getElementById('metricSummary').innerHTML = `
       <div class="metric-item">
           <div class="metric-value">${formatCurrency(limit415c)}</div>
           <div class="metric-label">HCE's 415(c) Limit (Lesser of $ Limit or 100% Comp)</div>
       </div>
       <div class="metric-item">
           <div class="metric-value">${formatCurrency(initialAnnualAdditions)}</div>
           <div class="metric-label">Initial Annual Additions (Pre-Refund)</div>
       </div>
       <div class="metric-item">
           <div class="metric-value">${formatCurrency(postRefundAnnualAdditions)}</div>
           <div class="metric-label">Annual Additions (Post-Refund)</div>
       </div>
   `;

   // 6. Display Comparison Table
   const tableBody = document.getElementById('comparisonTableBody');
   const data = [
       ['Elective Deferrals', deferrals, postRefundDeferrals],
       ['Employer Match', match, match],
       ['Profit Sharing/Nonelective', ps, ps],
       ['Forfeitures Allocated', forfeitures, forfeitures],
       ['**TOTAL ANNUAL ADDITIONS**', initialAnnualAdditions, postRefundAnnualAdditions]
   ];

   data.forEach(([label, initial, post]) => {
       const row = tableBody.insertRow();
       row.innerHTML = `
           <td>${label}</td>
           <td>${formatCurrency(initial)}</td>
           <td>${formatCurrency(post)}</td>
       `;
   });

   // 7. Display Conclusion
   const conclusionDiv = document.getElementById('conclusion');
   let conclusionText = '';
   let conclusionClass = '';

   if (postRefundExcess > 0) {
       conclusionClass = 'conclusion-fail';
       conclusionText = `
           <p><strong>FAILURE DETECTED!</strong></p>
           <p>The post-refund Annual Additions of ${formatCurrency(postRefundAnnualAdditions)} still exceeds the 415(c) limit of ${formatCurrency(limit415c)}.</p>
           <p><strong>REQUIRED 415(c) EXCESS CORRECTION:</strong> ${formatCurrency(postRefundExcess)}</p>
           <p class="hint-text">Correction must follow EPCRS. Generally, the plan must return (if unmatched deferral) or forfeit (if employer contribution) the excess amount, typically starting with employer contributions (Profit Sharing/Match) to satisfy the limit for the prior year.</p>
       `;
   } else if (initialExcess > 0) {
       // This handles the case where there was a 415(c) excess initially, but the ADP refund fixed it.
       conclusionClass = 'conclusion-pass';
       conclusionText = `
           <p><strong>415(c) PASS!</strong></p>
           <p>Initial Annual Additions exceeded the 415(c) limit by ${formatCurrency(initialExcess)}, but the ADP refund of ${formatCurrency(refundAmount)} eliminated the 415(c) excess.</p>
           <p>The corrected Annual Addition is ${formatCurrency(postRefundAnnualAdditions)}, which is below the limit.</p>
       `;
   } else {
        conclusionClass = 'conclusion-pass';
       conclusionText = `
           <p><strong>415(c) PASS!</strong></p>
           <p>The HCE's Annual Additions were below the 415(c) limit both before and after the ADP correction.</p>
           <p>No further 415(c) corrective action is required for this HCE.</p>
       `;
   }
   
   conclusionDiv.className = `conclusion-section ${conclusionClass}`;
   conclusionDiv.innerHTML = conclusionText;

   resultsSummary.style.display = 'block';

   // 8. AUTO-SCROLL FIX
   resultsSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}