// SonarKai - Business Ontology Generator
// Wizard flow: DG Platform → Industry → Company Details

// Auto-detect API base URL (works for local dev, DEV, and production)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8002'  // Local: ALWAYS use port 8002 for Python backend
    : (window.location.hostname.includes('sonarkai-dev.onrender.com')
        ? 'https://sonarkai-api-dev.onrender.com'  // DEV environment
        : (window.location.hostname.includes('sonarkai.onrender.com')
            ? 'https://sonarkai-api.onrender.com'  // PROD environment
            : window.location.origin));  // Fallback: same origin

// State
let currentStep = 0;
let wizardData = {
    version: 'semantic-catalyst', // A/B test identifier
    email: '',
    dgPlatform: '', // New field
    industry: '',
    hqLocation: '',
    challenge: '', // New field: biggest DG challenge
    companyName: ''
};

// Exploration tracking
let sessionId = Math.random().toString(36).substr(2, 9);
let explorationCredits = 10;
let semanticData = null;
let caveDepth = {
    'business_processes': 0,
    'regulations': 0,
    'applications': 0,
    'business_terms': 0
};

// Context-aware exploration tracking
let explorationContext = {
    type: null,  // "regulation", "lob", "process", null
    source: null,  // e.g., "IFRS 17", "Property & Casualty", "Claims Processing"
    depth: 0,
    breadcrumbs: []  // ["Lloyd's", "IFRS 17", "Business Terms"]
};

// Intelligent exploration optimization
let explorationCache = new Map();

// ============================================================================
// KNOWLEDGE GRAPH: Discovered Nodes State Tracking
// ============================================================================
// Track what user actually discovered during exploration (for accurate KG)
let discoveredNodes = {
    company: {
        id: 'company-root',
        label: '',  // Set from wizardData.companyName
        type: 'company',
        data: {
            industry: '',
            hq_location: '',
            dg_platform: ''
        }
    },
    regulations: [],  // Only regulations user explored (not all from semantic layer)
    linesOfBusiness: [],  // Always include all LoB (from header enrichment)
    processes: [],  // Only processes user explored from LoB
    terms: []  // Only terms user explored from regulations or processes
};

// Update section visibility based on exploration context
function updateSectionVisibility(contextType) {
    // Get all section containers
    const regulationsSection = document.querySelector('#regulations-grid')?.closest('.mb-8');
    const lobSection = document.querySelector('#lob-grid')?.closest('.mb-8');
    const processesSection = document.querySelector('#processes-grid')?.closest('.mb-8');
    const termsSection = document.querySelector('#terms-grid')?.closest('.mb-8');

    if (!regulationsSection || !lobSection || !processesSection || !termsSection) return;

    // Update breadcrumb
    updateBreadcrumb();

    // Context-aware visibility logic
    if (contextType === 'regulation') {
        // User exploring regulation → Show ONLY regulations and business terms sections
        regulationsSection.classList.remove('hidden');
        lobSection.classList.add('hidden');
        processesSection.classList.add('hidden');
        termsSection.classList.remove('hidden');

    } else if (contextType === 'lob') {
        // User exploring LoB → Show ONLY LoB and business processes sections
        regulationsSection.classList.add('hidden');
        lobSection.classList.remove('hidden');
        processesSection.classList.remove('hidden');
        termsSection.classList.add('hidden');

    } else if (contextType === 'process') {
        // User exploring process → Show ONLY processes and business terms sections
        regulationsSection.classList.add('hidden');
        lobSection.classList.add('hidden');
        processesSection.classList.remove('hidden');
        termsSection.classList.remove('hidden');

    } else {
        // Root/default view → Show all sections
        regulationsSection.classList.remove('hidden');
        lobSection.classList.remove('hidden');
        processesSection.classList.remove('hidden');
        termsSection.classList.remove('hidden');
    }

    // Highlight active sections in KG visualization
    highlightKGSections(contextType);
}

// Update breadcrumb navigation
function updateBreadcrumb() {
    const breadcrumbContainer = document.getElementById('exploration-breadcrumb');
    if (!breadcrumbContainer) return;

    if (explorationContext.breadcrumbs.length === 0) {
        breadcrumbContainer.classList.add('hidden');
        return;
    }

    breadcrumbContainer.classList.remove('hidden');
    breadcrumbContainer.innerHTML = explorationContext.breadcrumbs.map((crumb, idx) => {
        const isLast = idx === explorationContext.breadcrumbs.length - 1;
        return `
            <span class="${isLast ? 'text-purple-400 font-semibold' : 'text-gray-400 hover:text-purple-300 cursor-pointer'}"
                  ${!isLast ? `onclick="navigateToBreadcrumb(${idx})"` : ''}>
                ${crumb}
            </span>
            ${!isLast ? '<span class="text-gray-600 mx-2">→</span>' : ''}
        `;
    }).join('');
}

// Navigate back to a breadcrumb level
function navigateToBreadcrumb(index) {
    // Trim breadcrumbs to selected level
    explorationContext.breadcrumbs = explorationContext.breadcrumbs.slice(0, index + 1);
    explorationContext.depth = index + 1;

    // Update context type based on breadcrumb level
    if (index === 0) {
        // Back to root
        explorationContext.type = null;
        explorationContext.source = null;
    } else if (index === 1) {
        // Back to regulation or LoB level
        const source = explorationContext.breadcrumbs[1];
        explorationContext.type = selectedRegulation ? 'regulation' : 'lob';
        explorationContext.source = source;
    }

    updateSectionVisibility(explorationContext.type);
}

// Highlight sections in KG visualization
function highlightKGSections(contextType) {
    // Store active context type globally for KG rendering
    window.activeKGContextType = contextType;
    console.log(`🎯 Highlighting KG sections for context: ${contextType}`);

    // If KG modal is currently open, re-render it with highlighting
    const kgModal = document.getElementById('kg-modal');
    if (kgModal && !kgModal.classList.contains('hidden')) {
        renderKnowledgeGraph();
    }
}

// Automatically enrich KG with exploration results
async function enrichKGWithExploration(sectionType, explorationData) {
    try {
        console.log(`🔍 DEBUG: Sending to KG enrich - section: ${sectionType}, data:`, explorationData);
        const response = await fetch(`${API_BASE}/api/kg/enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_name: wizardData.companyName,
                section_type: sectionType,
                exploration_data: explorationData
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ KG enriched with ${sectionType}:`, result.sections_enriched);
            return true;
        } else {
            console.error(`⚠️ Failed to enrich KG with ${sectionType}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error enriching KG:`, error);
        return false;
    }
}

// Intelligent context fingerprinting
function getCacheKey(sectionType, context) {
    const contextKey = {
        type: sectionType,
        regulations: Array.isArray(context.regulations) ? context.regulations.sort().join(',') : (context.regulations || ''),
        lob: context.line_of_business || '',
        process: context.business_process || '',
        depth: context.depth || 1,
        company: context.company_name || '',
        industry: context.industry || ''
    };
    return JSON.stringify(contextKey);
}

// Smart retrieval
function getCachedExploration(sectionType, context) {
    const key = getCacheKey(sectionType, context);
    return explorationCache.get(key);
}

// Intelligent memoization
function cacheExploration(sectionType, context, result) {
    const key = getCacheKey(sectionType, context);
    explorationCache.set(key, {
        result: result,
        timestamp: Date.now(),
        instant: true
    });
}

