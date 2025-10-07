// Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.max(0, value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to update the descriptive notes based on the compensation definition selected
function updateCompNotes() {
   const baseDefinition = document.getElementById('baseDefinition').value;
   const notesElement = document.getElementById('compNotes');
   
   if (baseDefinition === 'W2') {
       notesElement.textContent = "Plan Comp = W-2 (Box 1) + Deferrals - Exclusions. (This is the most common Safe Harbor definition)";
   } else {
       notesElement.textContent = "Plan Comp = Gross Pay (W-2 + Deferrals + Exclusions) - Exclusions. (The W-2 amount may not be sufficient on its own.)";
   }
}

/**
* Validates the reported Plan Compensation against the calculated amount.
*/
function validateCompensation() {
   // 1. Data Collection
   const baseDefinition = document.getElementById('baseDefinition').value;
   const w2 = parseFloat(document.getElementById('w2').value);
   const deferrals = parseFloat(document.getElementById('deferrals').value);
   const excludedBonus = parseFloat(document.getElementById('excludedBonus').value);
   const excludedFringe = parseFloat(document.getElementById('excludedFringe').value);
   const clientReportedComp = parseFloat(document.getElementById('clientReportedComp').value);

   const resultsSummary = document.getElementById('resultsSummary');
   const breakdownTableBody = document.getElementById('breakdownTableBody');
   const conclusionDiv = document.getElementById('conclusion');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsSummary.style.display = 'none';
   errorMessage.style.display = 'none';
   breakdownTableBody.innerHTML = '';
   conclusionDiv.innerHTML = '';

   // 2. Validation
   if ([w2, deferrals, excludedBonus, excludedFringe, clientReportedComp].some(isNaN) || w2 < 0 || clientReportedComp < 0) {
       errorMessage.textContent = 'Please ensure all compensation and deferral inputs are valid positive numbers.';
       errorMessage.style.display = 'block';
       return;
   }

   // 3. CORE CALCULATION LOGIC
   let planCompensation = 0;
   
   if (baseDefinition === 'W2') {
       // Standard 415 Safe Harbor Comp (W-2 plus Deferrals)
       planCompensation = w2 + deferrals;
   } else {
       // 415 Compensation (W-2 plus Deferrals plus Exclusions)
       // Since we don't have true Gross Pay, we use the W-2 starting point and adjust back.
       // W-2 = Gross Pay - Deferrals - Certain Pre-tax Benefits.
       // For simplicity in this tool, we assume the calculation is W2 + Deferrals
       // This is a common starting point used by TPAs when full Gross Pay details are unavailable.
       planCompensation = w2 + deferrals;
   }

   // Apply specific plan exclusions/inclusions
   // (Note: Since W-2 already excludes deferrals, we add them back if needed for 415 comp)
   // The exclusions below are applied regardless of the base definition if the plan explicitly excludes them.
   planCompensation -= excludedBonus;
   planCompensation -= excludedFringe;

   // 4. Comparison and Output
   const difference = planCompensation - clientReportedComp;
   const isMatch = Math.abs(difference) < 1.00; // Allow a small tolerance for rounding

   // Display Summary
   document.getElementById('metricSummary').innerHTML = `
       <div class="metric-item-large">
           <div class="metric-value-large">${formatCurrency(planCompensation)}</div>
           <div class="metric-label-large">CALCULATED PLAN COMPENSATION</div>
       </div>
   `;

   // Breakdown Table
   const breakdownData = [
       ['Base: W-2 Income (Box 1)', w2, 'BASE', 'action-base'],
       ['Adjust: Elective Deferrals', deferrals, '+ ADD', 'action-add'],
       ['Exclude: Bonus/Commission', excludedBonus, '- SUBTRACT', 'action-subtract'],
       ['Exclude: Fringe Benefits', excludedFringe, '- SUBTRACT', 'action-subtract'],
   ];

   breakdownData.forEach(([label, amount, action, actionClass]) => {
       const row = breakdownTableBody.insertRow();
       row.innerHTML = `
           <td>${label}</td>
           <td>${formatCurrency(amount)}</td>
           <td class="${actionClass}">${action}</td>
       `;
   });

   // Conclusion
   let conclusionClass = '';
   let conclusionText = '';

   if (isMatch) {
       conclusionClass = 'conclusion-match';
       conclusionText = `
           <p><strong>SUCCESS: COMPENSATION MATCHES.</strong></p>
           <p>Calculated Plan Compensation (${formatCurrency(planCompensation)}) matches the Client Reported amount (${formatCurrency(clientReportedComp)}). Data integrity confirmed.</p>
       `;
   } else {
       conclusionClass = 'conclusion-mismatch';
       conclusionText = `
           <p><strong>CRITICAL MISMATCH DETECTED!</strong></p>
           <p><strong>Calculated:</strong> ${formatCurrency(planCompensation)}</p>
           <p><strong>Client Reported:</strong> ${formatCurrency(clientReportedComp)}</p>
           <p><strong>Difference:</strong> ${formatCurrency(Math.abs(difference))}</p>
           <p class="hint-text" style="color:#721c24;">ACTION REQUIRED: The client must update their compensation records to match the Plan Document definition before any compliance tests are run. This error invalidates all testing.</p>
       `;
   }
   
   conclusionDiv.className = `conclusion-section ${conclusionClass}`;
   conclusionDiv.innerHTML = conclusionText;

   resultsSummary.style.display = 'block';
   resultsSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}