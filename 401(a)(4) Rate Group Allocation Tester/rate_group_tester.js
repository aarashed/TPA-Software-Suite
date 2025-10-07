let employeeCount = 0;

// Function to add a new employee row
function addEmployee(status = 'NHCE', initialComp = 50000, initialAlloc = 1000) {
   employeeCount++;
   const tableBody = document.getElementById('employeeTableBody');
   const newRow = tableBody.insertRow();
   newRow.id = `emp-row-${employeeCount}`;
   newRow.className = (status === 'HCE' ? 'hce-row' : 'nhce-row');

   const statusOptions = `
       <option value="HCE" ${status === 'HCE' ? 'selected' : ''}>HCE</option>
       <option value="NHCE" ${status === 'NHCE' ? 'selected' : ''}>NHCE</option>
   `;

   // Example HCE data for demonstration
   if (status === 'HCE') {
       initialComp = 250000;
       initialAlloc = 30000;
   } else {
       initialComp = 50000;
       initialAlloc = 2000;
   }

   newRow.innerHTML = `
       <td>${employeeCount}</td>
       <td><select id="status-${employeeCount}">${statusOptions}</select></td>
       <td><input type="number" id="comp-${employeeCount}" value="${initialComp}" min="1" step="0.01"></td>
       <td><input type="number" id="alloc-${employeeCount}" value="${initialAlloc}" min="0" step="0.01"></td>
       <td><button onclick="removeEmployee(this)" data-id="${employeeCount}">🗑️</button></td>
   `;
}

// Function to remove an employee row
function removeEmployee(button) {
   const rowId = button.getAttribute('data-id');
   const row = document.getElementById(`emp-row-${rowId}`);
   if (row) {
       row.remove();
   }
}

// Initialize with a standard scenario (2 HCEs, 8 NHCEs)
addEmployee('HCE', 300000, 30000);
addEmployee('HCE', 200000, 15000);
addEmployee('NHCE', 75000, 3000);
addEmployee('NHCE', 50000, 2000);
addEmployee('NHCE', 40000, 1600);
addEmployee('NHCE', 40000, 1600);
addEmployee('NHCE', 50000, 0); // NHCE with 0 allocation
addEmployee('NHCE', 45000, 0); // NHCE with 0 allocation
addEmployee('NHCE', 60000, 2400);
addEmployee('NHCE', 55000, 2200);


