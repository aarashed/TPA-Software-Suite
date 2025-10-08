let hceCount = 0;

// Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to add a new HCE row to the data table
function addHCE(initialComp = 180000, initialDef = 12000, initialMatch = 7200) {
   hceCount++;
   const tableBody = document.getElementById('hceTableBody');
   const newRow = tableBody.insertRow();
   newRow.id = `hce-row-${hceCount}`;

   newRow.innerHTML = `
       <td>HCE ${hceCount}</td>
       <td><input type="number" id="comp-${hceCount}" value="${initialComp}" min="0" step="0.01"></td>
       <td><input type="number" id="def-${hceCount}" value="${initialDef}" min="0" step="0.01"></td>
       <td><input type="number" id="match-${hceCount}" value="${initialMatch}" min="0" step="0.01"></td>
       <td><button onclick="removeHCE(this)" data-id="${hceCount}">🗑️</button></td>
   `;
}

// Function to remove an HCE row
function removeHCE(button) {
   const rowId = button.getAttribute('data-id');
   const row = document.getElementById(`hce-row-${rowId}`);
   if (row) {
       row.remove();
       // We do not decrease hceCount here to keep ID unique, but we will recalculate on run
   }
}

// Initialize with a few sample HCEs
addHCE(300000, 23000, 15000);
addHCE(180000, 10000, 7200);
addHCE(200000, 15000, 9000);

// Core function to run ADP or ACP test and correction
function performTest(nhceRate, hceData, type) {
   // 1. Determine the maximum allowed HCE average
   const maxAllowedRate = Math.min(
       nhceRate * 1.25,
       nhceRate + 2
   );

   // 2. Calculate initial HCE average
   const totalHceRate = hceData.reduce((sum, hce) => sum + hce.rate, 0);
   const hceAverage = totalHceRate / hceData.length;

   // 3. Determine if the test fails
   const isFailed = hceAverage > maxAllowedRate;

   let correctionData = [];
   let requiredTotalRefund = 0;

   if (isFailed) {
       // --- Correction Phase 1: Determine Total Excess $ (Top-Down Percentage Leveling) ---
       // This process determines the total dollar amount that must be refunded.
       
       let targetRate = maxAllowedRate;
       let sortedHceByRate = [...hceData].sort((a, b) => b.rate - a.rate);
       
       // Calculate the total required percentage reduction
       let totalExcessContribution = 0;
       
       for (let hce of sortedHceByRate) {
           if (hce.rate > targetRate) {
               // Calculate the contribution excess based on the percentage
               let excessRate = hce.rate - targetRate;
               let excessContribution = hce.comp * (excessRate / 100);
               
               totalExcessContribution += excessContribution;
               
               // For the next HCE, the target rate is the lowest of the current HCE's rate
               // (after reduction) or the next highest HCE's rate.
               targetRate = hce.rate;
           }
       }
       
       // The total amount that needs to be removed from the plan is totalExcessContribution
       requiredTotalRefund = totalExcessContribution;
       
       // --- Correction Phase 2: Distribute Total Excess $ (Top-Down Dollar Leveling) ---
       // The actual refund is assigned to HCEs starting with the largest DOLLAR AMOUNT of contribution.
       
       let refundRemaining = requiredTotalRefund;
       let sortedHceByAmount = [...hceData].sort((a, b) => b.amount - a.amount);
       
       correctionData = sortedHceByAmount.map(hce => ({ ...hce, refund: 0, newRate: hce.rate }));

       for (let i = 0; i < correctionData.length; i++) {
           let currentHCE = correctionData[i];
           let nextHCEAmount = (i < correctionData.length - 1) ? correctionData[i+1].amount : 0;
           
           if (refundRemaining <= 0) break;

           // Difference between current HCE's amount and the next HCE's amount (or 0)
           let difference = currentHCE.amount - nextHCEAmount;
           
           // The maximum amount that can be reduced from this HCE before leveling with the next one
           let maxReduction = difference * (i + 1);
           
           let reductionAmount = Math.min(refundRemaining, maxReduction);
           let individualReduction = reductionAmount / (i + 1);

           // Apply the individual reduction to all HCEs from the top (i.e., this HCE and all previous ones)
           for (let j = 0; j <= i; j++) {
               // Only reduce if the HCE still has money left to refund
               let refundApplied = Math.min(correctionData[j].amount - correctionData[j].refund, individualReduction);
               correctionData[j].refund += refundApplied;
               refundRemaining -= refundApplied;
           }
       }
   }
   
   // Final Calculation of New Rates
   correctionData.forEach(hce => {
       hce.newAmount = hce.amount - hce.refund;
       hce.newRate = hce.newAmount / hce.comp * 100;
   });

   return {
       isFailed,
       nhceRate,
       maxAllowedRate,
       hceAverage,
       requiredTotalRefund,
       correctionData
   };
}


