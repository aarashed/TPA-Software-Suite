// Helper function to format currency
function formatCurrency(value) {
    return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Calculates the earnings (or loss) allocable to the excess deferral
 * using the standard "Fractional Method" for the year of deferral.
 * * Formula: Earnings = [ Excess Deferral * (Ending Balance - Beginning Balance - Contributions) ] / [ (Beginning Balance + Contributions) ]
 */
function calculateAllocableEarnings(excess, balStart, totalContrib, balEnd) {
    // 1. Calculate the Net Earnings/Loss on the entire account for the year of deferral
    // Net_Gain_Loss = Ending_Balance - Beginning_Balance - Contributions
    const netGainLoss = balEnd - balStart - totalContrib;

    // 2. Calculate the Adjusted Beginning Balance (Denominator for the allocation fraction)
    // Adjusted_Bal_Start = Beginning_Balance + Contributions (used to scale the gain/loss)
    const adjustedBalStart = balStart + totalContrib;

    // Handle the case where Adjusted Beginning Balance is zero (e.g., brand new participant)
    if (adjustedBalStart === 0) {
        // If total contributions were zero and end balance is positive, the excess itself caused the gain.
        // If total contributions were non-zero (must be, for an excess) but start bal was zero, the formula still works.
        return totalContrib === 0 ? 0 : excess * (netGainLoss / totalContrib);
    }

    // 3. Calculate the Allocable Earnings
    // Allocable_Earnings = Excess * (Net_Gain_Loss / Adjusted_Bal_Start)
    const allocableEarnings = excess * (netGainLoss / adjustedBalStart);

    return allocableEarnings;
}

function calculate402gRefund() {
    const L = parseFloat(document.getElementById('excessAmount').value);
    const B_start = parseFloat(document.getElementById('accountBalanceYearStart').value);
    const C_total = parseFloat(document.getElementById('totalContributions').value);
    const B_end = parseFloat(document.getElementById('accountBalanceYearEnd').value);

    const summaryDiv = document.getElementById('refundSummary');
    const summaryCard = document.getElementById('summary'); // Get the result card element
    const errorMessage = document.getElementById('error-message');

    // Clear previous state
    summaryDiv.innerHTML = '';
    errorMessage.style.display = 'none';

    // 1. Validation and Constraints
    if (isNaN(L) || L <= 0 || isNaN(B_start) || B_start < 0 || isNaN(C_total) || C_total < 0 || isNaN(B_end) || B_end < 0) {
        errorMessage.textContent = 'Please enter valid positive values for all inputs. Excess Deferral must be greater than $0.';
        errorMessage.style.display = 'block';
        return;
    }

    if (L > C_total) {
        errorMessage.textContent = `ERROR: The Excess Deferral ($${L.toFixed(2)}) cannot be greater than the Total Contributions made during the year ($${C_total.toFixed(2)}).`;
        errorMessage.style.display = 'block';
        return;
    }

    // 2. Calculate Allocable Earnings
    const E_allocable = calculateAllocableEarnings(L, B_start, C_total, B_end);

    // 3. Calculate Total Refund Amount
    const totalRefund = L + E_allocable;

    // 4. Display Summary
    const netGainLoss = B_end - B_start - C_total;

    summaryDiv.innerHTML = `
        <div class="metric-row">
            <span class="metric-label">Net Gain/Loss on Total Account (Year of Deferral)</span>
            <span class="metric-value" style="color: ${netGainLoss >= 0 ? '#28a745' : '#dc3545'};">${formatCurrency(netGainLoss)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Allocable Earnings (or Loss) on Excess</span>
            <span class="metric-value" style="color: ${E_allocable >= 0 ? '#28a745' : '#dc3545'};">${formatCurrency(E_allocable)}</span>
        </div>
        <div class="metric-row" style="border-top: 2px solid #004d99; margin-top: 15px;">
            <span class="metric-label">Excess Deferral Principal to Refund</span>
            <span class="metric-value">${formatCurrency(L)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label"><strong>TOTAL REQUIRED REFUND AMOUNT</strong></span>
            <span class="metric-value" style="font-size: 1.3em; color: #007bff;"><strong>${formatCurrency(totalRefund)}</strong></span>
        </div>
    `;

    // Note for TPA
    summaryDiv.insertAdjacentHTML('beforeend', `<p class="hint-text" style="text-align: center; margin-top: 20px;">*The full Total Required Refund Amount must be distributed to the participant by April 15 of the following year to avoid double taxation.</p>`);

    // 5. AUTO-SCROLL FIX: Scroll to the results card for visibility
    if (summaryCard) {
        summaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
   }
}