/**
* Core function to run the 401(a)(4) Rate Group Test.
*/
function runRateGroupTest() {
   const tableBody = document.getElementById('employeeTableBody');
   const rows = tableBody.getElementsByTagName('tr');
   
   const allEmployees = [];
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   document.getElementById('resultsSummary').style.display = 'none';
   document.getElementById('rateGroupBody').innerHTML = '';
   errorMessage.style.display = 'none';

   // --- 1. Data Gathering and Validation ---
   for (let i = 0; i < rows.length; i++) {
       const row = rows[i];
       const id = row.querySelector('td:first-child').textContent;
       const status = row.querySelector('select').value;
       const comp = parseFloat(row.querySelector(`input[id^="comp-"]`).value);
       const alloc = parseFloat(row.querySelector(`input[id^="alloc-"]`).value);

       if (isNaN(comp) || comp <= 0 || isNaN(alloc) || alloc < 0) {
           errorMessage.textContent = `Error in data for Employee ${id}: Compensation must be > 0 and Allocation >= 0.`;
           errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
           return;
       }

       const rate = (alloc / comp) * 100;

       allEmployees.push({
           id: id,
           status: status,
           comp: comp,
           alloc: alloc,
           rate: rate
       });
   }

   if (allEmployees.length === 0) {
       errorMessage.textContent = 'Please enter data for at least one employee.';
       errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
       return;
   }

   // Filter HCEs and NHCEs
   const hces = allEmployees.filter(e => e.status === 'HCE').sort((a, b) => b.rate - a.rate);
   const nhces = allEmployees.filter(e => e.status === 'NHCE');
   
   // Total eligible for the 410(b) test
   const totalHCEs = hces.length;
   const totalNHCEs = nhces.length;

   let overallTestPassed = true;
   let rateGroupResults = [];

   // --- 2. Run Rate Group Test for Each HCE ---
   for (const hce of hces) {
       // Define the Rate Group: All employees with an Allocation Rate >= the HCE's rate
       const rateGroupMembers = allEmployees.filter(e => e.rate >= hce.rate);

       const hceInGroup = rateGroupMembers.filter(e => e.status === 'HCE').length;
       const nhceInGroup = rateGroupMembers.filter(e => e.status === 'NHCE').length;

       // Calculate the Coverage Percentage for the Rate Group (IRC 410(b) Ratio Percentage Test)
       
       // Numerator: % of NHCEs in the Rate Group
       const nhceCoveragePercent = totalNHCEs > 0 ? (nhceInGroup / totalNHCEs) : 1;

       // Denominator: % of HCEs in the Rate Group
       // In the context of the Rate Group test, the HCE group is *all* HCEs.
       const hceCoveragePercent = totalHCEs > 0 ? (hceInGroup / totalHCEs) : 1;

       // Ratio Percentage = NHCE Coverage % / HCE Coverage %
       const ratioPercentage = hceCoveragePercent > 0 ? (nhceCoveragePercent / hceCoveragePercent) * 100 : 0;
       
       // Pass/Fail: The Ratio Percentage must be 70% or higher.
       const rateGroupPassed = ratioPercentage >= 70;
       
       if (!rateGroupPassed) {
           overallTestPassed = false;
       }

       rateGroupResults.push({
           hceId: hce.id,
           hceRate: hce.rate,
           nhceCoveragePercent: nhceCoveragePercent * 100, // Display as a percentage (out of 100)
           ratioPercentage: ratioPercentage,
           status: rateGroupPassed ? 'PASSED' : 'FAILED'
       });
   }
   
   // --- 3. Display Results ---
   
   const summaryDiv = document.getElementById('summaryResults');
   const rateGroupBody = document.getElementById('rateGroupBody');
   const resultsCard = document.getElementById('resultsSummary');
   
   // Overall Conclusion
   const finalConclusionClass = overallTestPassed ? 'status-pass' : 'status-fail';
   const finalConclusionText = overallTestPassed
       ? 'OVERALL TEST PASSED: ALL RATE GROUPS SATISFY 410(b).'
       : 'OVERALL TEST FAILED: ONE OR MORE RATE GROUPS FAILED THE 410(b) TEST.';

   summaryDiv.innerHTML = `
       <div style="text-align: center; margin-bottom: 20px;">
           <span class="${finalConclusionClass}" style="font-size: 1.5em; padding: 10px 20px;">
               ${finalConclusionText}
           </span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Total Eligible HCEs</span>
           <span class="metric-value">${totalHCEs}</span>
       </div>
       <div class="metric-row">
           <span class="metric-label">Total Eligible NHCEs</span>
           <span class="metric-value">${totalNHCEs}</span>
       </div>
   `;

   // Detailed Rate Group Results
   rateGroupResults.forEach(result => {
       const newRow = rateGroupBody.insertRow();
       const statusClass = result.status === 'PASSED' ? 'status-pass' : 'status-fail';
       
       newRow.innerHTML = `
           <td>${result.hceId}</td>
           <td>${result.hceRate.toFixed(2)}%</td>
           <td>${result.nhceCoveragePercent.toFixed(2)}%</td>
           <td>${result.ratioPercentage.toFixed(2)}%</td>
           <td><span class="${statusClass}">${result.status}</span></td>
       `;
   });

   resultsCard.style.display = 'block';

   // 4. AUTO-SCROLL FIX: Scroll to the results card for visibility
   resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}