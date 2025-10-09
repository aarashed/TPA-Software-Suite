// --- DYNAMIC DATA SETUP ---
let CURRENT_PLAN_RULES = null;

// Fallback limits for 415(c) (must match Dashboard defaults)
const FALLBACK_LIMITS_KEYS = {
    section_415c: 69000 // 2024 Limit, used for fallback
};

// Helper function to format currency
function formatCurrency(value) {
   // Ensure value is a number and fix to 2 decimal places before formatting
   return '$' + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper function to safely retrieve a limit
function getLimit(key) {
    if (CURRENT_PLAN_RULES && CURRENT_PLAN_RULES.LIMITS && CURRENT_PLAN_RULES.LIMITS[key] !== undefined) {
        return CURRENT_PLAN_RULES.LIMITS[key];
    }
    // Return the default fallback if the entire rules object is missing or the key is missing
    return FALLBACK_LIMITS_KEYS[key];
}


// --- DYNAMIC DATA LISTENER (Universal Snippet) ---
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'INITIAL_PLAN_CONFIG') {
        CURRENT_PLAN_RULES = event.data.rules;
        console.log("Received Plan Rules for 415(c) Calc:", CURRENT_PLAN_RULES);
        initializeCalculator(CURRENT_PLAN_RULES); 
    }
});

/**
 * Sends a message to the parent dashboard requesting the config data be resent.
 */
function requestConfigReload() {
    const displayElement = document.getElementById('current-limits-display');
    if (displayElement) {
        displayElement.className = 'result-box result-info'; 
        displayElement.innerHTML = `<p style="font-weight: 600;">Requesting updated 415(c) Limit...</p>`;
    }
    
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_CONFIG' }, '*');
    } else {
        console.warn("Script is running outside of an iframe. Cannot send REQUEST_CONFIG. Using local defaults.");
        setTimeout(() => initializeCalculator(null), 50); 
    }
}

// Initialization function: Displays the dynamic status and limit
function initializeCalculator(rules) {
    // Safely retrieve the needed limit
    const STATUTORY_LIMIT = getLimit('section_415c');
    
    let messageHtml = '';
    let statusClass = 'result-box result-success';
    
    // Check if limits were loaded successfully
    if (!rules || !rules.LIMITS || rules.LIMITS.section_415c === undefined) {
        statusClass = 'result-box result-warning';
        messageHtml = `
            <p style="color: var(--color-warning); font-weight: 600; margin-top: 5px;">
                ⚠️ Warning: 415(c) statutory limit failed to load fully. Using default limit for calculation.
            </p>
        `;
    }

    const displayElement = document.getElementById('current-limits-display');
    
    if (displayElement) {
        displayElement.className = `${statusClass}`;
        displayElement.innerHTML = `
            <p style="font-weight: 600; margin-bottom: 5px;">Current 415(c) Statutory Limit (Loaded):</p>
            <div style="display: flex; justify-content: center; gap: 30px; font-size: 1.1em; flex-wrap: wrap;">
                <p><strong>Section 415(c) Dollar Limit:</strong> <span style="font-weight: 700;">${formatCurrency(STATUTORY_LIMIT)}</span></p>
            </div>
            ${messageHtml}
        `;
    }
}
// --- END DYNAMIC DATA SETUP ---


// =========================================================================
// 415(C) EXCESS CALCULATION LOGIC
// =========================================================================