// Wizard Steps (Different from Version A)
const steps = [
    {
        id: 'dg-platform',
        title: 'Which Data Governance platform are you using?',
        subtitle: 'We\'ll tailor the semantic layer export format to your platform',
        render: () => `
            <div class="wizard-step space-y-4">
                <h3 class="text-2xl font-bold mb-2">${steps[currentStep].title}</h3>
                <p class="text-gray-400 mb-6">${steps[currentStep].subtitle}</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${[
                        { value: 'collibra', label: 'Collibra', icon: '' },
                        { value: 'alation', label: 'Alation', icon: '' },
                        { value: 'informatica', label: 'Informatica', icon: '' },
                        { value: 'atlan', label: 'Atlan', icon: '' },
                        { value: 'planning', label: 'Planning to implement one', icon: '📋' },
                        { value: 'none', label: 'No DG platform yet', icon: '🆕' },
                        { value: 'other', label: 'Other (please specify)', icon: '🔧' }
                    ].map(platform => `
                        <button
                            class="platform-option bg-catalyst-dark/50 hover:bg-purple-900/30 border-2 border-gray-700 hover:border-purple-500 rounded-lg p-4 text-left transition-all"
                            data-value="${platform.value}"
                        >
                            <div class="flex items-center ${platform.icon ? 'space-x-3' : ''}">
                                ${platform.icon ? `<span class="text-3xl">${platform.icon}</span>` : ''}
                                <span class="font-semibold">${platform.label}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>

                <!-- Custom platform input (hidden by default) -->
                <div id="platform-custom-container" class="hidden mt-3 space-y-3">
                    <input
                        type="text"
                        id="platform-custom-input"
                        class="w-full bg-catalyst-dark/50 border-2 border-gray-700 focus:border-purple-500 rounded-lg px-4 py-3 text-white outline-none transition-colors"
                        placeholder="Enter your platform name..."
                    >
                    <button
                        id="platform-custom-continue"
                        class="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
                    >
                        Continue
                    </button>
                </div>
            </div>
        `,
        validate: () => {
            const selected = document.querySelector('.platform-option.selected');
            if (!selected) {
                alert('Please select your Data Governance platform');
                return false;
            }

            let platformValue = selected.dataset.value;

            // Handle "Other" option
            if (platformValue === 'other') {
                const customPlatform = document.getElementById('platform-custom-input').value.trim();
                if (!customPlatform) {
                    alert('Please enter your platform name');
                    return false;
                }
                platformValue = customPlatform;
            }

            wizardData.dgPlatform = platformValue;
            return true;
        }
    },
    {
        id: 'industry',
        title: 'What industry are you in?',
        subtitle: 'We\'ll load the regulatory frameworks specific to your sector',
        render: () => `
            <div class="wizard-step space-y-4">
                <h3 class="text-2xl font-bold mb-2">${steps[currentStep].title}</h3>
                <p class="text-gray-400 mb-6">${steps[currentStep].subtitle}</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${[
                        { value: 'insurance', label: 'Insurance', icon: '🏥' },
                        { value: 'banking', label: 'Banking & Finance', icon: '🏦' },
                        { value: 'healthcare', label: 'Healthcare', icon: '⚕️' },
                        { value: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
                        { value: 'electronics', label: 'Electronics & Consumer Goods', icon: '📱' },
                        { value: 'retail', label: 'Retail & E-commerce', icon: '🛒' },
                        { value: 'technology', label: 'Technology & SaaS', icon: '💻' },
                        { value: 'other', label: 'Other (please specify)', icon: '🔧' }
                    ].map(industry => `
                        <button
                            class="industry-option bg-catalyst-dark/50 hover:bg-purple-900/30 border-2 border-gray-700 hover:border-purple-500 rounded-lg p-4 text-left transition-all"
                            data-value="${industry.value}"
                        >
                            <div class="flex items-center space-x-3">
                                <span class="text-3xl">${industry.icon}</span>
                                <span class="font-semibold">${industry.label}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>

                <!-- Custom industry input (hidden by default) -->
                <div id="industry-custom-container" class="hidden mt-3 space-y-3">
                    <input
                        type="text"
                        id="industry-custom-input"
                        class="w-full bg-catalyst-dark/50 border-2 border-gray-700 focus:border-purple-500 rounded-lg px-4 py-3 text-white outline-none transition-colors"
                        placeholder="Enter your industry..."
                    >
                    <button
                        id="industry-custom-continue"
                        class="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
                    >
                        Continue
                    </button>
                </div>
            </div>
        `,
        validate: () => {
            const selected = document.querySelector('.industry-option.selected');
            if (!selected) {
                alert('Please select your industry');
                return false;
            }

            let industryValue = selected.dataset.value;

            // Handle "Other" option
            if (industryValue === 'other') {
                const customIndustry = document.getElementById('industry-custom-input').value.trim();
                if (!customIndustry) {
                    alert('Please enter your industry');
                    return false;
                }
                industryValue = customIndustry;
            }

            wizardData.industry = industryValue;
            return true;
        }
    },
    {
        id: 'contact',
        title: 'Tell us about your company',
        subtitle: 'We\'ll generate your complete business ontology based on your industry and location',
        render: () => `
            <div class="wizard-step space-y-6">
                <h3 class="text-2xl font-bold mb-2">${steps[currentStep].title}</h3>
                <p class="text-gray-400 mb-6">${steps[currentStep].subtitle}</p>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Company Name</label>
                        <input
                            type="text"
                            id="company-input"
                            class="w-full bg-catalyst-dark/50 border-2 border-gray-700 focus:border-purple-500 rounded-lg px-4 py-3 text-white outline-none transition-colors"
                            placeholder="Your Company Name"
                            required
                        >
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Headquarters Location</label>
                        <select
                            id="hq-select"
                            class="w-full bg-catalyst-dark/50 border-2 border-gray-700 focus:border-purple-500 rounded-lg px-4 py-3 text-white outline-none transition-colors"
                            required
                        >
                            <option value="">Select country...</option>
                            <optgroup label="🇪🇺 European Union">
                                <option value="Belgium">Belgium</option>
                                <option value="Spain">Spain</option>
                                <option value="Netherlands">Netherlands</option>
                                <option value="Germany">Germany</option>
                                <option value="France">France</option>
                                <option value="Ireland">Ireland</option>
                                <option value="Luxembourg">Luxembourg</option>
                            </optgroup>
                            <optgroup label="🌍 Other Europe">
                                <option value="United Kingdom">United Kingdom</option>
                                <option value="Switzerland">Switzerland</option>
                            </optgroup>
                            <optgroup label="🌎 Americas">
                                <option value="United States">United States</option>
                                <option value="Canada">Canada</option>
                            </optgroup>
                            <optgroup label="🌏 Asia Pacific">
                                <option value="South Korea">South Korea</option>
                                <option value="Japan">Japan</option>
                                <option value="China">China</option>
                                <option value="Singapore">Singapore</option>
                                <option value="Hong Kong">Hong Kong</option>
                                <option value="Australia">Australia</option>
                                <option value="India">India</option>
                            </optgroup>
                            <optgroup label="🌍 Middle East & Africa">
                                <option value="United Arab Emirates">United Arab Emirates</option>
                                <option value="Saudi Arabia">Saudi Arabia</option>
                                <option value="South Africa">South Africa</option>
                            </optgroup>
                            <option value="other">🌍 Other (please specify)</option>
                        </select>
                        <input
                            type="text"
                            id="hq-custom-input"
                            class="hidden w-full bg-catalyst-dark/50 border-2 border-gray-700 focus:border-purple-500 rounded-lg px-4 py-3 text-white outline-none transition-colors mt-3"
                            placeholder="Enter your country..."
                        >
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Your Work Email</label>
                        <input
                            type="email"
                            id="email-input"
                            class="w-full bg-catalyst-dark/50 border-2 border-gray-700 focus:border-purple-500 rounded-lg px-4 py-3 text-white outline-none transition-colors"
                            placeholder="your.email@company.com"
                            required
                        >
                        <p class="text-xs text-gray-500 mt-1">We'll send your business ontology here</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">What's your biggest Data Governance challenge? (Optional)</label>
                        <textarea
                            id="challenge-input"
                            rows="3"
                            class="w-full bg-catalyst-dark/50 border-2 border-gray-700 focus:border-purple-500 rounded-lg px-4 py-3 text-white outline-none transition-colors"
                            placeholder="e.g., Business glossary is blank, no time for manual data lineage, too many regulations to track..."
                        ></textarea>
                    </div>
                </div>

                <button
                    id="generate-btn"
                    class="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg transition-all"
                >
                    Generate My Business Ontology (Free)
                </button>
            </div>
        `,
        validate: () => {
            const email = document.getElementById('email-input').value.trim();
            const company = document.getElementById('company-input').value.trim();
            const hq = document.getElementById('hq-select').value;
            const challenge = document.getElementById('challenge-input').value.trim();

            if (!email || !company || !hq) {
                alert('Please fill in all required fields');
                return false;
            }

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                return false;
            }

            // Handle "Other" country option
            let finalHq = hq;
            if (hq === 'other') {
                const customHq = document.getElementById('hq-custom-input').value.trim();
                if (!customHq) {
                    alert('Please enter your country');
                    return false;
                }
                finalHq = customHq;
            }

            wizardData.email = email;
            wizardData.companyName = company;
            wizardData.hqLocation = finalHq;
            wizardData.challenge = challenge;

            return true;
        }
    }
];

// UI Functions
function showSection(sectionId) {
    ['wizard-section', 'loading-section', 'results-section'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

function updateProgress() {
    const percent = ((currentStep + 1) / steps.length) * 100;
    document.getElementById('current-step').textContent = currentStep + 1;
    document.getElementById('progress-percent').textContent = Math.round(percent);
    document.getElementById('progress-bar').style.width = percent + '%';
}

function renderStep() {
    const container = document.getElementById('step-container');
    container.innerHTML = steps[currentStep].render();
    updateProgress();

    // Add click handlers for selection buttons
    if (currentStep === 0) {
        // DG Platform selection
        const customContainer = document.getElementById('platform-custom-container');
        const customInput = document.getElementById('platform-custom-input');
        const customContinue = document.getElementById('platform-custom-continue');

        document.querySelectorAll('.platform-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.platform-option').forEach(b => b.classList.remove('selected', 'border-purple-500', 'bg-purple-900/30'));
                btn.classList.add('selected', 'border-purple-500', 'bg-purple-900/30');

                // Show/hide custom input based on selection
                if (btn.dataset.value === 'other') {
                    customContainer.classList.remove('hidden');
                    customInput.focus();
                } else {
                    customContainer.classList.add('hidden');
                    customInput.value = ''; // Clear custom input
                    setTimeout(() => nextStep(), 300);
                }
            });
        });

        // Handle continue button for custom platform
        customContinue.addEventListener('click', () => {
            nextStep();
        });

        // Handle Enter key in custom input
        customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                nextStep();
            }
        });
    } else if (currentStep === 1) {
        // Industry selection
        const customContainer = document.getElementById('industry-custom-container');
        const customInput = document.getElementById('industry-custom-input');
        const customContinue = document.getElementById('industry-custom-continue');

        document.querySelectorAll('.industry-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.industry-option').forEach(b => b.classList.remove('selected', 'border-purple-500', 'bg-purple-900/30'));
                btn.classList.add('selected', 'border-purple-500', 'bg-purple-900/30');

                // Show/hide custom input based on selection
                if (btn.dataset.value === 'other') {
                    customContainer.classList.remove('hidden');
                    customInput.focus();
                } else {
                    customContainer.classList.add('hidden');
                    customInput.value = ''; // Clear custom input
                    setTimeout(() => nextStep(), 300);
                }
            });
        });

        // Handle continue button for custom industry
        customContinue.addEventListener('click', () => {
            nextStep();
        });

        // Handle Enter key in custom input
        customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                nextStep();
            }
        });
    } else if (currentStep === 2) {
        // Final step - add generate button handler
        document.getElementById('generate-btn').addEventListener('click', generateSemanticLayer);
    }
}

function nextStep() {
    if (steps[currentStep].validate()) {
        if (currentStep < steps.length - 1) {
            currentStep++;
            renderStep();
        }
    }
}

