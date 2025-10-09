let ownerCount = 0;

// Function to add dynamic owner input fields
function addOwner() {
   ownerCount++;
   const ownerInputs = document.getElementById('ownerInputs');
   
   // Limit the input to 5, as the Brother-Sister test only cares about 5 or fewer common owners
   if (ownerCount > 5) {
       alert("The Brother-Sister test only considers the ownership of 5 or fewer common owners.");
       ownerCount = 5; // Keep the count at 5 if user tries to add more
       return;
   }

   const newOwnerDiv = document.createElement('div');
   newOwnerDiv.className = 'owner-row';
   newOwnerDiv.id = `owner-${ownerCount}`;
   
   newOwnerDiv.innerHTML = `
       <div class="owner-input-half">
           <label for="ownerA-${ownerCount}">Owner ${ownerCount} - Co. A (%)</label>
           <input type="number" id="ownerA-${ownerCount}" value="0" min="0" max="100" step="1" required>
       </div>
       <div class="owner-input-half">
           <label for="ownerB-${ownerCount}">Owner ${ownerCount} - Co. B (%)</label>
           <input type="number" id="ownerB-${ownerCount}" value="0" min="0" max="100" step="1" required>
       </div>
   `;
   ownerInputs.appendChild(newOwnerDiv);
}

// Initialize with two owners for a typical scenario
addOwner();
addOwner();


function runControlledGroupTest() {
   const parentSubsidiaryOwnership = parseFloat(document.getElementById('parentSubsidiaryOwnership').value);
   const asgServiceRevenue = parseFloat(document.getElementById('asgServiceRevenue').value);
   
   const testResultsDiv = document.getElementById('testResults');
   const resultsSummaryCard = document.getElementById('resultsSummary');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   testResultsDiv.innerHTML = '';
   resultsSummaryCard.style.display = 'none';
   errorMessage.style.display = 'none';

   let isControlledGroup = false;
   let resultsHTML = '';
   let ownerData = [];
   
   // --- 1. Validate and Gather Brother-Sister Data ---
   for (let i = 1; i <= ownerCount; i++) {
       const ownerA = parseFloat(document.getElementById(`ownerA-${i}`).value);
       const ownerB = parseFloat(document.getElementById(`ownerB-${i}`).value);
       
       if (isNaN(ownerA) || ownerA < 0 || ownerA > 100 || isNaN(ownerB) || ownerB < 0 || ownerB > 100) {
           errorMessage.textContent = 'Please ensure all owner percentage inputs are valid numbers between 0 and 100.';
           errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
           return;
       }

       ownerData.push({
           owner: `Owner ${i}`,
           a: ownerA,
           b: ownerB,
           // Calculate Common Ownership: The ownership percentage common to both companies
           common: Math.min(ownerA, ownerB)
       });
   }

   // --- 2. Test 1: Parent-Subsidiary Group (IRC 414(c)) ---
   const isParentSubsidiary = parentSubsidiaryOwnership >= 80;
   
   resultsHTML += `
       <div class="test-result-row">
           <span class="test-label">1. Parent-Subsidiary Test (80% ownership):</span>
           <span style="float: right; color: ${isParentSubsidiary ? '#dc3545' : '#28a745'};">
               ${isParentSubsidiary ? 'FAILED (80% or More)' : 'PASSED (Less than 80%)'}
           </span>
           <p class="hint-text">Company A owns ${parentSubsidiaryOwnership}% of Company B.</p>
       </div>
   `;

   if (isParentSubsidiary) {
       isControlledGroup = true;
   }


   // --- 3. Test 2: Brother-Sister Group (IRC 414(c)) ---
   let totalCommonOwnership = ownerData.reduce((sum, owner) => sum + owner.common, 0);
   let totalOwnershipA = ownerData.reduce((sum, owner) => sum + owner.a, 0);
   let totalOwnershipB = ownerData.reduce((sum, owner) => sum + owner.b, 0);
   
   // Effective Control Test (50% Common Ownership)
   const isBrotherSister_50 = totalCommonOwnership >= 50;

   resultsHTML += `
       <div class="test-result-row">
           <span class="test-label">2. Brother-Sister - Effective Control Test (50% Common Ownership):</span>
           <span style="float: right; color: ${isBrotherSister_50 ? '#dc3545' : '#28a745'};">
               ${isBrotherSister_50 ? 'FAILED (50% or More)' : 'PASSED (Less than 50%)'}
           </span>
           <p class="hint-text">Total Common Ownership: ${totalCommonOwnership.toFixed(1)}%</p>
       </div>
   `;
   
   // The formal Brother-Sister test requires BOTH the 80% and 50% tests to fail (i.e., meet the thresholds)
   // The 80% test is the total ownership of the common group in EACH company.
   // For simplicity and to flag high risk: we focus on the 50% Effective Control, which is the main trigger.
   
   if (isBrotherSister_50) {
       isControlledGroup = true;
   }
   
   // --- 4. Test 3: Affiliated Service Group (ASG) (IRC 414(m)) ---
   // This is a high-level prompt, as the ASG test is highly facts-and-circumstances dependent.
   const isHighServiceRevenue = asgServiceRevenue > 50; // Flagging over 50% as a high-risk indicator

   resultsHTML += `
       <div class="test-result-row">
           <span class="test-label">3. Affiliated Service Group (ASG) Flag:</span>
           <span style="float: right; color: ${isHighServiceRevenue ? '#dc3545' : '#28a745'};">
               ${isHighServiceRevenue ? 'HIGH RISK' : 'Low Risk'}
           </span>
           <p class="hint-text">Service Revenue Concentration: ${asgServiceRevenue.toFixed(1)}%. Consult TPA/Counsel if over 50% and entities perform similar services.</p>
       </div>
   `;
   
   
   // --- 5. Final Conclusion ---
   let conclusionClass = '';
   let conclusionText = '';
   
   if (isControlledGroup) {
       conclusionClass = 'conclusion-fail';
       conclusionText = 'CONCLUSION: LIKELY A CONTROLLED GROUP (CG) EXISTS.';
       resultsHTML += `<p class="hint-text" style="color: #721c24; margin-top: 20px;">ACTION REQUIRED: Both entities must be aggregated and tested as a single employer. Failure to do so will result in plan disqualification.</p>`;
   } else {
       conclusionClass = 'conclusion-pass';
       conclusionText = 'CONCLUSION: NO CONTROLLED GROUP (CG) LIKELY EXISTS.';
       resultsHTML += `<p class="hint-text" style="color: #155724; margin-top: 20px;">CAUTION: This does not rule out a more complex Affiliated Service Group (ASG) or the Combined Group test. Consult counsel if the ASG flag is High Risk.</p>`;
   }

   testResultsDiv.innerHTML = `<div class="conclusion-box ${conclusionClass}">${conclusionText}</div>` + resultsHTML;
   resultsSummaryCard.style.display = 'block';

   // 6. AUTO-SCROLL FIX: Scroll to the results card for visibility
   resultsSummaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}