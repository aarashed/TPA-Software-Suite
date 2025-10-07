// Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.max(0, value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
* Calculates the maximum remaining Profit Sharing contribution.
*/
function calculateMaxPS() {
   // 1. Data Collection
   const comp = parseFloat(document.getElementById('comp').value);
   const limit415cStatutory = parseFloat(document.getElementById('limit415cStatutory').value);
   
   const deferrals = parseFloat(document.getElementById('deferrals').value);
   const match = parseFloat(document.getElementById('match').value);
   const forfeitures = parseFloat(document.getElementById('forfeitures').value);
   const qnec = parseFloat(document.getElementById('qnec').value); // Prior QNECs that count as PS/Nonelective

   const resultsSummary = document.getElementById('resultsSummary');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsSummary.style.display = 'none';
   errorMessage.style.display = 'none';
   document.getElementById('analysisTableBody').innerHTML = '';
   document.getElementById('conclusion').innerHTML = '';

   // 2. Validation
   if ([comp, limit415cStatutory, deferrals, match, forfeitures, qnec].some(isNaN) || comp <= 0 || limit415cStatutory <= 0) {
       errorMessage.textContent = 'Please ensure all inputs are valid positive numbers. Compensation and 415(c) Limit must be greater than zero.';
       errorMessage.style.display = 'block';
       return;
   }

   // 3. Determine the True 415(c) Annual Additions Limit
   // The limit is the lesser of the statutory dollar amount OR 100% of compensation.
   const limit415c = Math.min(limit415cStatutory, comp);

   // 4. Calculate Current Annual Additions (excluding the future PS contribution)
   const existingAnnualAdditions = deferrals + match + forfeitures + qnec;

   // 5. Calculate Maximum Remaining Profit Sharing Contribution
   const maxProfitSharing = Math.max(0, limit415c - existingAnnualAdditions);

   // 6. Display Summary Metrics
   document.getElementById('metricSummary').innerHTML = `
       <div class="metric-item-large">
           <div class="metric-value-large">${formatCurrency(maxProfitSharing)}</div>
           <div class="metric-label-large">MAXIMUM REMAINING PROFIT SHARING CONTRIBUTION</div>
       </div>
   `;

   // 7. Display Analysis Table
   const tableBody = document.getElementById('analysisTableBody');
   const data = [
       ['415(c) Limit (Lesser of 100% Comp or Dollar Limit)', limit415c],
       ['**Contributions Already Made (Annual Additions)**', ''],
       ['Elective Deferrals', deferrals],
       ['Employer Matching Contributions', match],
       ['Forfeitures Allocated', forfeitures],
       ['Prior QNEC/QMAC (treated as PS)', qnec],
   ];

   data.forEach(([label, amount]) => {
       const row = tableBody.insertRow();
       row.innerHTML = `
           <td>${label}</td>
           <td>${amount !== '' ? formatCurrency(amount) : ''}</td>
       `;
   });

   const totalRow = tableBody.insertRow();
   totalRow.className = 'total-row';
   totalRow.innerHTML = `
       <td>Total Existing Annual Additions</td>
       <td>${formatCurrency(existingAnnualAdditions)}</td>
   `;
   
   // 8. Display Conclusion
   const conclusionDiv = document.getElementById('conclusion');
   let conclusionClass = 'conclusion-pass';

   if (maxProfitSharing === 0 && existingAnnualAdditions >= limit415c) {
       conclusionClass = 'conclusion-fail';
       conclusionDiv.innerHTML = `
           <p><strong>ALERT: LIMIT REACHED!</strong></p>
           <p>The HCE has already met or exceeded the 415(c) limit of ${formatCurrency(limit415c)} with existing contributions. No further contributions are permitted.</p>
       `;
   } else {
       conclusionDiv.innerHTML = `
           <p><strong>PLANNING COMPLETE.</strong></p>
           <p>The HCE can receive up to <strong>${formatCurrency(maxProfitSharing)}</strong> as a Profit Sharing or other Nonelective contribution without violating the $\text{415}(\text{c})$ limit.</p>
       `;
   }
   
   conclusionDiv.className = `conclusion-section ${conclusionClass}`;
   resultsSummary.style.display = 'block';

   // 9. AUTO-SCROLL FIX
   resultsSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}