async function generateSemanticLayer() {
    if (!steps[currentStep].validate()) {
        return;
    }

    // VERSION B: Skip wizard API calls, go straight to interactive graph
    // Check if running on port 8002 (Version B) OR explicitly in interactive mode OR on Render production
    const isVersionB = window.location.port === '8002' ||
                       window.location.pathname.includes('sonarkai-interactive') ||
                       window.location.hostname.includes('sonarkai.onrender.com') ||
                       window.location.hostname.includes('sonarkai-api.onrender.com') ||
                       window.versionBMode;

    if (isVersionB) {
        console.log('🎯 Version B detected - will show loading screen then load interactive graph');

        // Store wizard data for Version B (with AI magic context!)
        window.versionBCompanyName = wizardData.company_name || wizardData.companyName || 'Your Company';
        window.wizardData = {
            companyName: wizardData.company_name || wizardData.companyName,
            industry: wizardData.industry,
            hqLocation: wizardData.hq_location || wizardData.hqLocation,
            email: wizardData.email
        };

        console.log('📦 Stored wizard data for AI exploration:', window.wizardData);

        // Show loading screen with spinner
        showSection('loading-section');
        document.getElementById('loading-message').innerHTML = showSpinner('Loading your knowledge graph...');

        // Wait briefly to ensure loading screen displays, then trigger KG loading
        setTimeout(() => {
            // Show results section (which triggers Version B graph loading via MutationObserver)
            showSection('results-section');
        }, 500); // 500ms delay to show loading screen

        return;
    }

    // Show loading
    showSection('loading-section');

    // Start loading animation sequence
    animateLoadingSteps();

    // Update loading message
    document.getElementById('loading-message').innerHTML = showSpinner('Enriching company profile...');

    try {
        // Step 1: Enrich email domain (existing)
        const enrichResponse = await fetch(`${API_BASE}/api/enrich-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: wizardData.email })
        });

        const enrichData = await enrichResponse.json();
        console.log('Enrichment data:', enrichData);

        // Show step 1 complete
        completeLoadingStep(1);

        // Step 2: IMMEDIATELY enrich company header (fast, 1-2 seconds)
        document.getElementById('loading-message').innerHTML = showSpinner('Analyzing company leadership...');

        const headerResponse = await fetch(`${API_BASE}/api/enrich-company-header`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_name: wizardData.companyName || enrichData.company_name,
                hq_location: wizardData.hqLocation,
                industry: wizardData.industry,
                user_name: enrichData.user_name || null
            })
        });

        const headerData = await headerResponse.json();
        console.log('Header enrichment data:', headerData);

        // Store header data globally for results page
        window.headerData = headerData;

        // Show step 2 complete
        completeLoadingStep(2);

        // Step 3: Generate Light Semantic Overview (3-4 seconds)
        document.getElementById('loading-message').innerHTML = showSpinner('Analyzing regulatory landscape...');

        // Show step 3 progress
        completeLoadingStep(3);

        // Step 4: Generate Semantic Layer (takes longer, 7-10 seconds)

        // Map country names to ISO codes for regulation lookup
        const countryMap = {
            // EU
            'Spain': 'ES',
            'Netherlands': 'NL',
            'Germany': 'DE',
            'France': 'FR',
            'Belgium': 'BE',
            'Ireland': 'IE',
            'Luxembourg': 'LU',
            // Other Europe
            'United Kingdom': 'GB',
            'Switzerland': 'CH',
            // Americas
            'United States': 'US',
            'Canada': 'CA',
            // Asia Pacific
            'South Korea': 'KR',
            'Japan': 'JP',
            'China': 'CN',
            'Singapore': 'SG',
            'Hong Kong': 'HK',
            'Australia': 'AU',
            'India': 'IN',
            // Middle East & Africa
            'United Arab Emirates': 'AE',
            'Saudi Arabia': 'SA',
            'South Africa': 'ZA'
        };

        const countryName = wizardData.hqLocation.trim();
        // If country not in map, send null - let backend/LLM infer from full name
        const countryCode = countryMap[countryName] || null;

        // Create AbortController with 120 second timeout (semantic layer generation can take 30-60s)
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 120000); // 120 seconds

        const semanticResponse = await fetch(`${API_BASE}/api/semantic-catalyst`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'semantic-catalyst',
                email: wizardData.email,
                dg_platform: wizardData.dgPlatform,
                enriched_context: {
                    company_name: wizardData.companyName || enrichData.company_name,
                    industry: wizardData.industry,
                    hq_location: wizardData.hqLocation,
                    inferred_country_code: countryCode,
                    challenge: wizardData.challenge,
                    confidence: enrichData.confidence || 'medium'
                }
            }),
            signal: abortController.signal
        });

        // Clear timeout on successful response
        clearTimeout(timeoutId);

        if (!semanticResponse.ok) {
            const errorData = await semanticResponse.json().catch(() => ({ detail: 'Unknown error' }));
            console.error('Semantic layer API error:', semanticResponse.status, errorData);
            throw new Error(`API error: ${errorData.detail || semanticResponse.statusText}`);
        }

        semanticData = await semanticResponse.json();
        console.log('Semantic layer data:', semanticData);

        // Validate response structure
        if (!semanticData || !semanticData.semantic_layer) {
            console.error('Invalid response structure:', semanticData);
            throw new Error('Invalid response from server - missing semantic_layer');
        }

        // Mark final step complete
        completeLoadingStep(4);

        // Show results
        displaySemanticResults(semanticData);

    } catch (error) {
        console.error('Error generating semantic layer:', error);
        console.error('Error stack:', error.stack);

        // Better error handling for timeout vs other errors
        if (error.name === 'AbortError') {
            alert(`⏱️ Generation is taking longer than expected.\n\nThis can happen with complex regulatory landscapes. Please try again, or contact us at support@kaimak.ai if the issue persists.\n\nTip: The generation typically completes in 30-60 seconds.`);
        } else {
            alert(`Something went wrong: ${error.message}\n\nPlease try again or contact support@kaimak.ai`);
        }

        showSection('hero-section');
    }
}

// Domain Exploration Functions
async function exploreCave(caveType) {
    if (explorationCredits <= 0) {
        showCreditsExhausted();
        return;
    }

    // Show spinner immediately
    const htmlId = caveType === 'business_processes' ? 'processes' :
                   caveType === 'business_terms' ? 'terms' :
                   caveType;

    const containerEl = document.getElementById(`cave-content-${htmlId}`);
    if (containerEl) {
        containerEl.innerHTML = showSpinner(`Exploring ${getCaveName(caveType)}...`);
        containerEl.classList.remove('hidden');
    }

    try {
        // Extract regulations from semantic data for context
        const regulations = semanticData?.semantic_layer?.regulatory_context?.map(r => r.name) || [];

        // Increment depth for this domain
        const currentDepth = caveDepth[caveType];

        const response = await fetch(`${API_BASE}/api/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section_type: caveType,
                context: {
                    company_name: wizardData.companyName,
                    industry: wizardData.industry,
                    hq_location: wizardData.hqLocation,
                    regulations: regulations,
                    depth: currentDepth + 1  // Pass current depth for progressive detail
                },
                expansion_type: 'full_list',
                session_id: sessionId
            })
        });

        if (response.status === 402) {
            // Credits exhausted
            showCreditsExhaustedModal();
            return;
        }

        const result = await response.json();

        // Update credits
        explorationCredits = result.credits_remaining;
        updateCreditsDisplay();

        // Update cave depth
        caveDepth[caveType]++;

        // Update cave UI
        updateCaveUI(caveType, result.content);

        console.log(`🔍 ${getCaveName(caveType)} analyzed (depth ${caveDepth[caveType]}), ${explorationCredits} explorations remaining`);

    } catch (error) {
        console.error('Analysis error:', error);
        alert('Unable to complete analysis right now. Please try again.');
    }
}

