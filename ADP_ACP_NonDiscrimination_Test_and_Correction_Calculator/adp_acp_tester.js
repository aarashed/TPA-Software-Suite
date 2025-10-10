let hceCount = 0;
// --- DYNAMIC DATA SETUP ---
let CURRENT_PLAN_RULES = null;

// Fallback limits and rules for ADP/ACP
const FALLBACK_LIMITS_KEYS = {
    // This must contain the specific limit used in this tool
    hce_comp_test: 155000, 
};
const FALLBACK_RULES_KEYS = {
    safe_harbor: false // Default to NOT Safe Harbor
};

// Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper function to safely retrieve a limit (CRITICAL FIX: NaN Resilience)
function getLimit(key) {
    let value = FALLBACK_LIMITS_KEYS[key]; // Start with fallback value

    // 1. Try to get value from dynamically loaded rules
    if (CURRENT_PLAN_RULES && CURRENT_PLAN_RULES.LIMITS && CURRENT_PLAN_RULES.LIMITS[key] !== undefined) {
        value = CURRENT_PLAN_RULES.LIMITS[key];
    }
    
    // 2. Final check: Ensure the value is a valid number before returning
    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }
    
    // 3. If invalid, return the fallback (must be defined in FALLBACK_LIMITS_KEYS)
    return FALLBACK_LIMITS_KEYS[key]; 
}

// Helper function to safely retrieve a plan rule
function getRule(key) {
    let value = FALLBACK_RULES_KEYS[key]; // Start with fallback value

    if (CURRENT_PLAN_RULES && CURRENT_PLAN_RULES.CLIENT_XYZ && CURRENT_PLAN_RULES.CLIENT_XYZ[key] !== undefined) {
        value = CURRENT_PLAN_RULES.CLIENT_XYZ[key];
    }
    
    if (key === 'safe_harbor' && typeof value === 'boolean') {
        return value;
    }

    return FALLBACK_RULES_KEYS[key];
}


// --- DYNAMIC DATA LISTENER ---
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'INITIAL_PLAN_CONFIG') {
        CURRENT_PLAN_RULES = event.data.rules;
        console.log("Received Plan Rules for ADP/ACP Calc:", CURRENT_PLAN_RULES);
        // Call initialize *after* data is received
        initializeCalculator(CURRENT_PLAN_RULES); 
    }
});

/**
 * Sends a message to the parent dashboard requesting the config data be resent.
 */
