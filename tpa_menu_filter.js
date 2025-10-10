// Function to run after the document is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. Menu Toggling Logic (Collapsible Groups) ---

    /**
     * Finds the collapsible content using a HYBRID strategy:
     * 1. Uses data-target attribute for specific ID lookups (most reliable).
     * 2. Falls back to nextElementSibling for all other H3/H4 headers.
     */
    function findCollapsibleContent(header) {
        
        // Strategy 1: Check for a data-target attribute (used for problem menus)
        const targetId = header.getAttribute('data-target');
        if (targetId) {
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                return targetElement;
            }
        }
        
        // Strategy 2: Fallback to nextElementSibling for all other (working) menus
        let nextElement = header.nextElementSibling;
        
        if (nextElement && (nextElement.classList.contains('tool-links-container') || nextElement.classList.contains('sub-tool-links-container'))) {
            return nextElement;
        }
        return null; 
    }
    

    function setupMenuToggle(selector) {
        document.querySelectorAll(selector).forEach(header => {
            
            // --- AGGRESSIVE ICON CLEANUP AND INITIALIZATION ---
            // Ensures the icon is correctly initialized/reset
            header.querySelectorAll('.toggle-icon').forEach(icon => icon.remove());
            // Remove emojis/icons used for grouping before re-adding the toggle icon
            let cleanText = header.textContent.trim().replace(/[\u2705\u2699\u26A1\u2692\u269C\uD83D\uDCC8\uD83D\uDCDD\uD83D\uDCB8\u2699\uD83C\uDFE0\uD83D\uDCCA\uD83D\uDCDD\uD83D\uDCB8\u2699\uFE0F]/g, '').trim(); 
            // Reconstruct the header content, preserving the group-icon if present
            header.innerHTML = `<span class="group-icon">${header.querySelector('.group-icon') ? header.querySelector('.group-icon').outerHTML : ''}</span> <span>${cleanText}</span> <span class="toggle-icon">▼</span>`;

            // --- Click Handler ---
            header.addEventListener('click', function() {
                const content = findCollapsibleContent(header);
                if (content) {
                    const isHidden = content.classList.contains('hidden');
                    content.classList.toggle('hidden', !isHidden);
                    const icon = header.querySelector('.toggle-icon');
                    if (icon) {
                        icon.textContent = isHidden ? '▶' : '▼';
                    }
                }
            });
            
            // --- Initial State (Default all sub-headers closed) ---
            if (selector === '.collapsible-subheader') {
                const content = findCollapsibleContent(header);
                if (content) {
                    content.classList.add('hidden');
                    const icon = header.querySelector('.toggle-icon');
                    if (icon) icon.textContent = '▶';
                }
            }
        });
    }

    // Apply toggling logic to main headers and sub-headers
    setupMenuToggle('.collapsible-header');
    setupMenuToggle('.collapsible-subheader');


    // --- 2. Menu Filtering Logic (Search) ---

    /**
     * Filters the entire menu structure based on the search text.
     * Shows/hides individual links, and expands/collapses parent containers.
     * @param {string} filterText - The search term.
     */
    function filterMenu(filterText) {
        const searchText = filterText.toLowerCase();

        // 1. Reset all containers to hidden state for re-evaluation
        document.querySelectorAll('.tool-links-container, .sub-tool-links-container').forEach(container => {
            container.classList.add('hidden');
        });
        document.querySelectorAll('.toggle-icon').forEach(icon => icon.textContent = '▶');


        document.querySelectorAll('.tool-link').forEach(link => {
            const linkText = link.textContent.toLowerCase();
            const matches = linkText.includes(searchText);

            if (matches) {
                link.style.display = "block";

                // Find the parent containers and make them visible

                // A. Find the direct parent container (sub-container)
                const subContainer = link.closest('.sub-tool-links-container') || link.closest('.tool-links-container');
                
                if (subContainer) {
                    subContainer.classList.remove('hidden');
                    
                    // Find the preceding H4 header for the sub-container
                    let h4 = null;
                    // Try to find by data-target first
                    if (subContainer.id) {
                         h4 = document.querySelector(`.collapsible-subheader[data-target=\"${subContainer.id}\"]`);
                    }
                    // Fallback to previousElementSibling if no data-target match
                    if (!h4) {
                        h4 = subContainer.previousElementSibling;
                    }

                    if (h4 && h4.tagName === 'H4') {
                        const icon = h4.querySelector('.toggle-icon');
                        if (icon) icon.textContent = '▼';
                    }
                }

                // B. Find the main module container
                const mainContainer = link.closest('.module-group');

                if (mainContainer) {
                    // Find the preceding H3 header
                    const h3 = mainContainer.querySelector('.collapsible-header');
                    if (h3) {
                         // Ensure the H3's content (tool-links-container) is visible
                         const h3Content = findCollapsibleContent(h3);
                         if (h3Content) {
                            h3Content.classList.remove('hidden');
                            const icon = h3.querySelector('.toggle-icon');
                            if (icon) icon.textContent = '▼';
                         }
                    }
                }

            } else {
                link.style.display = "none"; 
            }
        });
        
        // 3. If no search text, restore default state (all links visible, main groups open, sub-groups closed)
        if (filterText === '') {
             // Ensure all links are visible
            document.querySelectorAll('.tool-link').forEach(link => link.style.display = "block");
            
            // Restore all main headers to their default open state
            document.querySelectorAll('.collapsible-header').forEach(header => {
                const h3Content = findCollapsibleContent(header);
                if (h3Content) {
                    h3Content.classList.remove('hidden');
                    const icon = header.querySelector('.toggle-icon');
                    if (icon) icon.textContent = '▼';
                }
            });
            
            // Reset sub-headers to closed state
            document.querySelectorAll('.collapsible-subheader').forEach(header => {
                const subContent = findCollapsibleContent(header);
                if (subContent) {
                    subContent.classList.add('hidden');
                    const icon = header.querySelector('.toggle-icon');
                    if (icon) icon.textContent = '▶';
                }
            });
        }
    }

    // Add event listener to the search input field
    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            filterMenu(event.target.value);
        });
    }

    // CRITICAL FIX: Add event listener to the clear button to reset the input and filter
    const clearButton = document.getElementById('clear-search-btn');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (searchInput) {
                // 1. Clear the text input
                searchInput.value = '';
                // 2. Clear the filter and restore the default menu state
                filterMenu('');
            }
        });
    }
});
