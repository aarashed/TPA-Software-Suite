// --- CENTRAL PLAN RULES OBJECT (MANAGES PERSISTENCE) ---

// 1. DEFAULT LIMITS (Used as the base and the source for reset)
const DEFAULT_PLAN_RULES = {
    LIMITS: {
        comp_max: 345000,
        deferral_402g: 23000,
        catchup: 7500,
        section_415c: 69000,
        hce_comp_test: 155000, 
        secure2_admin_max: 5000,
        secure2_comp_credit_max: 1000,
        secure2_phase_out_employees: 50
    },
    CLIENT_XYZ: {
        plan_name: "XYZ Company 401k Plan (Default)", 
        safe_harbor: true,
        match_formula: "100% of first 3% deferred + 50% of next 2% deferred", // Match formula is here
        vesting_schedule: "3-year cliff",
        comp_definition: "W2 less pre-tax deferrals"
    }
};

/**
 * Loads rules from localStorage if available, otherwise uses defaults.
 */
function loadPlanRules() {
    const savedRules = localStorage.getItem('TPA_PLAN_RULES'); 
    if (savedRules) {
        try {
            const loaded = JSON.parse(savedRules);
            console.log("Plan Rules loaded from local storage.");
            // Ensure all properties, including the new limits, are merged correctly
            return {
                LIMITS: { ...DEFAULT_PLAN_RULES.LIMITS, ...loaded.LIMITS },
                CLIENT_XYZ: { ...DEFAULT_PLAN_RULES.CLIENT_XYZ, ...loaded.CLIENT_XYZ }
            };
        } catch (e) {
            console.error("Error loading plan rules from local storage:", e);
            return DEFAULT_PLAN_RULES; 
        }
    }
    console.log("No plan rules found in local storage. Using default rules.");
    return DEFAULT_PLAN_RULES;
}

// 2. Global variable is initialized by loading from storage
let PLAN_RULES = loadPlanRules();


// --- CORE COMMUNICATION FUNCTIONS ---

function sendInitialPlanConfig() {
    const iframe = document.getElementById('tool-iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'INITIAL_PLAN_CONFIG',
            rules: PLAN_RULES
        }, '*');
    }
}

window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'REQUEST_CONFIG') {
        sendInitialPlanConfig();
    }
    
    if (event.data && event.data.type === 'UPDATE_PLAN_CONFIG') {
        const payload = event.data;
        
        // 1. Update the in-memory limits object 
        PLAN_RULES.LIMITS.comp_max = parseFloat(payload.limits.comp_max);
        PLAN_RULES.LIMITS.section_415c = parseFloat(payload.limits.section_415c);
        PLAN_RULES.LIMITS.hce_comp_test = parseFloat(payload.limits.hce_comp_test);
        PLAN_RULES.LIMITS.deferral_402g = parseFloat(payload.limits.deferral_402g);
        PLAN_RULES.LIMITS.catchup = parseFloat(payload.limits.catchup);
        
        // Update plan rules
        PLAN_RULES.CLIENT_XYZ.plan_name = payload.rules.plan_name; 
        PLAN_RULES.CLIENT_XYZ.safe_harbor = payload.rules.safe_harbor === 'true'; 
        PLAN_RULES.CLIENT_XYZ.match_formula = payload.rules.match_formula; // NEW SAVE
        PLAN_RULES.CLIENT_XYZ.vesting_schedule = payload.rules.vesting_schedule;
        PLAN_RULES.CLIENT_XYZ.comp_definition = payload.rules.comp_definition;

        // 2. Save the entire updated object to local storage
        localStorage.setItem('TPA_PLAN_RULES', JSON.stringify(PLAN_RULES)); 
        
        // 3. Update all UI elements
        updateHeaderPlanName();
        const iframe = document.getElementById('tool-iframe');
        if (iframe && (iframe.src.includes('dashboard_home.html') || iframe.src.includes('plan_config_tool.html'))) {
             window.renderLimitsSummary();
        }
    }

    // Handle the Reset to Defaults message
    if (event.data && event.data.type === 'RESET_CONFIG') {
        PLAN_RULES = JSON.parse(JSON.stringify(DEFAULT_PLAN_RULES)); 
        localStorage.removeItem('TPA_PLAN_RULES');

        console.log("Plan Limits Reset to IRS Defaults. Local storage cleared.");
        
        // Update all UI elements
        updateHeaderPlanName();
        sendInitialPlanConfig();
        
        if (window.renderLimitsSummary) {
             window.renderLimitsSummary();
        }
    }
});


// --- CRITICAL NEW FUNCTION: Updates the Plan Name in the Header ---
function updateHeaderPlanName() {
    const headerElement = document.getElementById('header-plan-name');
    if (headerElement) {
        // Use the plan_name from the central rules object
        const planName = PLAN_RULES.CLIENT_XYZ.plan_name || 'N/A';
        headerElement.textContent = `Welcome, Lead Analyst | Plan: ${planName}`;
    }
}


