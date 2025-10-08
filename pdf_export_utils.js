/**
 * Reusable function to export the current calculator page content to a PDF.
 * This version uses html2canvas to capture the visual style of the content blocks 
 * and tables as seen on the webpage (maintaining all CSS).
 *
 * NOTE: For this function to work, you MUST include the following libraries 
 * in your HTML page (in this order):
 * 1. jspdf.umd.min.js
 * 2. html2canvas.min.js
 *
 * @param {string} pageTitle - The title for the PDF document header.
 * @param {string[]} elementSelectors - An array of CSS selectors for all elements 
 * to include (e.g., ["#adpResults", "#acpResults", "#hceDataTable"]).
 */
async function exportPageToPDF(pageTitle, elementSelectors) {
    
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
        console.error("Required libraries (jsPDF and html2canvas) are not loaded.");
        const message = document.createElement('div');
        message.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 20px; background: #fee; border: 1px solid #c00; z-index: 9999; border-radius: 8px; font-family: sans-serif;';
        message.textContent = 'Export failed: Please ensure jsPDF and html2canvas libraries are correctly included.';
        document.body.appendChild(message);
        setTimeout(() => document.body.removeChild(message), 4000);
        return;
    }

    // --- Setup PDF ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'in', 'letter');
    const margin = 0.5;
    let y = margin;
    const contentWidth = 7.5; 
    const pdfPageHeight = 10.5; 
    
    // Simple visual loading indicator
    const loader = document.createElement('div');
    loader.id = 'pdf-loader';
    loader.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.9); z-index: 9998; display: flex; justify-content: center; align-items: center; font-size: 1.5em; font-weight: bold; color: #004d99;';
    loader.innerHTML = 'Generating PDF... Please wait (Rendering styles...)';
    document.body.appendChild(loader);

    // --- 1. Title and Header ---
    doc.setFontSize(18);
    doc.text(pageTitle + ' Results', margin, y);
    y += 0.3;
    doc.setFontSize(10);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 0.5;
    
    // --- 2. Process all content elements visually ---
    for (const selector of elementSelectors) {
        const element = document.querySelector(selector);
        
        if (element) {
            
            // --- CRITICAL PERFORMANCE FIX: Handle hidden elements ---
            const originalDisplay = element.style.display;
            let wasHidden = false;

            if (window.getComputedStyle(element).display === 'none') {
                element.style.display = 'block'; // Temporarily show the element for capture
                wasHidden = true;
            }

            try {
                // Render the element into a canvas (image)
                const canvas = await html2canvas(element, { 
                    scale: 2, // Slightly reduced scale for faster rendering
                    logging: false,
                    allowTaint: true,
                    useCORS: true 
                });
                
                if (wasHidden) {
                    element.style.display = originalDisplay; // Restore original display state
                }

                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const imgHeight = (canvas.height * contentWidth) / canvas.width;

                // Simple page break logic
                if (y + imgHeight > pdfPageHeight) {
                    doc.addPage();
                    y = margin;
                }
                
                doc.addImage(imgData, 'JPEG', margin, y, contentWidth, imgHeight);
                y += imgHeight + 0.3; 
                
            } catch (error) {
                // Ensure element is restored even on error
                if (wasHidden) {
                    element.style.display = originalDisplay; 
                }
                console.error(`Error processing selector ${selector}:`, error);
                
                doc.setFontSize(10);
                doc.setTextColor(255, 0, 0);
                doc.text(`[ERROR: Failed to render data for ${selector}]`, margin, y);
                doc.setTextColor(0, 0, 0);
                y += 0.3;
            }

        } else {
            console.warn(`Content selector not found: ${selector}`);
        }
    }

    // --- 3. Final Save ---
    document.body.removeChild(loader); 
    doc.save(`${pageTitle.replace(/[^a-z0-9]/gi, '_')}_Visual_Results.pdf`);
}