function updateCaveUI(caveType, content) {
    const depth = caveDepth[caveType];

    // Convert cave type to HTML ID format (business_processes → processes, regulations → regulations, etc.)
    const htmlId = caveType === 'business_processes' ? 'processes' :
                   caveType === 'business_terms' ? 'terms' :
                   caveType;

    // Update cave icon (🔒 → ✅ after first exploration)
    const iconEl = document.getElementById(`cave-icon-${htmlId}`);
    if (iconEl && depth === 1) {
        iconEl.textContent = '✅';
    }

    // Update depth indicator
    const depthEl = document.getElementById(`depth-${htmlId}`);
    if (depthEl) {
        depthEl.textContent = `Explored ${depth} time${depth > 1 ? 's' : ''}`;
        depthEl.classList.remove('text-gray-400');
        depthEl.classList.add('text-purple-400');
    }

    // Update button text
    const btnTextEl = document.getElementById(`btn-text-${htmlId}`);
    if (btnTextEl) {
        if (depth === 1) {
            btnTextEl.textContent = `Go Deeper into ${getCaveName(caveType)}`;
        } else {
            btnTextEl.textContent = `Explore Further (Level ${depth + 1})`;
        }
    }

    // Append new content to cave container (don't replace, allow accumulation)
    const containerEl = document.getElementById(`cave-content-${htmlId}`);
    if (containerEl) {
        const newContent = renderCaveContent(caveType, content, depth);

        // Add depth separator if not first exploration
        if (depth > 1) {
            const separator = document.createElement('div');
            separator.className = 'border-t border-purple-500/30 my-4 pt-4';
            separator.innerHTML = `<div class="text-xs text-purple-400 font-semibold mb-3">🔍 Level ${depth} - Deeper Insights</div>`;
            containerEl.appendChild(separator);
        }

        containerEl.insertAdjacentHTML('beforeend', newContent);
        containerEl.classList.remove('hidden');
        containerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function getCaveName(caveType) {
    const names = {
        'business_processes': 'Business Processes',
        'regulations': 'Regulations',
        'applications': 'Applications',
        'business_terms': 'Business Terms'
    };
    return names[caveType] || caveType;
}

function renderCaveContent(caveType, content, depth) {
    // Render based on cave type
    switch (caveType) {
        case 'business_processes':
            return renderProcesses(content);
        case 'regulations':
            return renderRegulations(content);
        case 'applications':
            return renderApplications(content);
        case 'business_terms':
            return renderBusinessTerms(content);
        default:
            return '<div class="text-gray-400">No content available</div>';
    }
}

function renderProcesses(content) {
    const processes = content.processes || [];
    return processes.map(proc => `
        <div class="bg-catalyst-dark/50 border border-blue-500/30 rounded-lg p-4 hover:border-blue-500 transition-all">
            <div class="flex items-start justify-between mb-3">
                <div class="font-bold text-blue-400 text-lg">${proc.name}</div>
                <span class="text-xs px-2 py-1 rounded ${
                    proc.compliance_risk === 'High' ? 'bg-red-900/30 text-red-400' :
                    proc.compliance_risk === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-green-900/30 text-green-400'
                }">
                    ${proc.compliance_risk} Risk
                </span>
            </div>
            <div class="text-sm text-gray-300 mb-3">${proc.description}</div>

            ${proc.key_activities ? `
                <div class="mb-3">
                    <div class="text-xs font-semibold text-gray-400 mb-2">🎯 Key Activities:</div>
                    <ul class="text-xs text-gray-400 space-y-1 pl-4">
                        ${proc.key_activities.map(act => `<li>• ${act}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="text-xs text-gray-500 space-y-1">
                ${proc.regulatory_drivers ? `<div>⚖️ Regulations: ${proc.regulatory_drivers}</div>` : ''}
                ${proc.data_dependencies ? `<div>📊 Data: ${proc.data_dependencies}</div>` : ''}
                ${proc.systems_involved ? `<div>💻 Systems: ${proc.systems_involved}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function renderRegulations(content) {
    const regulations = content.regulations || [];
    return regulations.map(reg => `
        <div class="bg-catalyst-dark/50 border border-green-500/30 rounded-lg p-4 hover:border-green-500 transition-all">
            <div class="flex items-start justify-between mb-3">
                <div>
                    <div class="font-bold text-green-400 text-lg">${reg.name}</div>
                    <div class="text-xs text-gray-500">${reg.jurisdiction || 'N/A'}</div>
                </div>
                <span class="text-xs px-2 py-1 rounded bg-purple-900/30 text-purple-400">
                    ${reg.scope || 'General'}
                </span>
            </div>

            ${reg.description ? `<div class="text-sm text-gray-300 mb-3">${reg.description}</div>` : ''}

            ${reg.compliance_requirements ? `
                <div class="mb-3">
                    <div class="text-xs font-semibold text-gray-400 mb-2">✅ Compliance Requirements:</div>
                    <ul class="text-xs text-gray-400 space-y-1 pl-4">
                        ${reg.compliance_requirements.map(req => `<li>• ${req}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="text-xs text-gray-500 space-y-1">
                ${reg.penalties ? `<div>⚠️ Penalties: ${reg.penalties}</div>` : ''}
                ${reg.affected_processes ? `<div>🎯 Affects: ${reg.affected_processes}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function renderApplications(content) {
    const applications = content.applications || [];
    return applications.map(app => `
        <div class="bg-catalyst-dark/50 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500 transition-all">
            <div class="flex items-start justify-between mb-3">
                <div>
                    <div class="font-bold text-purple-400 text-lg">${app.name}</div>
                    <div class="text-xs text-gray-500">${app.category || 'Application'}</div>
                </div>
                <span class="text-xs px-2 py-1 rounded ${
                    app.criticality === 'Mission Critical' ? 'bg-red-900/30 text-red-400' :
                    app.criticality === 'Business Critical' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-blue-900/30 text-blue-400'
                }">
                    ${app.criticality || 'Standard'}
                </span>
            </div>

            ${app.description ? `<div class="text-sm text-gray-300 mb-3">${app.description}</div>` : ''}

            ${app.data_handled ? `
                <div class="mb-3">
                    <div class="text-xs font-semibold text-gray-400 mb-2">📊 Data Handled:</div>
                    <div class="text-xs text-gray-400">${app.data_handled}</div>
                </div>
            ` : ''}

            <div class="text-xs text-gray-500 space-y-1">
                ${app.vendor ? `<div>🏢 Vendor: ${app.vendor}</div>` : ''}
                ${app.hosting ? `<div>☁️ Hosting: ${app.hosting}</div>` : ''}
                ${app.integration_points ? `<div>🔗 Integrations: ${app.integration_points}</div>` : ''}
                ${app.compliance_notes ? `<div>⚖️ Compliance: ${app.compliance_notes}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function renderBusinessTerms(content) {
    const terms = content.terms || [];
    return terms.map(term => `
        <div class="bg-catalyst-dark/50 border border-yellow-500/30 rounded-lg p-4 hover:border-yellow-500 transition-all">
            <div class="flex items-start justify-between mb-2">
                <div class="font-bold text-yellow-400 text-lg">${term.term}</div>
                <span class="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">${term.category || 'General'}</span>
            </div>

            ${term.definition ? `<div class="text-sm text-gray-300 mb-3">${term.definition}</div>` : ''}

            <div class="text-xs text-gray-500 space-y-1">
                ${term.source_regulation ? `<div>📋 Source: ${term.source_regulation}</div>` : ''}
                ${term.synonyms && term.synonyms.length > 0 ? `<div>🔀 Synonyms: ${term.synonyms.join(', ')}</div>` : ''}
                ${term.related_terms && term.related_terms.length > 0 ? `<div>🔗 Related: ${term.related_terms.join(', ')}</div>` : ''}
                ${term.data_steward ? `<div>👤 Steward: ${term.data_steward}</div>` : ''}
                ${term.usage_context ? `<div>💡 Context: ${term.usage_context}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function updateCreditsDisplay() {
    const creditsEl = document.getElementById('credits-remaining');
    if (creditsEl) {
        creditsEl.textContent = explorationCredits;
        if (explorationCredits <= 3) {
            creditsEl.classList.add('text-red-400', 'font-bold');
        }
    }
}

function showCreditsExhaustedModal() {
    const modal = document.getElementById('credits-exhausted-modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        // Fallback if modal doesn't exist
        if (confirm('You\'ve used all 10 free explorations! Would you like to talk to a CDO expert to unlock unlimited exploration?')) {
            window.location.href = 'mailto:sales@kaimak.ai?subject=Request Unlimited Semantic Exploration&body=I\'ve explored the semantic layer and want to unlock unlimited access.';
        }
    }
}

function displayExpandedContent(sectionType, content, expansionType) {
    if (sectionType === 'policy') {
        displayExpandedPolicies(content, expansionType);
    } else if (sectionType === 'glossary') {
        displayExpandedGlossary(content, expansionType);
    } else if (sectionType === 'lineage') {
        displayExpandedLineage(content, expansionType);
    }
}

function displayExpandedPolicies(content, expansionType) {
    const container = document.getElementById('policies-expanded-list');
    if (!container) return;

    const policies = content.policies || [];

    container.innerHTML = policies.map(policy => `
        <div class="bg-catalyst-dark/50 border border-green-500/30 rounded-lg p-5 hover:border-green-500 transition-all">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <div class="font-bold text-lg text-green-400 mb-1">${policy.policy_name}</div>
                    <div class="text-xs text-gray-500">${policy.category} • Owner: ${policy.owner}</div>
                </div>
                <div class="flex gap-2">
                    <span class="text-xs px-2 py-1 rounded ${policy.complexity === 'High' ? 'bg-red-900/30 text-red-400' : policy.complexity === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-green-900/30 text-green-400'}">
                        ${policy.complexity} Complexity
                    </span>
                    <span class="text-xs px-2 py-1 rounded ${policy.business_impact === 'High' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}">
                        ${policy.business_impact} Impact
                    </span>
                </div>
            </div>

            <div class="text-sm text-gray-300 mb-3">${policy.scope}</div>

            <div class="mb-3">
                <div class="text-xs font-semibold text-gray-400 mb-2">📋 Key Requirements:</div>
                <ul class="text-xs text-gray-400 space-y-1 pl-4">
                    ${policy.requirements.map(req => `<li>• ${req}</li>`).join('')}
                </ul>
            </div>

            <div class="text-xs text-gray-500">
                <span class="mr-3">🏛️ Regulatory Basis: ${policy.regulatory_basis}</span>
            </div>
        </div>
    `).join('');

    // Show container and scroll to it
    container.classList.remove('hidden');
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayExpandedGlossary(content, expansionType) {
    const container = document.getElementById('glossary-expanded-list');
    if (!container) return;

    const terms = content.terms || [];

    container.innerHTML = terms.map(term => `
        <div class="bg-catalyst-dark/50 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500 transition-all">
            <div class="flex items-start justify-between mb-2">
                <div class="font-semibold text-purple-400">${term.term}</div>
                <span class="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">${term.category}</span>
            </div>
            <div class="text-sm text-gray-300 mb-2">${term.definition}</div>
            <div class="text-xs text-gray-500 space-y-1">
                <div>📋 Source: ${term.source_regulation}</div>
                ${term.synonyms && term.synonyms.length > 0 ? `<div>🔀 Synonyms: ${term.synonyms.join(', ')}</div>` : ''}
                ${term.related_terms && term.related_terms.length > 0 ? `<div>🔗 Related: ${term.related_terms.join(', ')}</div>` : ''}
                ${term.data_steward ? `<div>👤 Steward: ${term.data_steward}</div>` : ''}
            </div>
        </div>
    `).join('');

    // Show container and scroll to it
    container.classList.remove('hidden');
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayExpandedLineage(content, expansionType) {
    const container = document.getElementById('lineage-expanded-list');
    if (!container) return;

    const lineages = content.lineages || [];

    container.innerHTML = lineages.map(lineage => `
        <div class="bg-catalyst-dark/50 border border-blue-500/30 rounded-lg p-4 hover:border-blue-500 transition-all">
            <div class="flex items-start justify-between mb-3">
                <div class="font-semibold text-blue-400">${lineage.data_element}</div>
                <span class="text-xs px-2 py-1 rounded ${lineage.sensitivity === 'Restricted' ? 'bg-red-900/30 text-red-400' : lineage.sensitivity === 'Confidential' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-green-900/30 text-green-400'}">
                    ${lineage.sensitivity}
                </span>
            </div>

            <div class="space-y-2 text-xs">
                <div class="flex items-center">
                    <span class="text-green-400 w-24">Source:</span>
                    <span class="text-gray-300">${lineage.source_system}</span>
                </div>
                <div class="flex items-center">
                    <span class="text-yellow-400 w-24">Transform:</span>
                    <span class="text-gray-300">${lineage.transformation}</span>
                </div>
                <div class="flex items-center">
                    <span class="text-purple-400 w-24">Target:</span>
                    <span class="text-gray-300">${lineage.target_system}</span>
                </div>
                <div class="flex items-center">
                    <span class="text-gray-400 w-24">Regulation:</span>
                    <span class="text-gray-300">${lineage.regulation_driver}</span>
                </div>
                <div class="flex items-center">
                    <span class="text-gray-400 w-24">Retention:</span>
                    <span class="text-gray-300">${lineage.retention_period}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Show container and scroll to it
    container.classList.remove('hidden');
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// Simple spinner - just the wheel
function showSpinner(message) {
    return `
        <div class="flex items-center justify-center py-12">
            <div class="relative w-16 h-16">
                <div class="absolute inset-0 border-4 border-purple-500 rounded-full animate-spin" style="border-top-color: transparent;"></div>
            </div>
        </div>
    `;
}

// Animate loading steps progressively
function animateLoadingSteps() {
    // Show loading steps one by one with delays
    const steps = [1, 2, 3, 4];
    steps.forEach((step, index) => {
        setTimeout(() => {
            const stepEl = document.getElementById(`loading-step-${step}`);
            if (stepEl) {
                stepEl.style.opacity = '1';
            }
        }, index * 800); // Stagger by 800ms
    });
}

// Mark loading step as complete
function completeLoadingStep(stepNum) {
    const stepEl = document.getElementById(`loading-step-${stepNum}`);
    if (stepEl) {
        // Change from ⏳ to ✅
        const currentText = stepEl.textContent;
        stepEl.textContent = currentText.replace('⏳', '✅');
        stepEl.classList.add('text-green-400');
    }
}

function displayHeaderInfo(headerData) {
    const headerContainer = document.getElementById('company-header');

    if (!headerContainer) return;

    // Always display header, even if not enriched (show placeholder)
    if (!headerData.enriched) {
        headerContainer.innerHTML = `
            <div class="text-center">
                <h3 class="text-xl font-bold text-purple-400">🏢 ${wizardData.companyName || 'Your Company'}</h3>
                <p class="text-sm text-gray-400 mt-2">${wizardData.hqLocation} • ${wizardData.industry}</p>
            </div>
        `;
        return;
    }

    // Build enriched header HTML
    let headerHtml = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <h3 class="text-2xl font-bold text-white mb-2">🏢 ${wizardData.companyName || 'Your Company'}</h3>
                <p class="text-sm text-gray-400 mb-2">${wizardData.hqLocation} • ${wizardData.industry}</p>
    `;

    // Add Lines of Business if available (from header data - generated during company intelligence phase)
    if (headerData && headerData.lines_of_business && headerData.lines_of_business.length > 0) {
        headerHtml += `
            <div class="mb-4">
                <span class="text-gray-400 text-xs">Lines of Business:</span>
                <div class="flex flex-wrap gap-2 mt-1">
                    ${headerData.lines_of_business.map(lob => `
                        <span class="text-xs px-2 py-1 rounded bg-purple-900/30 border border-purple-500/30 text-purple-300">${lob}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Add CEO info if available
    if (headerData.ceo_name) {
        headerHtml += `
            <div class="mb-2">
                <span class="text-gray-400 text-sm">${headerData.ceo_title || 'CEO'}:</span>
                <span class="font-semibold text-purple-300 ml-2">${headerData.ceo_name}</span>
            </div>
        `;
    }

    // Add board members if available (compact)
    if (headerData.board_members && headerData.board_members.length > 0) {
        headerHtml += `
            <div class="text-xs text-gray-400 mt-2">
                Leadership: ${headerData.board_members.slice(0, 3).join(' • ')}
            </div>
        `;
    }

    headerHtml += `</div>`;

    // Add latest news as a sidebar (if available)
    if (headerData.latest_news && headerData.latest_news.length > 0) {
        headerHtml += `
            <div class="ml-6 text-xs text-gray-400 max-w-xs">
                <div class="font-semibold text-purple-400 mb-1">Recent News:</div>
                ${headerData.latest_news.slice(0, 2).map(news =>
                    `<div>✨ ${news.title}</div>`
                ).join('')}
            </div>
        `;
    }

    headerHtml += `</div>`;

    headerContainer.innerHTML = headerHtml;
}

function displaySemanticResults(data) {
    showSection('results-section');

    // Store semantic data globally for exploration context
    semanticData = data;

    // ============================================================================
    // KNOWLEDGE GRAPH: Initialize Discovered Nodes
    // ============================================================================
    // Initialize company node with wizard data
    discoveredNodes.company.label = data.enriched_context.company_name;
    discoveredNodes.company.data.industry = data.enriched_context.industry;
    discoveredNodes.company.data.hq_location = data.enriched_context.hq_location;
    discoveredNodes.company.data.dg_platform = wizardData.dgPlatform;

    // Initialize lines of business (always include all from header)
    discoveredNodes.linesOfBusiness = (window.headerData?.lines_of_business || []).map((lob, idx) => ({
        id: `lob-${idx}`,
        label: lob,
        type: 'lob',
        parentId: 'company-root'
    }));

    // Initialize regulations from semantic layer (these are shown immediately in the UI)
    const regulatoryContext = data.semantic_layer?.regulatory_context || [];
    discoveredNodes.regulations = regulatoryContext.map((reg, idx) => ({
        id: reg.regulation_id || `reg-${idx}`,
        label: reg.name || 'Unknown Regulation',
        type: 'regulation',
        parentId: 'company-root',
        data: reg
    }));

    // Reset other discovered nodes (user hasn't explored yet)
    discoveredNodes.processes = [];
    discoveredNodes.terms = [];

    console.log('✅ Knowledge Graph initialized:', {
        company: discoveredNodes.company.label,
        linesOfBusiness: discoveredNodes.linesOfBusiness.length,
        regulations: discoveredNodes.regulations.length,
        processes: discoveredNodes.processes.length,
        terms: discoveredNodes.terms.length
    });

    // 1. Display sticky header with company intel
    if (window.headerData) {
        displayHeaderInfo(window.headerData);
    }

    // 2. Update headline
    document.getElementById('results-headline').textContent =
        `${data.enriched_context.company_name} • ${data.enriched_context.industry} • ${data.enriched_context.hq_location}`;

    // 3. Create LIGHT OVERVIEW (First View)
    displayLightOverview(data);

    // 4. Initialize credits display
    updateCreditsDisplay();

    // 5. Populate Regulations Grid (always visible, no LLM)
    populateRegulationsGrid(data.semantic_layer?.regulatory_context || []);

    // 6. Populate Lines of Business Grid (from header data - pre-generated during company intelligence phase)
    populateLoBGrid(window.headerData?.lines_of_business || []);

    // 7. Update company name in domain discovery header
    const companyNameEl = document.getElementById('company-name-discovery');
    if (companyNameEl) {
        companyNameEl.textContent = data.enriched_context.company_name;
    }
}

// Populate Regulations Grid with Checkboxes
function populateRegulationsGrid(regulations) {
    const grid = document.getElementById('regulations-grid');
    if (!grid) return;

    grid.innerHTML = regulations.map((reg, idx) => `
        <div class="bg-catalyst-dark/50 border border-green-500/30 rounded-lg p-3 hover:border-green-500 transition-all">
            <label class="flex items-start cursor-pointer">
                <input
                    type="checkbox"
                    class="regulation-checkbox mt-1 mr-3 w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500"
                    data-reg-id="${reg.id || `REG_${idx}`}"
                    data-reg-name="${reg.name}"
                    onchange="handleRegulationSelection(this)"
                >
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <span class="font-semibold text-green-400 text-sm">${reg.name}</span>
                        <span class="text-xs px-2 py-0.5 rounded bg-gray-800/90 text-gray-400">${reg.jurisdiction || 'EU'}</span>
                    </div>
                    <div class="text-xs text-gray-400">${reg.applicability || reg.description || 'Regulatory requirements identified'}</div>
                </div>
            </label>
        </div>
    `).join('');
}

// Populate Lines of Business Grid with Checkboxes
function populateLoBGrid(lobs) {
    const grid = document.getElementById('lob-grid');
    if (!grid || !lobs || lobs.length === 0) {
        if (grid) grid.innerHTML = '<div class="text-gray-500 text-sm col-span-full text-center py-4">No lines of business generated</div>';
        return;
    }

    grid.innerHTML = lobs.map((lob, idx) => `
        <div class="bg-catalyst-dark/50 border border-purple-500/30 rounded-lg p-3 hover:border-purple-500 transition-all">
            <label class="flex items-start cursor-pointer">
                <input
                    type="checkbox"
                    class="lob-checkbox mt-1 mr-3 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                    data-lob-id="LOB_${idx}"
                    data-lob-name="${lob}"
                    onchange="handleLoBSelection(this)"
                >
                <div class="flex-1">
                    <div class="font-semibold text-purple-400 text-sm">${lob}</div>
                    <div class="text-xs text-gray-400 mt-1">Click to explore related processes</div>
                </div>
            </label>
        </div>
    `).join('');
}

// Track selected items for multi-select prevention
let selectedRegulation = null;
let selectedLoB = null;
let selectedProcess = null;

// Handle Regulation Checkbox Selection (single-select with multi-select modal)
function handleRegulationSelection(checkbox) {
    const allCheckboxes = document.querySelectorAll('.regulation-checkbox');

    // Multi-select prevention: if user tries to check a second checkbox, show modal
    if (checkbox.checked && selectedRegulation && selectedRegulation !== checkbox) {
        checkbox.checked = false;
        showMultiSelectModal();
        return;
    }

    // Single selection logic
    if (checkbox.checked) {
        // Uncheck all others
        allCheckboxes.forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
        selectedRegulation = checkbox;

        // Show explore button
        document.getElementById('regulations-explore-btn-container').classList.remove('hidden');
    } else {
        selectedRegulation = null;
        document.getElementById('regulations-explore-btn-container').classList.add('hidden');
    }
}

// Handle LoB Checkbox Selection (single-select with multi-select modal)
function handleLoBSelection(checkbox) {
    const allCheckboxes = document.querySelectorAll('.lob-checkbox');

    // Multi-select prevention
    if (checkbox.checked && selectedLoB && selectedLoB !== checkbox) {
        checkbox.checked = false;
        showMultiSelectModal();
        return;
    }

    // Single selection logic
    if (checkbox.checked) {
        // Uncheck all others
        allCheckboxes.forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
        selectedLoB = checkbox;

        // Show explore button
        document.getElementById('lob-explore-btn-container').classList.remove('hidden');
    } else {
        selectedLoB = null;
        document.getElementById('lob-explore-btn-container').classList.add('hidden');
    }
}

// Show Multi-Select Prevention Modal
function showMultiSelectModal() {
    // Create modal dynamically if it doesn't exist
    let modal = document.getElementById('multi-select-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'multi-select-modal';
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-catalyst-gray rounded-2xl p-8 max-w-md border-2 border-purple-500/50">
                <div class="text-center mb-6">
                    <div class="text-5xl mb-3">🔒</div>
                    <h3 class="text-2xl font-bold mb-2">Multi-Selection is a Premium Feature</h3>
                    <p class="text-gray-300">
                        The free preview allows exploring <strong>one context at a time</strong>.
                    </p>
                </div>

                <div class="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4 mb-6">
                    <div class="text-sm text-gray-400 mb-3">Premium Semantic Catalyst includes:</div>
                    <ul class="text-sm text-gray-300 space-y-2">
                        <li>✅ Multi-selection across regulations, LoB, processes</li>
                        <li>✅ Cross-impact analysis (e.g., GDPR + IFRS 17)</li>
                        <li>✅ Unlimited explorations</li>
                        <li>✅ Full export to Collibra/Alation/Informatica</li>
                    </ul>
                </div>

                <div class="space-y-3">
                    <a href="mailto:sales@kaimak.ai?subject=Request Premium Semantic Catalyst&body=I want to unlock multi-selection and unlimited exploration for my organization."
                       class="block w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-4 rounded-lg font-bold text-center hover:scale-105 transition-transform">
                        📞 Contact Kaimak Sales
                    </a>

                    <button
                        onclick="document.getElementById('multi-select-modal').remove()"
                        class="w-full border border-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-catalyst-dark/50 transition-all">
                        Got It
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
}

// Explore selected regulation details (1 credit)
async function exploreRegulations() {
    if (!selectedRegulation) {
        alert('Please select a regulation first');
        return;
    }

    const regName = selectedRegulation.dataset.regName;
    const regId = selectedRegulation.dataset.regId;

    // Update exploration context
    explorationContext.type = 'regulation';
    explorationContext.source = regName;
    explorationContext.depth = 1;
    explorationContext.breadcrumbs = [wizardData.companyName, regName];

    // Update section visibility (hide LoB and processes, show regulations and terms)
    updateSectionVisibility('regulation');

    const context = {
        company_name: wizardData.companyName,
        industry: wizardData.industry,
        hq_location: wizardData.hqLocation,
        regulations: [regName],
        depth: 1
    };

    // Always generate fresh insights for each regulation
    const contentContainer = document.getElementById('regulations-content');
    contentContainer.classList.remove('hidden');

    if (explorationCredits <= 0) {
        showCreditsExhaustedModal();
        return;
    }

    // Analyzing...
    contentContainer.innerHTML = showSpinner(`Analyzing ${regName}...`);

    try {
        const response = await fetch(`${API_BASE}/api/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section_type: 'regulations',
                context: context,
                expansion_type: 'full_list',
                session_id: sessionId
            })
        });

        if (response.status === 402) {
            showCreditsExhaustedModal();
            return;
        }

        const result = await response.json();

        // Update exploration budget
        explorationCredits = result.credits_remaining;
        updateCreditsDisplay();

        // Display minimal regulation summary (not detailed requirements - focus is on business terms!)
        contentContainer.innerHTML = renderRegulationSummary(result.content, regName);

        // Auto-save regulation data to KG
        await enrichKGWithExploration('regulations', result.content);

        // ============================================================================
        // KNOWLEDGE GRAPH: Track Discovered Regulation
        // ============================================================================
        if (!discoveredNodes.regulations.find(r => r.label === regName)) {
            discoveredNodes.regulations.push({
                id: regId,
                label: regName,
                type: 'regulation',
                parentId: 'company-root',
                data: result.content.regulations?.[0] || {}
            });
            console.log(`🕸️ KG: Added regulation "${regName}" to discovered nodes`);
        }

        // Auto-update KG if modal is open
        const kgModal = document.getElementById('kg-modal');
        if (kgModal && !kgModal.classList.contains('hidden')) {
            console.log('🔄 KG modal is open - refreshing with new regulation discovery');
            renderKnowledgeGraph();
        }

        console.log(`📋 ${regName} analysis complete, ${explorationCredits} explorations remaining`);

        // CRITICAL: Immediately generate business terms for this regulation (the real value!)
        // This is THE KEY FEATURE: regulation → business terms inference
        // IFRS 17 → CSM, Loss Component, Risk Adjustment, BEL, RA, etc.
        // GDPR → Data Subject, Controller, Processor, Lawful Basis, etc.
        await generateRegulationBusinessTerms(regName, context);

    } catch (error) {
        console.error('Analysis error:', error);
        contentContainer.innerHTML = '<div class="text-red-400 text-sm">Unable to analyze this regulation right now. Please try again.</div>';
    }
}

// Automatically generate business terms specific to a regulation (THE KEY FEATURE!)
async function generateRegulationBusinessTerms(regName, regulationContext) {
    if (explorationCredits <= 0) {
        return; // Silently skip if no credits
    }

    // Append to the regulations-content container (where regulation summary was displayed)
    const termsContainer = document.getElementById('regulations-content');
    if (!termsContainer) return;

    // Add spinner for business terms extraction
    const spinnerDiv = document.createElement('div');
    spinnerDiv.id = 'regulation-terms-spinner';
    spinnerDiv.innerHTML = showSpinner(`Analyzing ${regName}...`);
    termsContainer.appendChild(spinnerDiv);

    try {
        const response = await fetch(`${API_BASE}/api/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section_type: 'business_terms',
                context: {
                    ...regulationContext,
                    source_regulation: regName // Mark that we want terms specific to this regulation
                },
                expansion_type: 'full_list',
                session_id: sessionId
            })
        });

        // Remove spinner
        spinnerDiv.remove();

        if (response.status === 402) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-gray-400 text-sm mt-3';
            errorDiv.textContent = 'No more exploration credits available. Contact sales to unlock more.';
            termsContainer.appendChild(errorDiv);
            return;
        }

        const result = await response.json();

        // Update exploration budget
        explorationCredits = result.credits_remaining;
        updateCreditsDisplay();

        // ============================================================================
        // KNOWLEDGE GRAPH: Track Discovered Regulation Terms
        // ============================================================================
        const terms = result.content.terms || result.content.business_terms || [];
        const parentRegId = discoveredNodes.regulations.find(r => r.label === regName)?.id || 'unknown';

        terms.forEach((term, idx) => {
            const termId = `term-${discoveredNodes.terms.length + idx}`;
            const termLabel = term.term || term.name;
            if (termLabel && !discoveredNodes.terms.find(t => t.label === termLabel)) {
                discoveredNodes.terms.push({
                    id: termId,
                    label: termLabel,
                    type: 'term',
                    parentId: parentRegId,
                    parentRegulationName: regName,
                    data: term
                });
                console.log(`🕸️ KG: Added term "${termLabel}" to discovered nodes (parent: ${regName})`);
            }
        });

        // Auto-update KG if modal is open
        const kgModal = document.getElementById('kg-modal');
        if (kgModal && !kgModal.classList.contains('hidden')) {
            console.log('🔄 KG modal is open - refreshing with new regulation terms');
            renderKnowledgeGraph();
        }

        // Display regulation-specific business terms (THE MONEY SHOT!)
        const termsHtml = renderRegulationBusinessTerms(result.content, regName);
        const termsDiv = document.createElement('div');
        termsDiv.innerHTML = termsHtml;
        termsContainer.appendChild(termsDiv);

        // Hide the "Extracting..." message now that terms are loaded
        const extractingMsg = contentContainer.querySelector('.animate-pulse');
        if (extractingMsg && extractingMsg.textContent.includes('Extracting')) {
            extractingMsg.style.display = 'none';
        }

        // Auto-save business terms to KG
        await enrichKGWithExploration('business_terms', result.content);

        console.log(`📖 ${regName} terminology extracted (${result.content.terms?.length || 0} terms), ${explorationCredits} explorations remaining`);

    } catch (error) {
        console.error('Business terms extraction error:', error);
        spinnerDiv.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-400 text-sm mt-3';
        errorDiv.textContent = 'Unable to extract business terms at this time.';
        termsContainer.appendChild(errorDiv);
    }
}

// Render business terms specific to a regulation
function renderRegulationBusinessTerms(content, regName) {
    const terms = content.terms || [];
    if (terms.length === 0) {
        return `<div class="text-gray-400 text-sm">No business terms extracted for ${regName}</div>`;
    }

    return `
        <div class="mb-4 mt-6 border-t border-green-500/30 pt-4">
            <h5 class="text-lg font-bold text-yellow-400 mb-3">📖 ${regName} Business Terms</h5>
            <div class="text-xs text-gray-500 mb-3">Industry-specific terminology extracted from ${regName} requirements</div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                ${terms.map(term => `
                    <div class="bg-catalyst-dark/50 border border-yellow-500/30 rounded-lg p-3 hover:border-yellow-500 transition-all">
                        <div class="flex items-start justify-between mb-2">
                            <div class="font-semibold text-yellow-400 text-sm">${term.term}</div>
                            <span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">${term.category || 'Regulatory'}</span>
                        </div>
                        <div class="text-xs text-gray-300 mb-2">${term.definition || ''}</div>
                        ${term.usage_context ? `
                            <div class="text-xs text-gray-500 mt-2">💡 ${term.usage_context}</div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Explore selected Line of Business processes (1 credit)
async function exploreLineOfBusiness() {
    if (!selectedLoB) {
        alert('Please select a Line of Business first');
        return;
    }

    const lobName = selectedLoB.dataset.lobName;

    // Update exploration context
    explorationContext.type = 'lob';
    explorationContext.source = lobName;
    explorationContext.depth = 1;
    explorationContext.breadcrumbs = [wizardData.companyName, lobName];

    // Update section visibility (hide regulations and terms, show LoB and processes)
    updateSectionVisibility('lob');

    const context = {
        company_name: wizardData.companyName,
        industry: wizardData.industry,
        hq_location: wizardData.hqLocation,
        regulations: semanticData?.semantic_layer?.regulatory_context?.map(r => r.name) || [],
        line_of_business: lobName,
        depth: 1
    };

    // Smart retrieval
    const cached = getCachedExploration('business_processes', context);
    const contentContainer = document.getElementById('lob-content');
    contentContainer.classList.remove('hidden');

    document.getElementById('processes-placeholder').classList.add('hidden');
    document.getElementById('processes-grid').classList.remove('hidden');

    if (cached) {
        // Instant display
        console.log(`⚡ Instant: ${lobName} processes`);

        populateProcessesGrid(cached.result.content.processes || []);
        contentContainer.innerHTML = renderProcessesSummary(cached.result.content, lobName);

        // Auto-save cached business processes to KG (important!)
        await enrichKGWithExploration('business_processes', cached.result.content);

        // Subtle indicator
        const indicator = document.createElement('div');
        indicator.className = 'text-xs text-purple-400 mt-2 text-center animate-pulse';
        indicator.innerHTML = '✨ Instantly retrieved';
        contentContainer.appendChild(indicator);
        setTimeout(() => indicator.remove(), 2000);
        return;
    }

    if (explorationCredits <= 0) {
        showCreditsExhaustedModal();
        return;
    }

    // Analyzing...
    contentContainer.innerHTML = showSpinner(`Analyzing ${lobName} processes...`);

    try {
        const response = await fetch(`${API_BASE}/api/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section_type: 'business_processes',
                context: context,
                expansion_type: 'full_list',
                session_id: sessionId
            })
        });

        if (response.status === 402) {
            showCreditsExhaustedModal();
            return;
        }

        const result = await response.json();

        // Remember for instant retrieval
        cacheExploration('business_processes', context, result);

        explorationCredits = result.credits_remaining;
        updateCreditsDisplay();

        // ============================================================================
        // KNOWLEDGE GRAPH: Track Discovered Processes
        // ============================================================================
        const processes = result.content.processes || [];
        const parentLobId = `lob-${discoveredNodes.linesOfBusiness.findIndex(lob => lob.label === lobName)}`;

        processes.forEach((process, idx) => {
            const processId = `proc-${discoveredNodes.processes.length + idx}`;
            if (!discoveredNodes.processes.find(p => p.label === process.name)) {
                discoveredNodes.processes.push({
                    id: processId,
                    label: process.name,
                    type: 'process',
                    parentId: parentLobId,
                    parentLobName: lobName,
                    data: process
                });
                console.log(`🕸️ KG: Added process "${process.name}" to discovered nodes (parent: ${lobName})`);
            }
        });

        // Auto-update KG if modal is open
        const kgModal = document.getElementById('kg-modal');
        if (kgModal && !kgModal.classList.contains('hidden')) {
            console.log('🔄 KG modal is open - refreshing with new discoveries');
            renderKnowledgeGraph();
        }

        populateProcessesGrid(result.content.processes || []);
        contentContainer.innerHTML = renderProcessesSummary(result.content, lobName);

        // Auto-save business processes to KG
        await enrichKGWithExploration('business_processes', result.content);

        console.log(`💼 ${lobName} analyzed, ${explorationCredits} explorations remaining`);

    } catch (error) {
        console.error('Analysis error:', error);
        contentContainer.innerHTML = '<div class="text-red-400 text-sm">Unable to analyze this line of business right now. Please try again.</div>';
    }
}

// Populate processes grid with checkboxes
function populateProcessesGrid(processes) {
    const grid = document.getElementById('processes-grid');
    if (!grid) return;

    grid.innerHTML = processes.slice(0, 10).map((proc, idx) => `
        <div class="bg-catalyst-dark/50 border border-blue-500/30 rounded-lg p-3 hover:border-blue-500 transition-all">
            <label class="flex items-start cursor-pointer">
                <input
                    type="checkbox"
                    class="process-checkbox mt-1 mr-3 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    data-process-id="PROC_${idx}"
                    data-process-name="${proc.name}"
                    onchange="handleProcessSelection(this)"
                >
                <div class="flex-1">
                    <div class="font-semibold text-blue-400 text-sm mb-1">${proc.name}</div>
                    <div class="text-xs text-gray-400">${proc.description || 'Click to explore business terms'}</div>
                </div>
            </label>
        </div>
    `).join('');
}

// Handle Process Checkbox Selection
function handleProcessSelection(checkbox) {
    const allCheckboxes = document.querySelectorAll('.process-checkbox');

    // Multi-select prevention
    if (checkbox.checked && selectedProcess && selectedProcess !== checkbox) {
        checkbox.checked = false;
        showMultiSelectModal();
        return;
    }

    // Single selection logic
    if (checkbox.checked) {
        // Uncheck all others
        allCheckboxes.forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
        selectedProcess = checkbox;

        // Show explore button
        document.getElementById('processes-explore-btn-container').classList.remove('hidden');
    } else {
        selectedProcess = null;
        document.getElementById('processes-explore-btn-container').classList.add('hidden');
    }
}

// Explore Business Terms for selected process (1 credit)
async function exploreBusinessTerms() {
    if (!selectedProcess) {
        alert('Please select a business process first');
        return;
    }

    const processName = selectedProcess.dataset.processName;

    // Update exploration context
    explorationContext.type = 'process';
    explorationContext.source = processName;
    explorationContext.depth = 2;
    explorationContext.breadcrumbs = [wizardData.companyName, explorationContext.breadcrumbs[1] || 'Business Processes', processName];

    // Update section visibility (hide regulations and LoB, show processes and terms)
    updateSectionVisibility('process');

    const context = {
        company_name: wizardData.companyName,
        industry: wizardData.industry,
        hq_location: wizardData.hqLocation,
        regulations: semanticData?.semantic_layer?.regulatory_context?.map(r => r.name) || [],
        business_process: processName,
        depth: 1
    };

    // Smart retrieval
    const cached = getCachedExploration('business_terms', context);
    const contentContainer = document.getElementById('terms-content');
    contentContainer.classList.remove('hidden');

    document.getElementById('terms-placeholder').classList.add('hidden');

    if (cached) {
        // Instant display
        console.log(`⚡ Instant: ${processName} terms`);

        contentContainer.innerHTML = renderBusinessTermsContent(cached.result.content, processName);

        // Auto-save cached business terms to KG (important!)
        await enrichKGWithExploration('business_terms', cached.result.content);

        // Subtle indicator
        const indicator = document.createElement('div');
        indicator.className = 'text-xs text-purple-400 mt-2 text-center animate-pulse';
        indicator.innerHTML = '✨ Instantly retrieved';
        contentContainer.appendChild(indicator);
        setTimeout(() => indicator.remove(), 2000);
        return;
    }

    if (explorationCredits <= 0) {
        showCreditsExhaustedModal();
        return;
    }

    // Analyzing...
    contentContainer.innerHTML = showSpinner(`Analyzing ${processName} terminology...`);

    try {
        const response = await fetch(`${API_BASE}/api/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section_type: 'business_terms',
                context: context,
                expansion_type: 'full_list',
                session_id: sessionId
            })
        });

        if (response.status === 402) {
            showCreditsExhaustedModal();
            return;
        }

        const result = await response.json();

        // Remember for instant retrieval
        cacheExploration('business_terms', context, result);

        explorationCredits = result.credits_remaining;
        updateCreditsDisplay();

        // ============================================================================
        // KNOWLEDGE GRAPH: Track Discovered Business Terms
        // ============================================================================
        const terms = result.content.business_terms || [];
        const parentProcessId = discoveredNodes.processes.find(p => p.label === processName)?.id || 'unknown';

        terms.forEach((term, idx) => {
            const termId = `term-${discoveredNodes.terms.length + idx}`;
            if (!discoveredNodes.terms.find(t => t.label === term.term)) {
                discoveredNodes.terms.push({
                    id: termId,
                    label: term.term,
                    type: 'term',
                    parentId: parentProcessId,
                    parentProcessName: processName,
                    data: term
                });
                console.log(`🕸️ KG: Added term "${term.term}" to discovered nodes (parent: ${processName})`);
            }
        });

        // Auto-update KG if modal is open
        const kgModal = document.getElementById('kg-modal');
        if (kgModal && !kgModal.classList.contains('hidden')) {
            console.log('🔄 KG modal is open - refreshing with new business terms');
            renderKnowledgeGraph();
        }

        contentContainer.innerHTML = renderBusinessTermsContent(result.content, processName);

        // Auto-save business terms to KG
        await enrichKGWithExploration('business_terms', result.content);

        console.log(`📖 ${processName} terminology mapped, ${explorationCredits} explorations remaining`);

    } catch (error) {
        console.error('Analysis error:', error);
        contentContainer.innerHTML = '<div class="text-red-400 text-sm">Unable to analyze terminology right now. Please try again.</div>';
    }
}

// Render minimal regulation summary (FOCUS: business terms generation, not requirements)
function renderRegulationSummary(content, regName) {
    const regulations = content.regulations || [];
    if (regulations.length === 0) {
        return `<div class="text-gray-400 text-sm">No information available for ${regName}</div>`;
    }

    const reg = regulations[0];
    return `
        <div class="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between mb-2">
                <div class="font-semibold text-green-400">${reg.name}</div>
                <span class="text-xs px-2 py-1 rounded bg-gray-800/90 text-gray-400">${reg.jurisdiction || 'EU'}</span>
            </div>
            <div class="text-sm text-gray-300 mb-3">${reg.description || ''}</div>
            <div class="text-xs text-purple-400 font-semibold animate-pulse">
                ⬇️ Extracting ${regName} business terms below...
            </div>
        </div>
    `;
}

// Render processes summary
function renderProcessesSummary(content, lobName) {
    const processCount = content.processes?.length || 0;
    return `
        <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div class="text-sm text-blue-300">
                ✅ Found <strong>${processCount} business processes</strong> for ${lobName}
            </div>
            <div class="text-xs text-gray-400 mt-2">
                Select a process above to explore related business terms (1 credit)
            </div>
        </div>
    `;
}

// Render business terms content
function renderBusinessTermsContent(content, processName) {
    const terms = content.terms || [];
    if (terms.length === 0) {
        return `<div class="text-gray-400 text-sm">No business terms found for ${processName}</div>`;
    }

    return `
        <div class="mb-4">
            <h5 class="text-lg font-bold text-yellow-400 mb-3">📖 Business Terms for ${processName}</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${terms.map(term => `
                    <div class="bg-catalyst-dark/50 border border-yellow-500/30 rounded-lg p-3 hover:border-yellow-500 transition-all">
                        <div class="font-semibold text-yellow-400 text-sm mb-1">${term.term}</div>
                        <div class="text-xs text-gray-300 mb-2">${term.definition || ''}</div>
                        ${term.source_regulation ? `
                            <div class="text-xs text-gray-500">📋 Source: ${term.source_regulation}</div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function displayLightOverview(data) {
    const overviewCards = document.getElementById('overview-cards');
    if (!overviewCards) return;

    const regulations = data.semantic_layer?.regulatory_context || [];
    const stats = data.stats || {};
    const industry = data.enriched_context?.industry || 'general';

    // STRATEGY: Show domain expertise IMMEDIATELY to create curiosity and trust
    // For insurance: show IFRS 17, Solvency II with technical depth
    // For banking: show Basel III, MiFID II with technical depth

    // Pick top 3 most impressive regulations to showcase
    const showcaseRegs = regulations.slice(0, 3);

    overviewCards.innerHTML = `
        <!-- HERO: Domain Intelligence Showcase (col-span-full) -->
        <div class="col-span-full bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500/50 rounded-xl p-6 shadow-2xl">
            <div class="text-center mb-6">
                <div class="inline-block bg-green-500/20 border border-green-500/50 rounded-full px-4 py-1 text-xs font-semibold text-green-400 mb-3">
                    ✓ ${regulations.length} Regulations Identified
                </div>
                <h3 class="text-3xl font-bold gradient-text mb-2">
                    We Understand Your ${industry.charAt(0).toUpperCase() + industry.slice(1)} Business
                </h3>
                <p class="text-gray-300 text-sm max-w-2xl mx-auto">
                    Kaimak reverse-engineered ${stats.business_terms || 0}+ domain-specific terms, ${stats.data_lineage || 0}+ data flows,
                    and ${stats.policy_templates || 0}+ compliance policies from your regulatory landscape.
                </p>
            </div>

            <!-- Sample Regulations (3 cards showing DEPTH) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                ${showcaseRegs.map(reg => `
                    <div class="bg-catalyst-dark/70 border border-green-500/30 rounded-lg p-4 hover:border-green-500 transition-all">
                        <div class="flex items-center justify-between mb-2">
                            <div class="font-bold text-green-400 text-sm">${reg.name}</div>
                            <span class="text-xs px-2 py-0.5 rounded bg-gray-800/90 text-gray-400">${reg.jurisdiction || 'EU'}</span>
                        </div>
                        <div class="text-xs text-gray-400 leading-relaxed">${reg.applicability || reg.description || 'Regulatory requirements identified'}</div>
                    </div>
                `).join('')}
            </div>

            ${regulations.length > 3 ? `
                <div class="text-center text-xs text-purple-300 pt-3 border-t border-purple-500/20">
                    + ${regulations.length - 3} more regulations analyzed
                    <span class="text-gray-500 block mt-1">↓ Explore domains below to see technical depth (IFRS 17 CSM, Solvency II SCR, etc.)</span>
                </div>
            ` : ''}
        </div>

        <!-- ROI Teaser -->
        <div class="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/40 rounded-xl p-5">
            <div class="text-center">
                <div class="text-4xl mb-2">⏱️</div>
                <div class="text-2xl font-bold text-green-400 mb-1">15 months</div>
                <div class="text-xs text-gray-400">Business glossary work saved</div>
                <div class="text-xs text-green-300 mt-2 font-semibold">€1.16M labor cost avoided</div>
            </div>
        </div>

        <!-- Semantic Coverage -->
        <div class="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/40 rounded-xl p-5">
            <div class="text-center">
                <div class="text-4xl mb-2">📖</div>
                <div class="text-2xl font-bold text-purple-400 mb-1">${stats.business_terms || 0}+</div>
                <div class="text-xs text-gray-400">Domain-specific terms</div>
                <div class="text-xs text-purple-300 mt-2 font-semibold">Ready for Collibra/Alation</div>
            </div>
        </div>

        <!-- Exploration CTA -->
        <div class="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/40 rounded-xl p-5">
            <div class="text-center">
                <div class="text-4xl mb-2">🔍</div>
                <div class="text-2xl font-bold text-blue-400 mb-1">10 credits</div>
                <div class="text-xs text-gray-400">Free exploration remaining</div>
                <div class="text-xs text-blue-300 mt-2 font-semibold">Explore domains below ↓</div>
            </div>
        </div>
    `;
}

// Knowledge Graph Visualization
function showKnowledgeGraph() {
    const modal = document.getElementById('kg-modal');
    if (!modal) return;

    // Show modal
    modal.classList.remove('hidden');

    // Render knowledge graph
    renderKnowledgeGraph();
}

function closeKnowledgeGraph() {
    const modal = document.getElementById('kg-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function renderKnowledgeGraph() {
    const canvas = document.getElementById('kg-canvas');
    if (!canvas) return;

    // ============================================================================
    // COMPANY-CENTRIC KNOWLEDGE GRAPH
    // ============================================================================
    // Build graph from user's ACTUAL discoveries, not sample data!
    // Structure: Company (center) → Regulations/LoB → Processes → Terms

    const nodes = [];
    const links = [];

    // 1. Add COMPANY node (center, hub of the graph)
    if (discoveredNodes.company.label) {
        nodes.push({
            id: discoveredNodes.company.id,
            label: discoveredNodes.company.label,
            type: 'company',
            color: '#06b6d4', // cyan
            size: 'large'
        });
    }

    // 2. Add REGULATION nodes (only discovered regulations, not all from semantic layer)
    discoveredNodes.regulations.forEach(reg => {
        nodes.push({
            id: reg.id,
            label: reg.label,
            type: 'regulation',
            color: '#4ade80' // green
        });

        // Link to company
        links.push({
            source: discoveredNodes.company.id,
            target: reg.id
        });
    });

    // 3. Add LINE OF BUSINESS nodes (always shown, from header enrichment)
    discoveredNodes.linesOfBusiness.forEach(lob => {
        nodes.push({
            id: lob.id,
            label: lob.label,
            type: 'lob',
            color: '#a78bfa' // purple
        });

        // Link to company
        links.push({
            source: discoveredNodes.company.id,
            target: lob.id
        });
    });

    // 4. Add PROCESS nodes (only discovered processes, from user exploration)
    discoveredNodes.processes.forEach(proc => {
        nodes.push({
            id: proc.id,
            label: proc.label,
            type: 'process',
            color: '#60a5fa' // blue
        });

        // Link to parent LoB
        links.push({
            source: proc.parentId,
            target: proc.id
        });
    });

    // 5. Add TERM nodes (only discovered terms, from user exploration)
    discoveredNodes.terms.forEach(term => {
        nodes.push({
            id: term.id,
            label: term.label,
            type: 'term',
            color: '#fbbf24' // yellow
        });

        // Link to parent (regulation or process)
        links.push({
            source: term.parentId,
            target: term.id
        });
    });

    console.log(`🕸️ Rendering KG with ${nodes.length} nodes (${discoveredNodes.regulations.length} regs, ${discoveredNodes.processes.length} procs, ${discoveredNodes.terms.length} terms)`);

    // Render company-centric graph using SVG
    renderSVGGraph(canvas, nodes, links);
}

function renderSVGGraph(container, nodes, links) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    container.innerHTML = '';

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.width = '100%';
    svg.style.height = '100%';

    // Company-centric radial layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Position nodes in a circular layout by type
    const nodePositions = new Map();

    let companyNode = nodes.find(n => n.type === 'company');
    let regulationNodes = nodes.filter(n => n.type === 'regulation');
    let lobNodes = nodes.filter(n => n.type === 'lob');
    let processNodes = nodes.filter(n => n.type === 'process');
    let termNodes = nodes.filter(n => n.type === 'term');

    // Company node at CENTER (hub of the graph)
    if (companyNode) {
        nodePositions.set(companyNode.id, {
            x: centerX,
            y: centerY
        });
    }

    // Regulations in inner circle (Level 1)
    regulationNodes.forEach((node, idx) => {
        const angle = (idx / regulationNodes.length) * 2 * Math.PI;
        nodePositions.set(node.id, {
            x: centerX + radius * 0.5 * Math.cos(angle),
            y: centerY + radius * 0.5 * Math.sin(angle)
        });
    });

    // LoB in inner circle (Level 1, offset from regulations)
    lobNodes.forEach((node, idx) => {
        const angle = (idx / lobNodes.length) * 2 * Math.PI - Math.PI / (lobNodes.length + 1);
        nodePositions.set(node.id, {
            x: centerX + radius * 0.5 * Math.cos(angle),
            y: centerY + radius * 0.5 * Math.sin(angle)
        });
    });

    // Processes in mid circle (Level 2)
    processNodes.forEach((node, idx) => {
        const angle = (idx / processNodes.length) * 2 * Math.PI + Math.PI / 6;
        nodePositions.set(node.id, {
            x: centerX + radius * 0.9 * Math.cos(angle),
            y: centerY + radius * 0.9 * Math.sin(angle)
        });
    });

    // Terms in outer circle (Level 3)
    termNodes.forEach((node, idx) => {
        const angle = (idx / termNodes.length) * 2 * Math.PI - Math.PI / 6;
        nodePositions.set(node.id, {
            x: centerX + radius * 1.3 * Math.cos(angle),
            y: centerY + radius * 1.3 * Math.sin(angle)
        });
    });

    // Draw links first (so they appear behind nodes)
    links.forEach(link => {
        const sourcePos = nodePositions.get(link.source);
        const targetPos = nodePositions.get(link.target);

        if (sourcePos && targetPos) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', sourcePos.x);
            line.setAttribute('y1', sourcePos.y);
            line.setAttribute('x2', targetPos.x);
            line.setAttribute('y2', targetPos.y);
            line.setAttribute('stroke', '#475569');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-opacity', '0.3');
            svg.appendChild(line);
        }
    });

    // Draw nodes
    nodes.forEach(node => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        // Create node group
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'kg-node');
        g.style.cursor = 'pointer';

        // Node circle (company node is larger)
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const baseRadius = node.type === 'company' ? 18 : node.type === 'regulation' ? 10 : node.type === 'lob' ? 8 : 6;
        const hoverRadius = node.type === 'company' ? 22 : node.type === 'regulation' ? 12 : node.type === 'lob' ? 10 : 8;

        circle.setAttribute('cx', pos.x);
        circle.setAttribute('cy', pos.y);
        circle.setAttribute('r', baseRadius);
        circle.setAttribute('fill', node.color);
        circle.setAttribute('stroke', node.type === 'company' ? node.color : '#1e293b');
        circle.setAttribute('stroke-width', node.type === 'company' ? '3' : '2');
        circle.setAttribute('opacity', node.type === 'company' ? '0.9' : '1');

        // Hover effect
        circle.addEventListener('mouseenter', () => {
            circle.setAttribute('r', hoverRadius);
            circle.setAttribute('stroke', node.color);
            circle.setAttribute('stroke-width', '3');
        });
        circle.addEventListener('mouseleave', () => {
            circle.setAttribute('r', baseRadius);
            circle.setAttribute('stroke', node.type === 'company' ? node.color : '#1e293b');
            circle.setAttribute('stroke-width', node.type === 'company' ? '3' : '2');
        });

        g.appendChild(circle);

        // Node label (company label is larger and more prominent)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const labelOffset = node.type === 'company' ? -25 : -15;
        const fontSize = node.type === 'company' ? '14' : '10';
        const maxLength = node.type === 'company' ? 25 : 15;

        text.setAttribute('x', pos.x);
        text.setAttribute('y', pos.y + labelOffset);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', node.type === 'company' ? node.color : '#9ca3af');
        text.setAttribute('font-size', fontSize);
        text.setAttribute('font-weight', 'bold');
        text.textContent = node.label.length > maxLength ? node.label.substring(0, maxLength - 3) + '...' : node.label;
        g.appendChild(text);

        svg.appendChild(g);
    });

    container.appendChild(svg);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Render wizard immediately since there's no landing page
    renderStep();

    // Country dropdown - show/hide custom input for "Other" option
    document.addEventListener('change', (e) => {
        if (e.target.id === 'hq-select') {
            const customInput = document.getElementById('hq-custom-input');
            if (e.target.value === 'other') {
                customInput.classList.remove('hidden');
                customInput.focus();
            } else {
                customInput.classList.add('hidden');
                customInput.value = ''; // Clear custom input when switching back
            }
        }
    });

    // Request demo button
    document.getElementById('request-full-btn')?.addEventListener('click', () => {
        document.getElementById('request-modal').classList.remove('hidden');
    });

    // Talk to expert button
    document.getElementById('talk-to-expert-btn')?.addEventListener('click', () => {
        window.location.href = 'mailto:sales@kaimak.ai?subject=Request CDO Expert Consultation&body=Hi, I just generated my semantic layer preview and would like to speak with an expert about accelerating our Data Governance deployment.';
    });

    // Cancel request
    document.getElementById('cancel-request-btn')?.addEventListener('click', () => {
        document.getElementById('request-modal').classList.add('hidden');
    });

    // Submit demo request
    document.getElementById('request-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const requestData = {
            version: 'semantic-catalyst',
            email: document.getElementById('request-email').value,
            company_name: document.getElementById('request-company').value,
            dg_platform: document.getElementById('request-platform').value,
            challenge: document.getElementById('request-challenge').value,
            industry: wizardData.industry,
            hq_location: wizardData.hqLocation,
            status: 'demo_requested'
        };

        try {
            const response = await fetch(`${API_BASE}/api/request-demo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                alert('✅ Demo request submitted! We\'ll reach out within 24 hours to schedule your personalized demo.');
                document.getElementById('request-modal').classList.add('hidden');
            } else {
                alert('Something went wrong. Please try again or email us at sales@kaimak.ai');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Something went wrong. Please email us at sales@kaimak.ai');
        }
    });
});
