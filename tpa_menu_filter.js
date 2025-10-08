/**
 * tpa_menu_filter.js
 * Contains the advanced search and filter logic for the nested sidebar menu.
 */

function filterModules() {
    const filter = document.getElementById('menu-search-input').value.toUpperCase().trim();
    const allToolLinks = document.querySelectorAll('.tool-link');
    const allSubGroups = document.querySelectorAll('.collapsible-subheader'); // L2 (H4)
    const allModuleGroups = document.querySelectorAll('.collapsible-header'); // L1 (H3)

    // 1. Initial Pass: Filter individual tool links (L3)
    allToolLinks.forEach(link => {
        const linkText = link.textContent || link.innerText;

        if (filter === "") {
            link.classList.remove('filtered-hidden');
        } else {
            if (linkText.toUpperCase().includes(filter)) {
                link.classList.remove('filtered-hidden');
            } else {
                link.classList.add('filtered-hidden');
            }
        }
    });

    // 2. Second Pass: Filter up the hierarchy (L2 - H4)
    allSubGroups.forEach(subGroupHeader => {
        const subGroupContent = subGroupHeader.nextElementSibling; // .sub-tool-links-container
        const visibleLinks = subGroupContent.querySelectorAll('.tool-link:not(.filtered-hidden)');
        
        // Remove the hidden class on the L2 header and content for clean re-filtering
        subGroupHeader.classList.remove('filtered-hidden');
        subGroupContent.classList.remove('filtered-hidden');

        if (filter === "") {
            // If filter is cleared, we let the L1/L2 toggle state be restored in the final step.
        } else {
            const headerText = subGroupHeader.textContent.toUpperCase();
            
            // If no children match AND the header itself doesn't match, hide L2 group
            if (visibleLinks.length === 0 && !headerText.includes(filter)) {
                subGroupHeader.classList.add('filtered-hidden');
                subGroupContent.classList.add('filtered-hidden');
            } else {
                // If it should be visible (match found or header match), ensure it's open
                subGroupContent.classList.remove('hidden'); // Open the container
                subGroupHeader.querySelector('.toggle-arrow').textContent = '▼';
            }
        }
    });


    // 3. Third Pass: Filter up the hierarchy (L1 - H3)
    allModuleGroups.forEach(moduleGroupHeader => {
        const moduleGroupContent = moduleGroupHeader.nextElementSibling; // .tool-links-container
        
        // Count visible children (L2 headers and direct L3 links)
        const visibleSubGroupHeaders = moduleGroupContent.querySelectorAll('.collapsible-subheader:not(.filtered-hidden)');
        const directLinks = moduleGroupContent.querySelectorAll(':scope > .tool-link:not(.filtered-hidden)');

        // Remove the hidden class on the L1 header and content for clean re-filtering
        moduleGroupHeader.classList.remove('filtered-hidden');
        moduleGroupContent.classList.remove('filtered-hidden');


        if (filter === "") {
            // If filter is cleared, we let the L1 toggle state be restored in the final step.
        } else {
            const headerText = moduleGroupHeader.textContent.toUpperCase();

            // If no children match AND the header itself doesn't match, hide L1 group
            if (visibleSubGroupHeaders.length === 0 && directLinks.length === 0 && !headerText.includes(filter)) {
                moduleGroupHeader.classList.add('filtered-hidden');
                moduleGroupContent.classList.add('filtered-hidden');
            } else {
                // If it should be visible, ensure it's open
                moduleGroupContent.classList.remove('hidden'); // Open the container
                moduleGroupHeader.querySelector('.toggle-arrow').textContent = '▼';
            }
        }
    });

    // 4. Reset: If filter is empty, restore original collapsed/expanded states
    if (filter === "") {
        // Since we don't store state, we simply reset the visual arrows for groups that have the 'hidden' class
        allModuleGroups.forEach(h3 => toggleLinksReset(h3));
        allSubGroups.forEach(h4 => toggleLinksReset(h4));
    }
}

/**
 * Helper function to restore collapsed state when search is cleared.
 * Resets the toggle arrow based on the 'hidden' class on the container.
 */
function toggleLinksReset(header) {
    const container = header.nextElementSibling; 
    const arrow = header.querySelector('.toggle-arrow');

    if (container && arrow) {
        if (container.classList.contains('hidden')) {
            arrow.textContent = '▶'; 
        } else {
            arrow.textContent = '▼'; 
        }
    }
}