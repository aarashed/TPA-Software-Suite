// Function to load the Dashboard Home page
function loadHome() {
   document.getElementById('tool-iframe').src = "dashboard_home.html";
   document.getElementById('breadcrumb-path').innerHTML = 'Dashboard Home';
}

function toggleLinks(header) {
   // 1. Find the sibling container that holds the links (either tool-links-container or sub-tool-links-container)
   const container = header.nextElementSibling;
   
   // 2. Find the specific toggle arrow element *within* the clicked header
   const arrow = header.querySelector('.toggle-arrow');

   // 3. Toggle the 'hidden' class on the container
   if (container.classList.contains('hidden')) {
       // If hidden, show it
       container.classList.remove('hidden');
    
       // Update the arrow to the open state (down arrow)
       arrow.textContent = '▼';
   } else {
       // If visible, hide it
       container.classList.add('hidden');
 
       // Update the arrow to the closed state (right arrow)
       arrow.textContent = '▶';
   }
}

// === CORRECTED: Function to toggle the entire sidebar ===
function toggleSidebar(button) {
    // Get the main wrapper element, which controls the layout
    const wrapper = document.querySelector('.main-content-wrapper');
    const sidebar = document.querySelector('.sidebar-menu');
    
    // Elements to hide/show
    // Selects the 'TPA Modules' text (the span that is NOT the icon and NOT the button)
    const sidebarTitle = sidebar.querySelector('h2 span:not(.group-icon):not(.sidebar-toggle-button)');
    const sidebarIcon = sidebar.querySelector('h2 .group-icon');
    const moduleGrid = sidebar.querySelector('.module-grid-sidebar');
    
    // Toggle a class on the wrapper to trigger the CSS transition
    wrapper.classList.toggle('sidebar-collapsed');
    
    // Toggle the button icon and content visibility
    if (wrapper.classList.contains('sidebar-collapsed')) {
        button.textContent = '»'; // Right arrow when collapsed (to indicate expand)
        
        // Hide text and content (The CSS will handle the rest)
        if (sidebarTitle) sidebarTitle.style.display = 'none';
        if (sidebarIcon) sidebarIcon.style.display = 'none';
        if (moduleGrid) moduleGrid.style.display = 'none';
        
    } else {
        button.textContent = '«'; // Left arrow when expanded (to indicate collapse)

        // Show text and content
        if (sidebarTitle) sidebarTitle.style.display = 'inline';
        if (sidebarIcon) sidebarIcon.style.display = 'inline';
        if (moduleGrid) moduleGrid.style.display = 'block';
    }
}


/**
* Loads the external tool into the iFrame and updates the breadcrumb.
* This is called from the <a> tags.
* @param {HTMLElement} link - The <a> element that was clicked.
*/
function loadTool(link) {
   // 1. Update the iFrame source
   const iframe = document.getElementById('tool-iframe');
   iframe.src = link.href;

   // 2. Update the Breadcrumb Path
   updateBreadcrumb(link);
}

function updateBreadcrumb(element) {
   const breadcrumbPath = document.getElementById('breadcrumb-path');
   let path = 'Dashboard Home';
   
   if (element.tagName === 'H3' || element.tagName === 'H4') {
       return;
   }
   
   // --- Tool Link Click (A tag) ---
   if (element.tagName === 'A') {
       // Find the closest H4 (sub-subheader) if it exists
       const h4 = element.closest('.sub-tool-links-container')
                  ? element.closest('.sub-tool-links-container').previousElementSibling
                  : null;

       // Find the closest H3 (main module header)
       const h3 = element.closest('.module-group').querySelector('h3');
       
       // Clean up the text, removing the arrow characters for a clean breadcrumb path
       const h3Text = h3.textContent.replace('▼', '').replace('▶', '').trim();
       
       path += ' <span class="separator">/</span> ' + h3Text;

       if (h4) {
           // Clean up the H4 text
           const h4Text = h4.textContent.replace('▼', '').replace('▶', '').trim();
           path += ' <span class="separator">/</span> ' + h4Text;
       }
       
       const toolName = element.textContent.trim();
       path += ' <span class="separator">/</span> <span style="font-weight: 600; color: #333;">' + toolName + '</span>';
   }

   breadcrumbPath.innerHTML = path;
}