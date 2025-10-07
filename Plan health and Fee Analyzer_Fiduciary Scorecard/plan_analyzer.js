// Helper function to format currency
function formatCurrency(value) {
   return '$' + Math.round(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to calculate a status class and text based on value, low threshold, and high threshold
function getStatus(value, low, high, isInverse = false) {
   if (isInverse) {
       // Inverse: Good is BELOW the low threshold (e.g., Fees)
       if (value <= low) return { status: 'status-good', text: 'Excellent' };
       if (value <= high) return { status: 'status-warning', text: 'Acceptable' };
       return { status: 'status-critical', text: 'High Risk' };
   } else {
       // Standard: Good is ABOVE the high threshold (e.g., Participation)
       if (value >= high) return { status: 'status-good', text: 'Strong' };
       if (value >= low) return { status: 'status-warning', text: 'Needs Improvement' };
       return { status: 'status-critical', text: 'Critical Risk' };
   }
}

/**
* Calculates key metrics and generates the Fiduciary Scorecard.
*/
function analyzePlanHealth() {
   // 1. Data Collection
   const totalAssets = parseFloat(document.getElementById('totalAssets').value);
   const totalFees = parseFloat(document.getElementById('totalFees').value);
   const totalEligible = parseInt(document.getElementById('totalEligible').value);
   const totalParticipants = parseInt(document.getElementById('totalParticipants').value);
   const nhceParticipation = parseFloat(document.getElementById('nhceParticipation').value);
   const nhceAvgDeferral = parseFloat(document.getElementById('nhceAvgDeferral').value);
   
   const scorecardDiv = document.getElementById('scorecardResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   scorecardDiv.style.display = 'none';
   errorMessage.style.display = 'none';

   // 2. Validation
   if (isNaN(totalAssets) || totalAssets < 0 || isNaN(totalFees) || totalFees < 0 ||
       isNaN(totalEligible) || totalEligible < 1 || isNaN(totalParticipants) || totalParticipants < 0) {
       errorMessage.textContent = 'Please ensure all financial and employee counts are valid positive numbers.';
       errorMessage.style.display = 'block';
       return;
   }
   if (totalParticipants > totalEligible) {
        errorMessage.textContent = 'Total Participants cannot exceed Total Eligible Employees.';
        errorMessage.style.display = 'block';
        return;
   }

   // 3. Calculation of Key Metrics (KPIs)
   const assetFeeRatio = totalAssets > 0 ? (totalFees / totalAssets) * 100 : 0; // The true expense ratio
   const participantFee = totalParticipants > 0 ? totalFees / totalParticipants : 0;
   const participationRate = (totalParticipants / totalEligible) * 100;
   const avgAccountBalance = totalParticipants > 0 ? totalAssets / totalParticipants : 0;

   // 4. Fiduciary Assessment & Benchmarking
   
   // Benchmarks (Based on industry averages for a mid-sized plan, subject to TPA adjustment)
   const FeeRatioBench_Low = 0.8; // Excellent/Good Threshold (Inverse)
   const FeeRatioBench_High = 1.2; // Critical/Warning Threshold (Inverse)
   
   const ParticipationBench_Low = 65; // Warning/Critical Threshold
   const ParticipationBench_High = 80; // Good/Excellent Threshold
   
   const DeferralBench_Low = 4.0;
   const DeferralBench_High = 6.0;

   // --- Asset Fee Ratio (Fee Reasonableness) ---
   const feeStatus = getStatus(assetFeeRatio, FeeRatioBench_Low, FeeRatioBench_High, true);

   // --- Participation Rate (Employee Engagement) ---
   const participationStatus = getStatus(nhceParticipation, ParticipationBench_Low, ParticipationBench_High);
   
   // --- Deferral Rate (Retirement Readiness) ---
   const deferralStatus = getStatus(nhceAvgDeferral, DeferralBench_Low, DeferralBench_High);
   
   
   // 5. Overall Health Score (Simple points system)
   let score = 0;
   if (feeStatus.status === 'status-good') score += 40;
   else if (feeStatus.status === 'status-warning') score += 20;

   if (participationStatus.status === 'status-good') score += 30;
   else if (participationStatus.status === 'status-warning') score += 15;
   
   if (deferralStatus.status === 'status-good') score += 30;
   else if (deferralStatus.status === 'status-warning') score += 15;
   
   let scoreColor = 'score-good';
   if (score < 60) scoreColor = 'score-poor';
   else if (score < 80) scoreColor = 'score-average';

   // 6. Display Results
   
   // Score Header
   document.getElementById('healthScoreDisplay').innerHTML = `
       <h2 class="${scoreColor}">${score}/100</h2>
       <p style="font-size: 1.2em; font-weight: bold;">PLAN HEALTH RATING</p>
   `;

   // Metrics Summary Boxes
   document.getElementById('metricsSummary').innerHTML = `
       <div class="metric-box">
           <div class="metric-box-value">${(participationRate).toFixed(1)}%</div>
           <div class="metric-box-label">Overall Participation Rate</div>
       </div>
       <div class="metric-box">
           <div class="metric-box-value">${formatCurrency(avgAccountBalance)}</div>
           <div class="metric-box-label">Average Account Balance</div>
       </div>
       <div class="metric-box">
           <div class="metric-box-value">${formatCurrency(participantFee)}</div>
           <div class="metric-box-label">Cost Per Participant</div>
       </div>
   `;

   // Risk Table
   const riskBody = document.getElementById('riskBody');
   riskBody.innerHTML = '';
   
   const addRiskRow = (metric, planValue, benchmark, statusText, statusClass) => {
       const newRow = riskBody.insertRow();
       newRow.innerHTML = `
           <td>${metric}</td>
           <td style="text-align: right;">${planValue}</td>
           <td>${benchmark}</td>
           <td><span class="${statusClass}">${statusText}</span></td>
       `;
   };

   // Row 1: Fee Reasonableness (Fiduciary Risk)
   addRiskRow(
       'Asset Fee Ratio (Total Plan Cost)',
       `${assetFeeRatio.toFixed(2)}%`,
       `Below ${FeeRatioBench_Low}% is best`,
       feeStatus.text,
       feeStatus.status
   );

   // Row 2: NHCE Participation (ADP Test Risk)
   addRiskRow(
       'NHCE Participation Rate (Employee Engagement)',
       `${nhceParticipation.toFixed(1)}%`,
       `Target: >${ParticipationBench_High}%`,
       participationStatus.text,
       participationStatus.status
   );

   // Row 3: NHCE Deferral Rate (ADP/Retirement Risk)
   addRiskRow(
       'NHCE Avg. Deferral Rate',
       `${nhceAvgDeferral.toFixed(1)}%`,
       `Target: >${DeferralBench_High}%`,
       deferralStatus.text,
       deferralStatus.status
   );
   
   // Row 4: Service Provider Fee Disclosure (408(b)(2) Compliance)
   addRiskRow(
       '408(b)(2) Disclosure Documentation',
       'N/A',
       'Must be documented annually',
       'CRITICAL ACTION',
       'status-critical'
   );
   
   scorecardDiv.style.display = 'block';

   // 7. AUTO-SCROLL FIX: Scroll to the results card for visibility
   scorecardDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}