// --- TOOL LOADER FUNCTION (Attached to window for onclick) ---
window.loadTool = function(element) {
    const link = element.href;
    const iframe = document.getElementById('tool-iframe');
    
    if (iframe) {
        iframe.onload = function() {
            sendInitialPlanConfig();
            iframe.onload = null;
        };
        iframe.src = link;
    }

    try {
        updateBreadcrumb(element);
        const currentActive = document.querySelector('.tool-link.active');
        if (currentActive) {
            currentActive.classList.remove('active');
        }
        element.classList.add('active');
    } catch (e) {
        console.error("Error updating breadcrumb/active state:", e);
    }
};


// --- UTILITY/HELPER FUNCTIONS (Attached to window) ---
function updateBreadcrumb(element) {
    const breadcrumbPath = document.getElementById('breadcrumb-path');
    let path = 'Dashboard Home';
    
    if (element) {
        const subContainer = element.closest('.sub-tool-links-container');
        const mainContainer = element.closest('.tool-links-container');
        
        const h4 = subContainer ? subContainer.previousElementSibling : null;
        const h3 = mainContainer ? mainContainer.previousElementSibling : null;
        
        const cleanText = (node) => node ? node.textContent.replace(/[\u25B6\u25BC\u25BA\u25C0\u25B8\u25C2\u25C4▶▼]/g, '').trim() : '';

        const h3Text = cleanText(h3);
        if (h3Text) {
            path += ' <span class="separator">/</span> ' + h3Text;
        }

        if (h4 && h4.tagName === 'H4') {
            const h4Text = cleanText(h4);
            path += ' <span class="separator">/</span> ' + h4Text;
        }
        
        const toolName = element.textContent.trim();
        path += ' <span class="separator">/</span> <span style="font-weight: 600; color: #333;">' + toolName + '</span>';
    }
    
    breadcrumbPath.innerHTML = path;
}

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.getElementById('main-content-wrapper');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
    
    if (wrapper) {
        wrapper.classList.toggle('sidebar-collapsed');
    }
}

window.resetDashboard = function() {
    const iframe = document.getElementById('tool-iframe');
    if (iframe) {
        iframe.src = 'dashboard_home.html'; 
    }
    updateBreadcrumb(null);
    
    const currentActive = document.querySelector('.tool-link.active');
    if (currentActive) {
        currentActive.classList.remove('active');
    }
}

// --- CRITICAL: LIMITS RENDERING FUNCTION ---

function formatLimitValue(key, value) {
    if (['comp_max', 'deferral_402g', 'catchup', 'section_415c', 'hce_comp_test', 'secure2_admin_max', 'secure2_comp_credit_max'].includes(key)) {
       return '$' + new Intl.NumberFormat('en-US').format(value); 
    }
    return new Intl.NumberFormat('en-US').format(value); 
}

function getLimitLabel(key) {
    const labels = {
        comp_max: "Max. Compensation (401(a)(17))",
        deferral_402g: "Elective Deferral Limit (402(g))",
        catchup: "Catch-up Contribution Limit (Age 50+)",
        section_415c: "Annual Additions Limit (415(c))",
        hce_comp_test: "HCE Compensation Threshold",
        secure2_admin_max: "SECURE 2.0 Max Admin Cost Credit",
        secure2_comp_credit_max: "SECURE 2.0 Max Comp for Credit",
        secure2_phase_out_employees: "SECURE 2.0 Phase-out Employee Count"
    };
    return labels[key] || key.replace(/_/g, ' ').toUpperCase();
}


/**
 * Renders the PLAN_RULES.LIMITS data as a read-only summary on the dashboard home page.
 */
window.renderLimitsSummary = function() {
    const iframe = document.getElementById('tool-iframe');
    
    const iframeDoc = iframe ? (iframe.contentWindow ? iframe.contentWindow.document : null) : null;
    if (!iframeDoc) return;
    
    const limitsContainer = iframeDoc.getElementById('limits-display-grid');

    if (!limitsContainer) {
        console.error("Could not find limits-display-grid. Ensure dashboard_home.html is the correct read-only version.");
        return; 
    }

    let html = '';
    
    for (const key in PLAN_RULES.LIMITS) {
        if (PLAN_RULES.LIMITS.hasOwnProperty(key)) {
            const value = PLAN_RULES.LIMITS[key];
            const label = getLimitLabel(key);
            const formattedValue = formatLimitValue(key, value);
            
            html += `
                <div class="limit-item">
                    <div class="limit-label">${label}</div>
                    <div class="limit-value">${formattedValue}</div>
                </div>
            `;
        }
    }
    
    limitsContainer.innerHTML = html;
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    // 1. Initial load of the breadcrumb and plan name in header
    updateBreadcrumb(null);
    updateHeaderPlanName();
    
    // 2. Setup iframe onload listener
    const iframe = document.getElementById('tool-iframe');
    
    if (iframe) {
        iframe.onload = function() {
            if (iframe.src.includes('dashboard_home.html')) {
                setTimeout(window.renderLimitsSummary, 100); 
            }
        };
        // If the content is already loaded (e.g., hard refresh), manually call onload
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
             iframe.onload(); 
        }
    }
});