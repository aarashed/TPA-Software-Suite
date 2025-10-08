// Function to load the Dashboard Home page
function loadHome() {
   document.getElementById('tool-iframe').src = "dashboard_home.html";
   document.getElementById('breadcrumb-path').innerHTML = 'Dashboard Home';
}

// Function to reset the dashboard to its initial state
function resetDashboard() {
    // 1. Load the default home page
    const iframe = document.getElementById('tool-iframe');
    iframe.src = "dashboard_home.html";

    // 2. Reset the breadcrumb
    const breadcrumbPath = document.getElementById('breadcrumb-path');
    breadcrumbPath.innerHTML = 'Dashboard Home';

    // 3. Remove highlight from any selected link
    document.querySelectorAll('.tool-link.tool-highlight').forEach(a => {
        a.classList.remove('tool-highlight');
    });

    // 4. (Recommended) Ensure sidebar is open to the default state
    const wrapper = document.getElementById('main-content-wrapper');
    const toggleButton = document.querySelector('.sidebar-toggle-btn');
    if (wrapper.classList.contains('sidebar-collapsed')) {
        wrapper.classList.remove('sidebar-collapsed');
        toggleButton.textContent = '«'; 
    }

    // 5. Clear any active search filter (assuming filterModules is defined elsewhere)
    const searchInput = document.getElementById('menu-search-input');
    if (searchInput && searchInput.value !== '') {
        searchInput.value = '';
        // Manually trigger the filter function to clear the list
        if (typeof filterModules === 'function') {
            filterModules(); 
        }
    }
}

// CORRECTED function to handle the main sidebar toggle
// Toggles the 'sidebar-collapsed' class on the *wrapper*, not the sidebar itself.
function toggleSidebar() {
    // Target the main wrapper, which controls the overall layout shift
    const wrapper = document.getElementById('main-content-wrapper');
    const toggleButton = document.querySelector('.sidebar-toggle-btn');
    
    // Toggle the class that CSS uses to collapse the sidebar and adjust content margin
    wrapper.classList.toggle('sidebar-collapsed');

    // Update the button text based on the new state
    if (wrapper.classList.contains('sidebar-collapsed')) {
        toggleButton.textContent = '»'; // Closed state
    } else {
        toggleButton.textContent = '«'; // Open state
    }
}

// Function to handle the collapse/expand of L1/L2 groups
function toggleLinks(header) {
   // --- ADDED SEARCH PROTECTION ---
   const searchInput = document.getElementById('menu-search-input');
   const filterActive = searchInput ? searchInput.value.length > 0 : false;
   if (filterActive) {
       // Do not allow manual collapse while search is active
       return; 
   }
   // --- END SEARCH PROTECTION ---
    
   // 1. Find the sibling container that holds the links 
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


/**
 * Loads the selected tool into the iFrame and updates the breadcrumb path.
 * Also highlights the currently selected link.
 */
function loadTool(link) {
   // 1. Update the iFrame source
   const iframe = document.getElementById('tool-iframe');
   iframe.src = link.href;

   // 2. Clear existing highlights and apply new highlight
   document.querySelectorAll('.tool-link').forEach(a => {
      a.classList.remove('tool-highlight');
   });
   link.classList.add('tool-highlight');

   // 3. Update the Breadcrumb Path
   updateBreadcrumb(link);
}

// Function to update the Breadcrumb path
function updateBreadcrumb(element) {
   const breadcrumbPath = document.getElementById('breadcrumb-path');
   let path = 'Dashboard Home';
   
   // This function should only run for the tool links (A tags)
   if (element.tagName === 'A') {
       // Find the immediate parent L2 header (H4) if it exists
       const h4 = element.closest('.sub-tool-links-container')
                  ? element.closest('.sub-tool-links-container').previousElementSibling
                  : null;

       // Find the top-level L1 header (H3)
       const h3 = element.closest('.module-group').querySelector('h3');
       
       // Clean up the text by removing the arrow
       const h3Text = h3.textContent.replace('▼', '').replace('▶', '').trim();
       
       path += ' <span class="separator">/</span> ' + h3Text;

       if (h4) {
           // Clean up the L2 text
           const h4Text = h4.textContent.replace('▼', '').replace('▶', '').trim();
           path += ' <span class="separator">/</span> ' + h4Text;
       }
       
       const toolName = element.textContent.trim();
       path += ' <span class="separator">/</span> <span style="font-weight: 600; color: var(--color-primary);">' + toolName + '</span>';
   }

   breadcrumbPath.innerHTML = path;
}