function calculate415cExcess() {
   // Inputs
   const comp = parseFloat(document.getElementById('participantCompensation').value);
   
   // DYNAMICALLY RETRIEVE STATUTORY LIMIT
   const statutoryLimit = getLimit('section_415c'); 
   
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
   if (isNaN(comp) || comp <= 0 || 
       isNaN(deferrals) || deferrals < 0 || isNaN(afterTax) || afterTax < 0 ||
       isNaN(employerMatch) || employerMatch < 0 || isNaN(profitSharing) || profitSharing < 0 || isNaN(forfeitures) || forfeitures < 0) {
       errorMessage.textContent = 'Please enter valid numbers for compensation and all contribution fields.';
       errorMessage.style.display = 'block';
       return;
   }
   
   // 2. Calculate Annual Additions (AA)
   const totalAnnualAdditions = afterTax + employerMatch + profitSharing + forfeitures + deferrals;
   
   // 3. Calculate 415(c) Limit
   // The limit is the lesser of the statutory dollar limit OR 100% of compensation
   const limit415c = Math.min(statutoryLimit, comp);

   // 4. Determine Excess
   let excessAA = Math.max(0, totalAnnualAdditions - limit415c);
   
   // 5. Display Summary
   summaryDiv.innerHTML = `
       <p><span class="metric-label">Statutory 415(c) Dollar Limit:</span> <span class="metric-value">${formatCurrency(statutoryLimit)}</span></p>
       <p><span class="metric-label">100% of Participant Compensation:</span> <span class="metric-value">${formatCurrency(comp)}</span></p>
       <div class="metric-row" style="border-top: 1px solid #ddd; margin: 10px 0;">
           <span class="metric-label"><strong>Applicable 415(c) Limit:</strong></span>
           <span class="metric-value"><strong>${formatCurrency(limit415c)}</strong></span>
       </div>
       <p style="margin-top: 15px;"><span class="metric-label">Total Annual Additions:</span> <span class="metric-value">${formatCurrency(totalAnnualAdditions)}</span></p>
       
       <div class="metric-row" style="border-top: 2px solid ${excessAA > 0 ? '#dc3545' : '#28a745'}; margin-top: 20px; padding-top: 10px;">
           <span class="metric-label" style="font-size: 1.1em; color: ${excessAA > 0 ? '#dc3545' : '#28a745'};"><strong>Total 415(c) Excess:</strong></span>
           <span class="metric-value" style="font-size: 1.2em; color: ${excessAA > 0 ? '#dc3545' : '#28a745'};"><strong>${formatCurrency(excessAA)}</strong></span>
       </div>
   `;
   
   // 6. Correction Hierarchy (Only run if there is an excess)
   if (excessAA > 0) {
       correctionCard.style.display = 'block';
       let correctionSteps = [];
       let currentExcess = excessAA;
       let totalRefunds = 0;
       let totalForfeitures = 0;
       
       // a) Refund Elective Deferrals (if applicable)
       let refundDeferrals = Math.min(currentExcess, deferrals);
       currentExcess -= refundDeferrals;
       totalRefunds += refundDeferrals;
       correctionSteps.push(`Refund Elective Deferrals: ${formatCurrency(refundDeferrals)}`);
       
       // b) Refund After-Tax Contributions (if applicable)
       let refundAfterTax = Math.min(currentExcess, afterTax);
       currentExcess -= refundAfterTax;
       totalRefunds += refundAfterTax;
       correctionSteps.push(`Refund After-Tax Contributions: ${formatCurrency(refundAfterTax)}`);

       // c) Forfeit Non-Vested Employer Contributions (Match, PS, Nonelective)
       // This calculator assumes *all* employer contributions (Match, PS) are non-vested for correction purposes,
       // unless otherwise specified (not in the current inputs). The actual amount forfeited is the lesser of
       // the remaining excess and the total employer contributions + forfeitures.
       const totalEmployerContributions = employerMatch + profitSharing + forfeitures;
       let amountToForfeit = Math.min(currentExcess, totalEmployerContributions);
       currentExcess -= amountToForfeit;
       totalForfeitures += amountToForfeit;
       correctionSteps.push(`Forfeit Employer Contributions: ${formatCurrency(amountToForfeit)}`);

       
       // Display Correction Steps
       let stepsHtml = '<ul>';
       correctionSteps.forEach(step => {
           stepsHtml += `<li>${step}</li>`;
       });
       stepsHtml += '</ul>';
       
       correctionDiv.innerHTML = stepsHtml;

       // Display Final Summary
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


document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL INITIALIZATION STEP
    requestConfigReload();
});