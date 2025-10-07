// Helper function to format a Date object into a readable string
function formatDate(date) {
   return date.toLocaleDateString('en-US', {
       year: 'numeric',
       month: 'long',
       day: 'numeric'
   });
}

// =========================================================================
// ELIGIBILITY ESTIMATOR LOGIC
// =========================================================================

function calculateEligibility() {
   const hireDateStr = document.getElementById('hireDate').value;
   const serviceYears = parseFloat(document.getElementById('serviceRequirement').value);
   // The entry date value is the number of entry dates per year (1=monthly, 4=quarterly, 12=monthly)
   const entryFrequency = 12 / parseFloat(document.getElementById('entryDates').value);
   
   const resultsDiv = document.getElementById('eligibilityResults');
   const errorMessage = document.getElementById('error-message');
   
   // Clear previous state
   resultsDiv.innerHTML = '';
   errorMessage.style.display = 'none';

   // 1. Validation and Parsing
   if (!hireDateStr) {
       errorMessage.textContent = 'Please enter a valid Date of Hire.';
       errorMessage.style.display = 'block';
       return;
   }
   
   const hireDate = new Date(hireDateStr);
   
   // 2. Calculate the Service Completion Date
   const serviceCompletionDate = new Date(hireDate.getTime());
   // Add the required years of service
   serviceCompletionDate.setFullYear(hireDate.getFullYear() + serviceYears);

   // If serviceYears is 0 (immediate eligibility), the completion date is just the hire date
   const finalServiceDate = (serviceYears === 0) ? hireDate : serviceCompletionDate;

   // 3. Find the Next Plan Entry Date
   
   let eligibilityDate = new Date(finalServiceDate.getTime());
   
   // Calculate the Month index (0-11) of the next possible entry date
   let currentMonth = eligibilityDate.getMonth();
   let currentYear = eligibilityDate.getFullYear();
   
   let nextEntryMonth;

   if (entryFrequency === 12) { // Monthly (1st of month FOLLOWING service completion)
       // If service completes on 1st of month, next entry is that same day.
       // Otherwise, it's the 1st of the NEXT month.
       if (finalServiceDate.getDate() === 1 && serviceYears > 0) {
           nextEntryMonth = currentMonth;
       } else {
           nextEntryMonth = (currentMonth + 1) % 12; // Next month
       }
       
       // Handle year wrap-around
       if (nextEntryMonth === 0 && finalServiceDate.getDate() !== 1) {
           currentYear += 1;
       }
   
   } else { // Semi-Annual (4), Quarterly (2), or Monthly (12) Entry Dates
       // The month index for entry dates (Jan=0, Apr=3, Jul=6, Oct=9)
       const entryMonthIndexes = [];
       for (let i = 0; i < 12; i += entryFrequency) {
           entryMonthIndexes.push(i);
       }

       // Find the first entry month that is greater than or equal to the current month
       let found = false;
       for (const monthIndex of entryMonthIndexes) {
           if (monthIndex >= currentMonth) {
               // Check if service completion is BEFORE this date
               // We use 0 for the day (the day *before* the 1st) to check if the completion date
               // is after the entry date in the same month.
               const potentialEntryDate = new Date(currentYear, monthIndex, 1);
               
               if (finalServiceDate <= potentialEntryDate) {
                   nextEntryMonth = monthIndex;
                   found = true;
                   break;
               }
           }
       }
       
       // If no entry date was found in the current year, use the first entry date of the NEXT year
       if (!found) {
           nextEntryMonth = entryMonthIndexes[0];
           currentYear += 1;
       }
   }
   
   // Set the final eligibility date
   eligibilityDate.setFullYear(currentYear);
   eligibilityDate.setMonth(nextEntryMonth);
   eligibilityDate.setDate(1); // All entry dates are the 1st

   // 4. Display Results
   resultsDiv.innerHTML = `
       <p><span class="result-label">Service Requirement Met Date:</span> ${formatDate(finalServiceDate)}</p>
       <p><span class="result-label" style="font-size:1.1em;">Estimated Plan Entry Date:</span>
           <span class="result-value">${formatDate(eligibilityDate)}</span>
       </p>
       
       <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
           *This estimate assumes the plan requires 1,000 hours of service during the relevant period. Final eligibility must be confirmed by your plan administrator.
       </p>
   `;

   // 5. Auto-Scroll to Results
   const resultsElement = document.getElementById('results');
   resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}