let hceCount = 0;
// --- DYNAMIC DATA SETUP ---
let CURRENT_PLAN_RULES = null;

// Fallback limits and rules for ADP/ACP
const FALLBACK_LIMITS_KEYS = {
    // This must contain the specific limit used in this tool
    hce_comp_test: 155000, // 2024 HCE compensation limit
};
const FALLBACK_RULES_KEYS = {
    safe_harbor: false // Default to NOT Safe Harbor
};

// Helper function to format currency
function formatCurrency(value) {
   // Use Math.abs to ensure positive sign for formatting, but handle negative logic elsewhere
   return '$' + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Helper function to safely retrieve a limit.
 * @param {string} key - The key for the limit.
 * @returns {number} The limit value.
 */
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

/**
 * Helper function to safely retrieve a plan rule.
 * @param {string} key - The key for the rule.
 * @returns {*} The rule value (e.g., boolean).
 */
function getRule(key) {
    let value = FALLBACK_RULES_KEYS[key];

    if (CURRENT_PLAN_RULES && CURRENT_PLAN_RULES.RULES && CURRENT_PLAN_RULES.RULES[key] !== undefined) {
        value = CURRENT_PLAN_RULES.RULES[key];
    }

    return value;
}

/**
 * Displays an error message in the dedicated error div.
 * @param {string} message 
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    if (message) {
        errorDiv.classList.add('visible');
    } else {
        errorDiv.classList.remove('visible');
    }
}

/**
 * Displays the loaded limits in the dedicated information box.
 */
function displayCurrentLimits() {
    const display = document.getElementById('current-limits-display');
    const hceLimit = getLimit('hce_comp_test');
    const isSafeHarbor = getRule('safe_harbor');
    
    // Determine the HCE compensation test text
    const hceText = isNaN(hceLimit) 
        ? 'N/A' 
        : `\$${hceLimit.toLocaleString('en-US')}`;

    display.innerHTML = `
        <p><strong>Plan Configuration Summary:</strong></p>
        <ul>
            <li><strong>Highly Compensated Employee (HCE) Threshold:</strong> ${hceText} (Based on HCE Compensation Test limit)</li>
            <li><strong>Safe Harbor Status:</strong> <span class="${isSafeHarbor ? 'text-success' : 'text-danger'}">${isSafeHarbor ? 'YES' : 'NO'}</span></li>
        </ul>
        <p class="hint-text">Note: Safe Harbor plans are typically exempt from the ADP/ACP test.</p>
    `;
}

// Function to run when configuration data is explicitly missing (e.g., initial load timeout)
function displayFallbackLimits() {
    // Only display fallbacks if the main rules are not set
    if (CURRENT_PLAN_RULES) return;
    const display = document.getElementById('current-limits-display');
    display.innerHTML = `
        <p style="color: #dc3545; font-weight: bold;">WARNING: Failed to load plan configuration. Using default IRS limits.</p>
        <ul>
            <li><strong>Highly Compensated Employee (HCE) Threshold:</strong> \$${FALLBACK_LIMITS_KEYS['hce_comp_test'].toLocaleString('en-US')}</li>
            <li><strong>Safe Harbor Status:</strong> NO (Plan is assumed NOT to be Safe Harbor)</li>
        </ul>
        <p class="hint-text">Use the 'Reload Plan Config' button if data should be available.</p>
    `;
}

// Universal handler for messages from the parent window (used to receive dynamic configuration)
window.addEventListener('message', handleConfigMessage, false);

function handleConfigMessage(event) {
    // Standard checks to ensure message is from a trusted source and is the correct format
    if (typeof event.data !== 'object' || event.data === null) {
        return;
    }

    // Check if the message contains the configuration data
    if (event.data.type === 'PLAN_CONFIG_RESPONSE' && event.data.config) {
        CURRENT_PLAN_RULES = event.data.config;
        displayCurrentLimits();
    }
}

/**
 * Sends a message to the parent window requesting a reload of the plan configuration.
 */
function requestConfigReload() {
    // Inform the user that a request is being made
    const display = document.getElementById('current-limits-display');
    display.innerHTML = `<p>Requesting updated plan configuration...</p>`;
    
    try {
        window.parent.postMessage({ type: 'PLAN_CONFIG_REQUEST' }, '*');
    } catch (e) {
        showError('Could not send config request to parent window. Falling back to default limits.');
        displayFallbackLimits();
    }
}

// --- HCE MANAGEMENT ---

/**
 * Generates the HTML for a single HCE input row.
 * @param {number} index - 1-based index of the HCE.
 * @returns {string} The HTML string.
 */
function generateHceRow(index) {
    const hceLimit = getLimit('hce_comp_test');
    // Determine the HCE status based on the loaded limit
    const statusText = !isNaN(hceLimit) 
        ? ` (Comp. $\le$ ${formatCurrency(hceLimit)})` 
        : '';

    return `
        <tr data-index="${index}">
            <td class="text-center">${index}</td>
            <td>
                <input type="number" class="hce-compensation" value="" placeholder="Compensation" min="0" step="1000">
            </td>
            <td>
                <input type="number" class="hce-deferrals" value="" placeholder="Deferrals" min="0" step="10">
            </td>
            <td>
                <input type="number" class="hce-matching" value="" placeholder="Match/Nonelec. Contrib." min="0" step="10">
            </td>
            <td class="hce-status text-center text-sm" style="min-width: 150px;">
                HCE Status ${statusText}
            </td>
            <td class="text-center">
                <button type="button" class="btn-remove btn-secondary-small" onclick="removeHceRow(this)">
                    Remove
                </button>
            </td>
        </tr>
    `;
}

/**
 * Adds a new HCE input row to the table.
 */
function addHceRow() {
    hceCount++;
    if (hceCount > 100) {
        showError("The calculator supports a maximum of 100 HCEs for performance reasons.");
        hceCount--;
        return;
    }
    const tableBody = document.getElementById('hceInputBody');
    tableBody.insertAdjacentHTML('beforeend', generateHceRow(hceCount));
    showError(''); // Clear any previous errors

    // Update row numbers after adding
    updateHceRowNumbers();
}

/**
 * Removes an HCE input row from the table.
 * @param {HTMLElement} button - The button element clicked.
 */
function removeHceRow(button) {
    const row = button.closest('tr');
    if (row) {
        row.remove();
        hceCount--;
        updateHceRowNumbers();
    }
}

/**
 * Updates the 1-based index numbers in the first column of the HCE table.
 */
function updateHceRowNumbers() {
    const rows = document.querySelectorAll('#hceInputBody tr');
    hceCount = rows.length;
    rows.forEach((row, index) => {
        const cell = row.cells[0]; // First cell is the index number
        if (cell) {
            cell.textContent = index + 1;
        }
    });
}

/**
 * Parses the HCE input table and validates the data.
 * @returns {Array<object>|null} An array of HCE objects, or null if validation fails.
 */
function collectHceData() {
    const rows = document.querySelectorAll('#hceInputBody tr');
    const hceLimit = getLimit('hce_comp_test');
    const hceData = [];
    let isValid = true;

    rows.forEach((row, index) => {
        const compInput = row.querySelector('.hce-compensation');
        const deferralInput = row.querySelector('.hce-deferrals');
        const matchInput = row.querySelector('.hce-matching');
        const statusCell = row.querySelector('.hce-status');

        const compensation = parseFloat(compInput.value) || 0;
        const deferrals = parseFloat(deferralInput.value) || 0;
        const matching = parseFloat(matchInput.value) || 0;
        
        statusCell.classList.remove('text-success', 'text-danger');
        
        // 1. Basic validation
        if (compensation <= 0 || deferrals < 0 || matching < 0) {
            isValid = false;
            statusCell.textContent = 'Invalid Data';
            statusCell.classList.add('text-danger');
            showError(`Row ${index + 1}: Compensation must be positive. Deferrals/Match must be non-negative.`);
            return;
        }

        // 2. HCE Status check (using the plan's current limit)
        const isHce = compensation > hceLimit;
        
        if (!isHce) {
            statusCell.textContent = 'Not HCE (Comp. below threshold)';
            statusCell.classList.add('text-danger');
            isValid = false;
            showError(`Row ${index + 1}: Compensation is below the HCE threshold of ${formatCurrency(hceLimit)}. Please ensure data is correct.`);
            return;
        }

        statusCell.textContent = 'HCE';
        statusCell.classList.add('text-success');

        hceData.push({
            id: index + 1,
            compensation: compensation,
            deferrals: deferrals,
            matching: matching,
            adp: (deferrals / compensation) * 100,
            acp: ((deferrals + matching) / compensation) * 100, // ACP calculation
            isHce: isHce,
        });
    });

    return isValid ? hceData.filter(d => d.isHce) : null;
}

// --- CORRECTION LOGIC ---

/**
 * Determines the required corrective reduction for HCEs to pass the test.
 * This function handles both ADP and ACP correction logic.
 * @param {Array<object>} hceData - Array of HCE objects with 'adp' or 'acp' properties.
 * @param {number} targetAvg - The maximum allowed average percentage (ADP Limit or ACP Limit).
 * @param {string} type - 'adp' or 'acp'.
 * @returns {Array<object>} Array of HCE objects with a 'refundAmount' and 'correctedAdp/correctedAcp' property.
 */
function determineCorrection(hceData, targetAvg, type) {
    const contributionType = type === 'adp' ? 'deferrals' : 'matching';
    const rateType = type; // 'adp' or 'acp'
    let currentHceData = JSON.parse(JSON.stringify(hceData));
    
    // Sort HCEs by their current rate (ADP or ACP) in DESCENDING order
    currentHceData.sort((a, b) => b[rateType] - a[rateType]);

    let sumCorrectedRates = currentHceData.reduce((sum, hce) => sum + hce[rateType], 0);
    let hceAverage = sumCorrectedRates / currentHceData.length;

    // Check if correction is actually needed
    if (hceAverage <= targetAvg) {
        // No correction needed, initialize correction fields
        return currentHceData.map(hce => ({
            ...hce, 
            refundAmount: 0, 
            [`corrected${rateType.toUpperCase()}`]: hce[rateType]
        }));
    }

    // Step 1: Reduce the rate of the highest-rated HCE until the overall average hits the target.
    // The refund is calculated against the original contribution base.
    
    // The target sum of rates is the number of HCEs * targetAvg
    const targetSumRates = currentHceData.length * targetAvg;
    
    // Total excess rate percentage is the difference between the current sum and the target sum
    let totalExcessRate = sumCorrectedRates - targetSumRates;

    let totalRefund = 0;
    
    // Loop through HCEs from highest rate down
    for (const hce of currentHceData) {
        if (totalExcessRate <= 0) break; // Stop if the average is now passing

        // The maximum percentage reduction needed from this HCE to make the test pass
        // or the amount needed to zero out their contribution rate.
        let requiredReductionPercent = hce[rateType] - targetAvg;

        // If the HCE's rate is already at or below the targetAvg, they don't contribute to the current *excess*.
        if (requiredReductionPercent <= 0) {
            hce.reductionPercent = 0;
            hce.refundAmount = 0;
            hce[`corrected${rateType.toUpperCase()}`] = hce[rateType];
            continue;
        }

        // The reduction this HCE must take is limited by two factors:
        // 1. The total excess rate still needing to be eliminated (`totalExcessRate`).
        // 2. The amount needed to bring this specific HCE down to the `targetAvg` (`requiredReductionPercent`).

        // The actual reduction percentage applied to this HCE to fix the test is the smaller of:
        // a) The HCE's current rate (to zero them out).
        // b) The amount needed to bring the overall HCE average down to the target sum.
        let actualRateReduction = Math.min(hce[rateType], totalExcessRate);
        
        // This HCE's rate will be reduced by `actualRateReduction`.
        hce.reductionPercent = actualRateReduction;
        
        // Calculate the refund amount based on the reduction percent and their compensation
        hce.refundAmount = (actualRateReduction / 100) * hce.compensation;
        
        // Update the HCE's corrected rate
        hce[`corrected${rateType.toUpperCase()}`] = hce[rateType] - actualRateReduction;
        
        // Update the total excess rate remaining to be distributed among the remaining HCEs
        totalExcessRate -= actualRateReduction;
        totalRefund += hce.refundAmount;
    }
    
    // Second Pass: If any HCE's corrected rate is still above the Target Avg due to a prior HCE's large reduction
    // that fixed the test, this HCE's rate must still be leveled down to the targetAvg.
    // This is the "leveling" principle (reducing the highest rate HCEs until the average passes).
    // The first pass calculation essentially implements the leveling logic by iterating from highest to lowest
    // and reducing each highest HCE's rate until their remaining rate is the 'Target Avg' (the max permitted
    // HCE average, not the target average after correction, which is lower).
    
    // Since we used `totalExcessRate` and distributed it from highest to lowest, the average is now passing.
    // However, the rule states to reduce the highest until they reach the maximum *passing* rate.
    // Let's refine the logic to adhere to the leveling principle:
    
    currentHceData = JSON.parse(JSON.stringify(hceData));
    currentHceData.sort((a, b) => b[rateType] - a[rateType]);
    
    let isCorrectionNeeded = true;
    while(isCorrectionNeeded) {
        let sumRates = currentHceData.reduce((sum, hce) => sum + hce[rateType], 0);
        hceAverage = sumRates / currentHceData.length;

        if (hceAverage <= targetAvg) {
            isCorrectionNeeded = false;
            break;
        }

        // HCE with the current highest rate
        const highestHce = currentHceData[0]; 
        
        // Find the amount this HCE's rate must be reduced to make the overall average pass.
        // The difference between the current sum of rates and the target sum of rates
        const requiredReductionSum = sumRates - targetAvg * currentHceData.length;
        
        // Calculate the reduction required *from this HCE* to meet the test (leveling principle)
        // If we reduce this HCE's rate by X, the new average will be (sumRates - X) / N
        // We want (sumRates - X) / N = targetAvg.
        // sumRates - X = targetAvg * N
        // X = sumRates - targetAvg * N
        let reductionPercentFromHighest = requiredReductionSum;
        
        // If the reduction required to fix the average is less than the amount needed to bring this HCE's rate
        // down to the target (i.e., highestHce[rateType] - targetAvg), we reduce by the required amount.
        
        let actualRateReduction = Math.min(
            reductionPercentFromHighest, // Reduction needed to fix the average
            highestHce[rateType]         // Cannot reduce more than their current rate
        );

        // Apply reduction and calculate refund
        highestHce.reductionPercent = actualRateReduction;
        highestHce.refundAmount = ((highestHce.refundAmount || 0) + (actualRateReduction / 100) * highestHce.compensation);
        highestHce[rateType] -= actualRateReduction;
        
        // Sort again to ensure the highest contributor is always first for the next iteration
        currentHceData.sort((a, b) => b[rateType] - a[rateType]);
    }

    // Final re-sort by ID for display purposes
    return currentHceData.map(hce => ({
        ...hce,
        refundAmount: hce.refundAmount || 0,
        [`corrected${rateType.toUpperCase()}`]: hce[rateType]
    })).sort((a, b) => a.id - b.id);
}


// --- MAIN CALCULATION ---

/**
 * Calculates the maximum allowable HCE average percentage based on the NHCE average.
 * This is the operational implementation of the IRC 401(k)(3) and 401(m)(3) rules.
 * The rule is: The HCE ADP must satisfy Test 1 OR Test 2.
 * Max HCE ADP is therefore the higher of the two implied limits.
 * Limit A: 1.25 * NHCE ADP
 * Limit B: min(NHCE ADP + 2, 2 * NHCE ADP)
 * @param {number} nhceAvg - The NHCE average percentage (e.g., 4.0 for 4.0%).
 * @returns {number} The maximum allowable HCE average percentage.
 */
function calculateMaxHceAvg(nhceAvg) {
    if (nhceAvg < 0) return 0;

    // Limit A: 1.25 times the NHCE average
    const limitA = 1.25 * nhceAvg; 

    // Limit B: NHCE average + 2 percentage points, but not more than 2 times the NHCE average
    const limitB = Math.min(nhceAvg + 2, 2 * nhceAvg); 

    // The maximum allowable HCE average is the GREATER of Limit A or Limit B
    return Math.max(limitA, limitB);
}

/**
 * Main function to run the ADP and ACP nondiscrimination tests.
 */
function calculateAdpAcp() {
    showError(''); // Clear previous errors

    // 1. Get NHCE Averages (as percentages)
    const nhceAdpInput = document.getElementById('nhceAdp');
    const nhceAcpInput = document.getElementById('nhceAcp');
    
    const nhceAdp = parseFloat(nhceAdpInput.value);
    const nhceAcp = parseFloat(nhceAcpInput.value);
    
    if (isNaN(nhceAdp) || nhceAdp < 0 || isNaN(nhceAcp) || nhceAcp < 0) {
        return showError('NHCE averages must be non-negative numbers.');
    }
    
    // 2. Get HCE Data
    const hceData = collectHceData();
    if (!hceData || hceData.length === 0) {
        return showError('Please enter valid data for at least one Highly Compensated Employee (HCE) above the compensation threshold.');
    }
    
    // 3. Calculate HCE Averages
    const totalHceAdp = hceData.reduce((sum, hce) => sum + hce.adp, 0);
    const totalHceAcp = hceData.reduce((sum, hce) => sum + hce.acp, 0);
    const hceCountActual = hceData.length;
    
    const hceAdpAvg = totalHceAdp / hceCountActual;
    const hceAcpAvg = totalHceAcp / hceCountActual;

    // 4. Calculate Max Allowable HCE Averages
    const maxHceAdp = calculateMaxHceAvg(nhceAdp);
    const maxHceAcp = calculateMaxHceAvg(nhceAcp);
    
    // 5. Determine Test Results
    const adpPass = hceAdpAvg <= maxHceAdp;
    const acpPass = hceAcpAvg <= maxHceAcp;
    
    // 6. Determine Correction Amounts
    const adpCorrectionData = adpPass 
        ? hceData.map(hce => ({...hce, refundAmount: 0, correctedADP: hce.adp}))
        : determineCorrection(hceData, maxHceAdp, 'adp');
        
    const acpCorrectionData = acpPass
        ? hceData.map(hce => ({...hce, refundAmount: 0, correctedACP: hce.acp}))
        : determineCorrection(hceData, maxHceAcp, 'acp');

    // Combine correction refunds (a participant may receive both an ADP and ACP refund)
    const combinedCorrectionData = hceData.map((hce, index) => {
        const adpRefund = adpCorrectionData[index].refundAmount || 0;
        const acpRefund = acpCorrectionData[index].refundAmount || 0;
        
        return {
            ...hce,
            adpRefund: adpRefund,
            acpRefund: acpRefund,
            totalRefund: adpRefund + acpRefund,
            correctedADP: adpCorrectionData[index].correctedADP,
            correctedACP: acpCorrectionData[index].correctedACP,
        };
    });

    // 7. Render Results
    displayResults({
        nhceAdp, hceAdpAvg, maxHceAdp, adpPass,
        nhceAcp, hceAcpAvg, maxHceAcp, acpPass,
        hceCountActual,
        correctionData: combinedCorrectionData
    });
}

/**
 * Renders the ADP and ACP test results and correction summary.
 * @param {object} results - The results object from calculateAdpAcp.
 */
function displayResults(results) {
    const adpPassText = results.adpPass ? 'PASS' : 'FAIL';
    const acpPassText = results.acpPass ? 'PASS' : 'FAIL';
    
    const adpClass = results.adpPass ? 'text-success' : 'text-danger';
    const acpClass = results.acpPass ? 'text-success' : 'text-danger';

    // ADP Summary
    const adpSummary = `
        <p><span class="result-label">NHCE Average Deferral Percentage (ADP):</span> 
            <span class="result-value">${results.nhceAdp.toFixed(2)}%</span>
        </p>
        <p><span class="result-label">Maximum Allowable HCE ADP:</span> 
            <span class="result-value">${results.maxHceAdp.toFixed(2)}%</span>
        </p>
        <p><span class="result-label">Actual HCE Average ADP:</span> 
            <span class="result-value">${results.hceAdpAvg.toFixed(2)}%</span>
        </p>
        <p><strong><span class="result-label">ADP Test Result:</span> 
            <span class="result-value ${adpClass}">${adpPassText}</span></strong>
        </p>
    `;

    // ACP Summary
    const acpSummary = `
        <p><span class="result-label">NHCE Average Contribution Percentage (ACP):</span> 
            <span class="result-value">${results.nhceAcp.toFixed(2)}%</span>
        </p>
        <p><span class="result-label">Maximum Allowable HCE ACP:</span> 
            <span class="result-value">${results.maxHceAcp.toFixed(2)}%</span>
        </p>
        <p><span class="result-label">Actual HCE Average ACP:</span> 
            <span class="result-value">${results.hceAcpAvg.toFixed(2)}%</span>
        </p>
        <p><strong><span class="result-label">ACP Test Result:</span> 
            <span class="result-value ${acpClass}">${acpPassText}</span></strong>
        </p>
    `;
    
    document.getElementById('adpResultBody').innerHTML = adpSummary;
    document.getElementById('acpResultBody').innerHTML = acpSummary;
    document.getElementById('correctionTableContainer').style.display = (results.adpPass && results.acpPass) ? 'none' : 'block';

    // Render Correction Table (if needed)
    renderCorrectionTable(results.correctionData);
    
    // Show results card
    document.getElementById('results-card').style.display = 'block';
}

/**
 * Renders the detailed correction/refund table for HCEs.
 * @param {Array<object>} correctionData - Array of HCE objects with refund details.
 */
function renderCorrectionTable(correctionData) {
    const tableBody = document.getElementById('correctionBody');
    tableBody.innerHTML = ''; // Clear previous results
    
    let totalAdpRefund = 0;
    let totalAcpRefund = 0;
    
    correctionData.forEach(hce => {
        totalAdpRefund += hce.adpRefund;
        totalAcpRefund += hce.acpRefund;
        
        const row = `
            <tr>
                <td class="text-center">${hce.id}</td>
                <td>${formatCurrency(hce.compensation)}</td>
                <td class="${hce.adpRefund > 0 ? 'text-danger' : ''}">
                    ${hce.adp.toFixed(2)}% $\to$ ${hce.correctedADP.toFixed(2)}%
                </td>
                <td class="${hce.adpRefund > 0 ? 'text-danger' : ''}">
                    ${formatCurrency(hce.adpRefund)}
                </td>
                <td class="${hce.acpRefund > 0 ? 'text-danger' : ''}">
                    ${hce.acp.toFixed(2)}% $\to$ ${hce.correctedACP.toFixed(2)}%
                </td>
                <td class="${hce.acpRefund > 0 ? 'text-danger' : ''}">
                    ${formatCurrency(hce.acpRefund)}
                </td>
                <td class="${(hce.totalRefund || 0) > 0 ? 'font-bold' : ''}">
                    ${formatCurrency(hce.totalRefund || 0)}
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
    
    // Add Total Row
    const totalRow = `
        <tr class="total-row">
            <td colspan="3" class="text-right font-bold">Total Refunds Required:</td>
            <td class="font-bold text-danger">${formatCurrency(totalAdpRefund)}</td>
            <td></td>
            <td class="font-bold text-danger">${formatCurrency(totalAcpRefund)}</td>
            <td class="font-bold text-danger">${formatCurrency(totalAdpRefund + totalAcpRefund)}</td>
        </tr>
    `;
    tableBody.insertAdjacentHTML('beforeend', totalRow);
}

// --- PDF EXPORT LOGIC (Requires html2canvas and jspdf to be loaded in the HTML) ---

/**
 * Exports the main calculation results to a PDF report.
 */
async function exportResultsToPdf() {
    const overlay = document.getElementById('pdf-loading-overlay');
    overlay.style.display = 'flex'; // Show loading screen

    const title = 'ADP/ACP Nondiscrimination Test Report';
    
    // Define the elements to capture in the PDF
    const elementSelectors = [
        '.calculator-container h1',
        '.calculator-container .description',
        '#current-limits-display',
        '.card.input-card',
        '#results-card'
    ];
    
    // A small delay to ensure rendering is complete before screenshotting
    await new Promise(resolve => setTimeout(resolve, 50)); 

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 10;
    
    doc.setFontSize(18);
    doc.text(title, 10, y);
    y += 5;
    
    // Capture each selected element and add it to the PDF
    for (const selector of elementSelectors) {
        const element = document.querySelector(selector);
        if (element && element.style.display !== 'none') {
            try {
                // Use a reduced scale and JPEG for small file size
                const canvas = await html2canvas(element, { 
                    scale: 1.0, 
                    // This option is crucial to ensure the table is fully captured
                    windowWidth: document.documentElement.offsetWidth,
                    windowHeight: document.documentElement.offsetHeight,
                    useCORS: true 
                }); 
                
                const imgData = canvas.toDataURL('image/jpeg', 0.8); // 0.8 quality
                
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth() - 20; // 10mm padding on each side
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                // Check if the image will fit on the current page
                if (y + pdfHeight > doc.internal.pageSize.getHeight() - 10) {
                    doc.addPage();
                    y = 10;
                }
                
                doc.addImage(imgData, 'JPEG', 10, y, pdfWidth, pdfHeight);
                y += pdfHeight + 5; // Add 5mm space after the image
            } catch (error) {
                console.error(`Error capturing element ${selector}:`, error);
                showError(`Failed to generate PDF for results: ${error.message}`);
            }
        }
    }
    
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    overlay.style.display = 'none'; // Hide loading screen
}


// --- INITIALIZATION ---

window.addEventListener('DOMContentLoaded', function() {
    // 1. Initial table setup
    // Add initial 3 HCE rows for demonstration
    for (let i = 0; i < 3; i++) {
        addHceRow();
    }
    
    // 2. Set event listeners
    document.getElementById('run-test-button').addEventListener('click', calculateAdpAcp);
    document.getElementById('add-hce-button').addEventListener('click', addHceRow);
    document.getElementById('export-button').addEventListener('click', exportResultsToPdf);

    // 3. Request config data when the calculator iframe is loaded
    requestConfigReload();
    
    // 4. Set an initial timeout to ensure fallback limits are displayed if the message isn't received quickly
    setTimeout(() => {
        if (!CURRENT_PLAN_RULES) {
            displayFallbackLimits();
        }
    }, 1000); 
    
    // 5. Hide results card initially
    document.getElementById('results-card').style.display = 'none';
});