window.requestConfigReload = function() {
    const displayElement = document.getElementById('current-limits-display');
    if (displayElement) {
        displayElement.className = 'result-box result-info'; 
        displayElement.innerHTML = `<p style="font-weight: 600;">Requesting updated Plan Configuration...</p>`;
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
    // Safely retrieve limits and rules
    const HCE_COMP_LIMIT = getLimit('hce_comp_test');
    const IS_SAFE_HARBOR = getRule('safe_harbor');
    
    let messageHtml = '';
    let statusClass = 'result-box result-success';
    
    // Check if configuration was loaded successfully
    if (!rules || !rules.LIMITS || rules.LIMITS.hce_comp_test === undefined) {
        statusClass = 'result-box result-warning';
        messageHtml = `
            <p style="color: var(--color-warning); font-weight: 600; margin-top: 5px;">
                ⚠️ Warning: Plan Configuration failed to load fully. Using default limits/rules.
            </p>
        `;
    }

    const safeHarborStatusText = IS_SAFE_HARBOR ? 'Yes (Test Waived)' : 'No (Traditional Test)';
    const safeHarborStatusColor = IS_SAFE_HARBOR ? 'var(--color-success)' : 'var(--color-warning)';

    const displayElement = document.getElementById('current-limits-display');
    
    if (displayElement) {
        displayElement.className = `${statusClass}`;
        displayElement.innerHTML = `
            <p style="font-weight: 600; margin-bottom: 5px;">Plan Configuration (Loaded):</p>
            <div style="display: flex; justify-content: center; gap: 30px; font-size: 1.1em; flex-wrap: wrap;">
                <p><strong>HCE Comp Test Limit:</strong> <span style="font-weight: 700;">${formatCurrency(HCE_COMP_LIMIT)}</span></p>
                <p><strong>Safe Harbor Status:</strong> <span style="font-weight: 700; color: ${safeHarborStatusColor};">${safeHarborStatusText}</span></p>
            </div>
            ${messageHtml}
        `;
    }

    // --- Only initialize with sample HCEs if the table is empty ---
    const tableBody = document.getElementById('hceTableBody');
    if (tableBody && tableBody.rows.length === 0) {
        window.addHCE(200000, 15000, 8000); 
        window.addHCE(150000, 10000, 5000);
    }
}


// Function to add a new HCE row to the data table
window.addHCE = function(initialComp = 180000, initialDef = 12000, initialMatch = 7200) {
   hceCount++;
   const tableBody = document.getElementById('hceTableBody');
   const newRow = tableBody.insertRow();
   newRow.id = `hce-row-${hceCount}`;

   newRow.innerHTML = `
       <td>HCE ${hceCount}</td>
       <td><input type="number" id="comp-${hceCount}" value="${initialComp}" min="0" step="0.01" class="hce-input-comp"></td>
       <td><input type="number" id="def-${hceCount}" value="${initialDef}" min="0" step="0.01" class="hce-input-deferral"></td>
       <td><input type="number" id="match-${hceCount}" value="${initialMatch}" min="0" step="0.01" class="hce-input-match"></td>
       <td><button onclick="removeHCE(this)" data-id="${hceCount}">🗑️</button></td>
   `;
}

// Function to remove an HCE row
window.removeHCE = function(button) {
   const rowId = button.getAttribute('data-id');
   const row = document.getElementById(`hce-row-${rowId}`);
   if (row) {
       row.remove();
   }
}

// Function to clear all HCE rows
window.clearHCEs = function() {
    const tableBody = document.getElementById('hceTableBody');
    tableBody.innerHTML = '';
    hceCount = 0; // Reset count
}

// Helper to determine the maximum allowed ADP/ACP based on NHCE rate
function getAllowedMax(nhceRate) {
    // NHCE Rate is passed as a percentage (e.g., 4.0 for 4%)
    if (nhceRate <= 2.0) return nhceRate * 2;
    if (nhceRate <= 8.0) return nhceRate + 2.0;
    return nhceRate * 1.25;
}


// =========================================================================
// MAIN CALCULATION FUNCTION
// =========================================================================

function calculateADPAC() {
    const IS_SAFE_HARBOR = getRule('safe_harbor');
    
    // Clear previous results
    document.getElementById('adpResults').style.display = 'none';
    document.getElementById('acpResults').style.display = 'none';
    document.getElementById('adpCorrectionTable').style.display = 'none';
    document.getElementById('acpCorrectionTable').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('adpCorrectionBody').innerHTML = '';
    document.getElementById('acpCorrectionBody').innerHTML = '';
    
    // --- Safe Harbor Check (Early Exit) ---
    if (IS_SAFE_HARBOR) {
        document.getElementById('adpResults').style.display = 'block';
        document.getElementById('adpResults').innerHTML = `
            <div class="success-message">
                <h2>ADP/ACP Test Waived</h2>
                <p style="font-size: 1.1em;">This plan is configured as a **Safe Harbor 401(k) Plan**.</p>
                <p>The ADP and ACP Nondiscrimination Tests are automatically deemed to be satisfied...</p>
            </div>
        `;
        document.getElementById('adpResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return; 
    }
    
    // --- Traditional Testing ---
    const nhceAdpRate = parseFloat(document.getElementById('nhceAdp').value) / 100; // Convert to decimal
    const nhceAcpRate = parseFloat(document.getElementById('nhceAcp').value) / 100; // Convert to decimal

    if (isNaN(nhceAdpRate) || isNaN(nhceAcpRate)) {
        document.getElementById('error-message').textContent = 'Please enter valid NHCE rates.';
        document.getElementById('error-message').style.display = 'block';
        return;
    }

    const hceData = getHCEInputData();
    
    if (hceData.length === 0) {
        document.getElementById('error-message').textContent = 'Please add at least one HCE with valid compensation to run the test.';
        document.getElementById('error-message').style.display = 'block';
        return;
    }

    const adpResult = runTest(hceData, nhceAdpRate, 'deferral', 'ADP');
    const acpResult = runTest(hceData, nhceAcpRate, 'match', 'ACP');
    
    displayTestResults(adpResult, 'adp', nhceAdpRate * 100); 
    displayTestResults(acpResult, 'acp', nhceAcpRate * 100); 
    
    document.getElementById('adpResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function getHCEInputData() {
    const hceData = [];
    const tableBody = document.getElementById('hceTableBody');
    const rows = tableBody.rows;
    
    const rowIDs = Array.from(rows).map(row => row.id.split('-').pop());

    rowIDs.forEach(id => {
        const compElement = document.getElementById(`comp-${id}`);
        const defElement = document.getElementById(`def-${id}`);
        const matchElement = document.getElementById(`match-${id}`);
        
        if (!compElement || !defElement || !matchElement) return;

        const comp = parseFloat(compElement.value);
        const def = parseFloat(defElement.value);
        const match = parseFloat(matchElement.value);
        
        if (isNaN(comp) || comp <= 0 || isNaN(def) || isNaN(match)) return; 

        hceData.push({
            id: `HCE ${id}`,
            comp: comp,
            deferral: def,
            match: match,
            adpRate: (def / comp),
            acpRate: (match / comp)
        });
    });
    return hceData;
}


function runTest(hceData, nhceRateDecimal, contributionKey, testName) {
    const hceRates = hceData.map(hce => hce[`${contributionKey}Rate`]);
    
    if (hceRates.length === 0) {
        return { testName: testName, nhceRate: nhceRateDecimal * 100, hceRate: NaN, allowedMax: getAllowedMax(nhceRateDecimal * 100), passed: false, correctionData: [], requiredRefundTotal: 0 }; 
    }
    
    const avgHceRate = hceRates.reduce((sum, rate) => sum + rate, 0) / hceRates.length;
    
    const allowedMaxPercent = getAllowedMax(nhceRateDecimal * 100);
    const allowedMaxDecimal = allowedMaxPercent / 100; 
    
    const passed = avgHceRate <= allowedMaxDecimal;

    const correctionData = [];
    let requiredRefundTotal = 0;
    
    let targetHceRate = allowedMaxDecimal; 

    if (!passed) {
        
        let sortedHCEs = hceData.map(hce => ({
            ...hce,
            rate: hce[`${contributionKey}Rate`],
            contribution: hce[contributionKey]
        })).sort((a, b) => b.rate - a.rate); 

        let tempHCEs = JSON.parse(JSON.stringify(sortedHCEs)); 
        
        let shouldContinueLeveling = true;
        
        while (shouldContinueLeveling) {
            
            let wasReduced = false;
            
            tempHCEs = tempHCEs.map(hce => {
                if (hce.rate > targetHceRate) {
                    let maxContributionAllowed = hce.comp * targetHceRate;
                    let refund = hce.contribution - maxContributionAllowed;
                    
                    if (refund < 0) refund = 0;
                    
                    if (refund > 0) {
                        requiredRefundTotal += refund;
                        hce.contribution -= refund;
                        hce.rate = hce.contribution / hce.comp;
                        wasReduced = true;
                    }
                }
                return hce;
            });
            
            tempHCEs.sort((a, b) => b.rate - a.rate);
            let newAvg = tempHCEs.reduce((sum, hce) => sum + hce.rate, 0) / tempHCEs.length;
            
            if (newAvg <= allowedMaxDecimal) {
                shouldContinueLeveling = false;
            } else if (!wasReduced) {
                 shouldContinueLeveling = false;
            } else {
                targetHceRate = tempHCEs[0].rate; 
            }
        }
        
        hceData.forEach(originalHCE => {
            const finalHCE = tempHCEs.find(hce => hce.id === originalHCE.id);
            const refundAmount = originalHCE[contributionKey] - finalHCE.contribution;
            
            correctionData.push({
                id: originalHCE.id,
                rate: originalHCE[`${contributionKey}Rate`] * 100,
                refund: refundAmount,
                newRate: finalHCE.rate * 100
            });
        });
        
    }


    return {
        testName: testName,
        nhceRate: nhceRateDecimal * 100,
        hceRate: avgHceRate * 100,
        allowedMax: allowedMaxDecimal * 100,
        passed: passed,
        correctionData: correctionData,
        requiredRefundTotal: requiredRefundTotal
    };
}


function displayTestResults(result, testId, nhceRatePercent) {
    const resultsDiv = document.getElementById(`${testId}Results`);
    const correctionTable = document.getElementById(`${testId}CorrectionTable`);
    const correctionBody = document.getElementById(`${testId}CorrectionBody`);
    
    resultsDiv.style.display = 'block';
    correctionTable.style.display = 'none';
    
    let passFailClass = result.passed ? 'result-success' : 'result-error';
    let passFailText = result.passed ? 'PASSED' : 'FAILED';
    let allowedMaxPercent = getAllowedMax(nhceRatePercent);
    
    resultsDiv.className = `card result-card ${passFailClass}`;
    
    const hceRateDisplay = isNaN(result.hceRate) ? 'N/A' : result.hceRate.toFixed(2);
    
    resultsDiv.innerHTML = `
        <h2>${result.testName} Test Results: <span style="font-weight: bold;">${passFailText}</span></h2>
        
        <p><span class="metric-label">NHCE ${result.testName}:</span> <span class="metric-value">${result.nhceRate.toFixed(2)}%</span></p>
        <p><span class="metric-label">HCE ${result.testName} (Pre-Correction):</span> <span class="metric-value">${hceRateDisplay}%</span></p>
        
        <div class="metric-row" style="border-top: 1px solid #ddd; margin: 10px 0;">
            <span class="metric-label"><strong>Maximum Allowed HCE ${result.testName}:</strong></span>
            <span class="metric-value"><strong>${result.allowedMax.toFixed(2)}%</strong></span>
        </div>
        
        <p class="hint-text" style="text-align: center;">
            *The HCE ${result.testName} must be less than or equal to ${result.nhceRate.toFixed(2)}% + 2% 
            (or ${allowedMaxPercent.toFixed(2)}%) to pass.
        </p>
    `;

    if (!result.passed) {
        correctionTable.style.display = 'block';
        
        const oldFooter = correctionTable.querySelector('tfoot');
        if (oldFooter) oldFooter.remove();

        correctionTable.insertAdjacentHTML('beforeend', `
           <tfoot style="font-weight: bold; border-top: 2px solid #dc3545;">
               <tr>
                   <td colspan="2" style="text-align: right; padding-right: 10px;">Total Required ${result.testName === 'ADP' ? 'Refund' : 'Correction'}:</td>
                   <td style="color: #dc3545;">${formatCurrency(result.requiredRefundTotal)}</td>
                   <td></td>
               </tr>
           </tfoot>
       `);
       
        correctionBody.innerHTML = ''; 
        result.correctionData.forEach(hce => {
            const newRow = correctionBody.insertRow();
            newRow.innerHTML = `
                <td>${hce.id}</td>
                <td>${hce.rate.toFixed(2)}%</td>
                <td style="font-weight: bold; color: ${hce.refund > 0 ? '#dc3545' : '#333'};">${formatCurrency(hce.refund)}</td>
                <td>${hce.newRate.toFixed(2)}%</td>
            `;
        });
        
        correctionTable.insertAdjacentHTML('afterend', `<p class="hint-text" style="text-align: center; margin-top: 15px;">
               The total dollar amount required to be ${result.testName === 'ADP' ? 'refunded' : 'corrected'} is calculated using the complex 'top-down' leveling method...
           </p>`);

    } else {
        correctionBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #28a745; font-weight: bold;">No correction required. The test passed.</td></tr>`;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    requestConfigReload();

    const calculateButton = document.getElementById('calculateButton');
    if (calculateButton) {
        calculateButton.addEventListener('click', calculateADPAC);
    }

    const exportButton = document.getElementById('export-button');
    if (exportButton) {
        exportButton.addEventListener('click', async () => {
            await exportPageToPDF(
                "ADP/ACP NDT & Correction",
                ["#adpResults", "#acpResults", "#hceDataTable", "#adpCorrectionTable", "#acpCorrectionTable"]
            );
        });
    }
});

// --- PDF EXPORT (FINALIZED UTILITY) ---
async function exportPageToPDF(title, elementSelectors) {
    const loadingOverlay = document.getElementById('pdf-loading-overlay');
    
    // 1. Show loading overlay
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    // 2. Allow UI to update before processing
    await new Promise(resolve => setTimeout(resolve, 50)); 

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 10;
    
    doc.setFontSize(18);
    doc.text(title, 10, y);
    y += 5;
    
    for (const selector of elementSelectors) {
        const element = document.querySelector(selector);
        if (element && element.style.display !== 'none') {
            try {
                // Reduced scale to 1.0 and use JPEG for small file size (1-3MB)
                const canvas = await html2canvas(element, { scale: 1.0 }); 
                const imgData = canvas.toDataURL('image/jpeg', 0.8); // 0.8 quality
                
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth() - 20;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                if (y + pdfHeight > doc.internal.pageSize.getHeight() - 10) {
                    doc.addPage();
                    y = 10;
                }
                
                doc.addImage(imgData, 'JPEG', 10, y, pdfWidth, pdfHeight);
                y += pdfHeight + 5; 
            } catch (error) {
                console.error(`Error capturing element ${selector}:`, error);
            }
        }
    }
    
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    
    // 3. Hide loading overlay after download starts
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}