// Function to load the Dashboard Home page
function loadHome() {
   document.getElementById('tool-iframe').src = "dashboard_home.html";
   document.getElementById('breadcrumb-path').innerHTML = 'Dashboard Home';
}
//testing

// New function to handle the main sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const arrow = document.querySelector('.main-content-wrapper h2 .toggle-arrow');
    
    if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        arrow.textContent = '▼'; // Open state
    } else {
        sidebar.classList.add('hidden');
        arrow.textContent = '▶'; // Closed state
    }
}

//testing



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
//testing end

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

// Ensure the breadcrumb function is adapted to the new HTML structure
// (It only needs to look for the 'A' tag logic now)
function updateBreadcrumb(element) {
   // ... (Use the same logic from the previous reply, but focus on the 'A' tag part) ...
   const breadcrumbPath = document.getElementById('breadcrumb-path');
   let path = 'Dashboard Home';
   
   // Logic for H3 and H4 clicks (for toggling arrows and breadcrumb updates)
   if (element.tagName === 'H3' || element.tagName === 'H4') {
       // We only use the breadcrumb function for the sidebar links (A tags) now,
       // Headers only run toggleLinks. You can simplify this function greatly
       // if you separate the concerns, but we'll leave it for structure.
       return;
   }
   
   // --- Tool Link Click (A tag) ---
   if (element.tagName === 'A') {
       const h4 = element.closest('.sub-tool-links-container')
                  ? element.closest('.sub-tool-links-container').previousElementSibling
                  : null;

       const h3 = element.closest('.module-group').querySelector('h3');
       const h3Text = h3.textContent.replace('▼', '').replace('▶', '').trim();
       
       path += ' <span class="separator">/</span> ' + h3Text;

       if (h4) {
           const h4Text = h4.textContent.replace('▼', '').replace('▶', '').trim();
           path += ' <span class="separator">/</span> ' + h4Text;
       }
       
       const toolName = element.textContent.trim();
       path += ' <span class="separator">/</span> <span style="font-weight: 600; color: #333;">' + toolName + '</span>';
   }

   breadcrumbPath.innerHTML = path;
}