let nhceCount = 0;

// Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.round(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to update the minimum percentage input based on the status dropdown
function updateTopHeavyMinimum() {
   const status = document.getElementById('topHeavyStatus').value;
   const input = document.getElementById('minimumPercent');
   
   if (status === 'YES') {
       input.disabled = false;
       // Set default, but allow manual entry up to 3.0% if key employees get less
       input.value = 3.0;
   } else {
       input.disabled = true;
       input.value = 0.0;
   }
}

// Function to add a new NHCE row
function addNHCE() {
   nhceCount++;
   const tableBody = document.getElementById('nhceTableBody');
   const newRow = tableBody.insertRow();
   newRow.id = `nhce-row-${nhceCount}`;

   // Simple example data
   const initialComp = 50000 + (nhceCount % 5) * 5000;
   const initialContrib = (nhceCount % 3) === 0 ? 0 : initialComp * 0.02; // Some have match, some don't

   newRow.innerHTML = `
       <td>${nhceCount}</td>
       <td><input type="text" id="name-${nhceCount}" value="NHCE-${nhceCount}"></td>
       <td><input type="number" id="comp-${nhceCount}" value="${initialComp}" min="1" step="100"></td>
       <td><input type="number" id="existing-${nhceCount}" value="${initialContrib.toFixed(2)}" min="0" step="0.01"></td>
       <td><button onclick="removeNHCE(this)" data-id="${nhceCount}">🗑️</button></td>
   `;
}

// Function to remove an NHCE row
function removeNHCE(button) {
   const rowId = button.getAttribute('data-id');
   const row = document.getElementById(`nhce-row-${rowId}`);
   if (row) {
       row.remove();
   }
}

// Initialize with a few NHCEs
addNHCE();
addNHCE();
addNHCE();
addNHCE();


/**
* Generates the Top-Heavy Minimum Contribution Report.
*/
function generateReport() {
   const status = document.getElementById('topHeavyStatus').value;
   const minPercent = parseFloat(document.getElementById('minimumPercent').value);
   
   const tableBody = document.getElementById('nhceTableBody');
   const rows = tableBody.getElementsByTagName('tr');
   
   const contributionTableBody = document.getElementById('contributionTableBody');
   const resultsSummary = document.getElementById('resultsSummary');
   const finalAction = document.getElementById('finalAction');
   const errorMessage = document.getElementById('error-message');

   // Clear previous state
   resultsSummary.style.display = 'none';
   errorMessage.style.display = 'none';
   contributionTableBody.innerHTML = '';
   finalAction.innerHTML = '';

   if (status === 'NO') {
       finalAction.className = 'conclusion-section conclusion-pass';
       finalAction.innerHTML = 'PLAN IS NOT TOP-HEAVY: NO MINIMUM CONTRIBUTION IS REQUIRED.';
       resultsSummary.style.display = 'block';
       resultsSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
       return;
   }

   if (isNaN(minPercent) || minPercent < 0 || minPercent > 3.0) {
       errorMessage.textContent = 'Invalid Minimum Percentage input. Must be between 0.0% and 3.0%.';
       errorMessage.style.display = 'block';
       return;
   }

   let totalRequiredQNEC = 0;
   let totalNHCEs = 0;

   // --- 1. Process NHCE Data and Calculate Contributions ---
   for (let i = 0; i < rows.length; i++) {
       const row = rows[i];
       const nhceID = row.querySelector('td:nth-child(2) input').value;
       const comp = parseFloat(row.querySelector(`input[id^="comp-"]`).value);
       const existingContrib = parseFloat(row.querySelector(`input[id^="existing-"]`).value);

       if (isNaN(comp) || comp <= 0 || isNaN(existingContrib) || existingContrib < 0) {
           errorMessage.textContent = `Error in data for ${nhceID}: Compensation must be > 0 and Existing Contribution >= 0.`;
           errorMessage.style.display = 'block';
           return;
       }

       totalNHCEs++;
       
       // Calculate the required dollar amount
       const requiredMinDollar = comp * (minPercent / 100);

       // Determine the additional QNEC needed (if existing contributions are insufficient)
       let additionalQNEC = 0;
       
       // Only if existing contributions are LESS than the required minimum
       if (existingContrib < requiredMinDollar) {
           additionalQNEC = requiredMinDollar - existingContrib;
       }

       totalRequiredQNEC += additionalQNEC;

       // --- 2. Add Row to the Report Table ---
       const newRow = contributionTableBody.insertRow();
       const qnecCellClass = additionalQNEC > 0 ? 'additional-qnec' : '';

       newRow.innerHTML = `
           <td>${nhceID}</td>
           <td>${formatCurrency(comp)}</td>
           <td>${formatCurrency(existingContrib)}</td>
           <td>${formatCurrency(requiredMinDollar)}</td>
           <td class="${qnecCellClass}">**${formatCurrency(additionalQNEC)}**</td>
       `;
   }

   // --- 3. Display Summary and Conclusion ---
   document.getElementById('summaryMetrics').innerHTML = `
       <div class="metric-item">
           <div class="metric-value">${totalNHCEs}</div>
           <div class="metric-label">NHCEs Processed</div>
       </div>
       <div class="metric-item">
           <div class="metric-value">${minPercent.toFixed(1)}%</div>
           <div class="metric-label">Required Minimum Percentage</div>
       </div>
       <div class="metric-item">
           <div class="metric-value">${formatCurrency(totalRequiredQNEC)}</div>
           <div class="metric-label">TOTAL REQUIRED QNEC FUNDING</div>
       </div>
   `;

   finalAction.className = 'conclusion-section conclusion-fail';
   if (totalRequiredQNEC === 0) {
       finalAction.className = 'conclusion-section conclusion-pass';
       finalAction.innerHTML = `TOTAL QNEC REQUIRED: ${formatCurrency(totalRequiredQNEC)}. Existing Employer Contributions are sufficient to satisfy the ${minPercent.toFixed(1)}% Top-Heavy Minimum.`;
   } else {
       finalAction.innerHTML = `TOTAL QNEC REQUIRED: ${formatCurrency(totalRequiredQNEC)}. This amount must be contributed as a fully vested QNEC to the respective NHCE accounts to satisfy the Top-Heavy requirement.`;
   }

   resultsSummary.style.display = 'block';
   resultsSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}