function runAdpAcpTests() {
   const nhceAdp = parseFloat(document.getElementById('nhceAdp').value);
   const nhceAcp = parseFloat(document.getElementById('nhceAcp').value);
   
   const hceRows = document.getElementById('hceTableBody').getElementsByTagName('tr');
   
   const hceDataADP = [];
   const hceDataACP = [];
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   document.getElementById('adpResults').style.display = 'none';
   document.getElementById('acpResults').style.display = 'none';
   errorMessage.style.display = 'none';

   // --- 1. Data Collection and Validation ---
   for (let i = 0; i < hceRows.length; i++) {
       const rowId = hceRows[i].id.split('-')[2];
       const comp = parseFloat(document.getElementById(`comp-${rowId}`).value);
       const deferrals = parseFloat(document.getElementById(`def-${rowId}`).value);
       const match = parseFloat(document.getElementById(`match-${rowId}`).value);

       if (isNaN(comp) || comp <= 0 || isNaN(deferrals) || deferrals < 0 || isNaN(match) || match < 0) {
           errorMessage.textContent = 'Please ensure all Compensation, Deferral, and Match/After-Tax inputs are valid positive numbers.';
           errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
           return;
       }

       hceDataADP.push({
           id: `HCE ${rowId}`, comp, amount: deferrals, rate: (deferrals / comp) * 100
       });

       hceDataACP.push({
           id: `HCE ${rowId}`, comp, amount: match, rate: (match / comp) * 100
       });
   }

   if (hceDataADP.length === 0) {
       errorMessage.textContent = 'Please add at least one HCE to run the test.';
       errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
       return;
   }

   // --- 2. Run ADP Test ---
   const adpResult = performTest(nhceAdp, hceDataADP, 'ADP');
   displayResults(adpResult, 'adp', 'Elective Deferral');

   // --- 3. Run ACP Test ---
   const acpResult = performTest(nhceAcp, hceDataACP, 'ACP');
   displayResults(acpResult, 'acp', 'Matching Contribution');

   // 4. AUTO-SCROLL FIX: Scroll to the results card for visibility
   document.getElementById('adpResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Function to display the test results
function displayResults(result, prefix, contributionType) {
   const summaryDiv = document.getElementById(`${prefix}Summary`);
   const correctionBody = document.getElementById(`${prefix}CorrectionBody`);
   const resultsCard = document.getElementById(`${prefix}Results`);

   summaryDiv.innerHTML = `
       <div class="metric-row">
           <span class="metric-label">NHCE Average ${prefix.toUpperCase()} (%)</span>
           <span class="metric-value">${result.nhceRate.toFixed(2)}%</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">HCE Maximum Allowable ${prefix.toUpperCase()} (%)</span>
           <span class="metric-value">${result.maxAllowedRate.toFixed(2)}%</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Actual HCE Average ${prefix.toUpperCase()} (%)</span>
           <span class="metric-value" style="color: ${result.isFailed ? '#dc3545' : '#28a745'};">
               ${result.hceAverage.toFixed(2)}%
           </span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Test Status:</span>
           <span class="${result.isFailed ? 'status-fail' : 'status-pass'}">
               ${result.isFailed ? 'FAILED' : 'PASSED'}
           </span>
       </div>
   `;

   correctionBody.innerHTML = '';
   resultsCard.style.display = 'block';

   if (result.isFailed) {
       summaryDiv.insertAdjacentHTML('beforeend', `
           <div class="metric-row" style="border-top: 2px solid #dc3545; margin-top: 15px;">
               <span class="metric-label" style="color: #dc3545;"><strong>TOTAL REQUIRED REFUND (${contributionType})</strong></span>
               <span class="metric-value" style="font-size: 1.3em; color: #dc3545;">
                   <strong>${formatCurrency(result.requiredTotalRefund)}</strong>
               </span>
           </div>
           <p class="hint-text" style="text-align: center; margin-top: 15px;">
               The total dollar amount required to be refunded is calculated using the complex 'top-down' leveling method based on HCE *contribution dollars*.
           </p>
       `);

       // Display individual correction data
       result.correctionData.forEach(hce => {
           const newRow = correctionBody.insertRow();
           newRow.innerHTML = `
               <td>${hce.id}</td>
               <td>${hce.rate.toFixed(2)}%</td>
               <td style="font-weight: bold; color: ${hce.refund > 0 ? '#dc3545' : '#333'};">${formatCurrency(hce.refund)}</td>
               <td>${hce.newRate.toFixed(2)}%</td>
           `;
       });
   } else {
       // Test Passed
       correctionBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #28a745; font-weight: bold;">No correction required. The test passed.</td></tr>`;
   }
}



document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('export-button');
    
    if (exportButton) {
        exportButton.addEventListener('click', async () => {
            
            // Wait for the asynchronous PDF generation process to complete
            await exportPageToPDF(
                "ADP/ACP NDT & Correction", // Page Title
                ["#adpResults", "#acpResults", "#hceDataTable", "#adpCorrectionTable", "#acpCorrectionTable"] // All elements to capture visually
            );
        });
    }
});


