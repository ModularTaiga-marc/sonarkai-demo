/**
 * SonarKai Demo - Mockup Data Loader
 *
 * This file provides client-side mockup data for the demo version of SonarKai.
 * No backend API required - all data is loaded from JSON files.
 *
 * MIT License - https://github.com/ModularTaiga-marc/sonarkai-demo
 */

const MOCKUP_MODE = true;

// Mockup data cache (loaded from JSON files)
let mockupDataCache = {
    companies: [],
    regulations: {},
    businessLines: {},
    processes: []
};

/**
 * Load mockup data from JSON files
 */
async function loadMockupData() {
    try {
        const [companies, regulations, businessLines, processes] = await Promise.all([
            fetch('./mockup-data/companies.json').then(r => r.json()),
            fetch('./mockup-data/regulations.json').then(r => r.json()),
            fetch('./mockup-data/business-lines.json').then(r => r.json()),
            fetch('./mockup-data/processes.json').then(r => r.json())
        ]);

        mockupDataCache = {
            companies,
            regulations,
            businessLines,
            processes
        };

        console.log('🎭 MOCKUP MODE: Data loaded successfully', mockupDataCache);
        return true;
    } catch (error) {
        console.error('❌ Error loading mockup data:', error);
        return false;
    }
}

/**
 * Simulate network delay for realistic demo experience
 */
function simulateDelay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock API call interceptor
 * Intercepts API calls and returns mockup data
 */
async function mockApiCall(endpoint, params = {}) {
    console.log('🎭 MOCKUP MODE: Intercepting API call:', endpoint, params);

    // Simulate network delay
    await simulateDelay(300 + Math.random() * 400);

    // Company root endpoint
    if (endpoint.includes('/api/node/company-root')) {
        const companyQuery = (params.company || '').toLowerCase();

        // Find matching company or use first one
        const mockCompany = mockupDataCache.companies.find(c =>
            c.name.toLowerCase().includes(companyQuery)
        ) || mockupDataCache.companies[0];

        if (!mockCompany) {
            throw new Error('No companies available in mockup data');
        }

        return {
            success: true,
            node: {
                node_id: "company-root",
                node_type: "party",
                label: mockCompany.name,
                metadata: {
                    party_name: mockCompany.name,
                    party_type: mockCompany.party_type,
                    party_role: mockCompany.party_role,
                    industry_sector: mockCompany.industry,
                    hq_location: mockCompany.hq_location,
                    description: mockCompany.description
                }
            }
        };
    }

    // Company exploration endpoint (regulations + business lines)
    if (endpoint.includes('/api/node/company-root/explore')) {
        const industry = (params.industry || 'insurance').toLowerCase();

        const regulations = mockupDataCache.regulations[industry] || [];
        const businessLines = mockupDataCache.businessLines[industry] || [];

        // Convert to node format
        const regulationNodes = regulations.map((reg, idx) => ({
            node_id: reg.regulation_id,
            node_type: "regulation",
            label: reg.regulation_name,
            metadata: {
                regulation_name: reg.regulation_name,
                jurisdiction: reg.jurisdiction,
                description: reg.description,
                applicability: reg.applicability
            }
        }));

        const lobNodes = businessLines.map((lob, idx) => ({
            node_id: lob.lob_id,
            node_type: "line_of_business",
            label: lob.lob_name,
            metadata: {
                lob_name: lob.lob_name,
                description: lob.description,
                processes: lob.processes
            }
        }));

        return {
            success: true,
            nodes: [...regulationNodes, ...lobNodes],
            message: `Found ${regulationNodes.length} regulations and ${lobNodes.length} business lines`
        };
    }

    // Business line exploration endpoint (processes)
    if (endpoint.includes('/explore') && params.node_type === 'line_of_business') {
        const lobId = params.node_id;
        const industry = (params.industry || 'insurance').toLowerCase();

        // Find the LOB
        const lobs = mockupDataCache.businessLines[industry] || [];
        const lob = lobs.find(l => l.lob_id === lobId);

        if (!lob || !lob.processes) {
            return { success: true, nodes: [] };
        }

        // Get processes for this LOB
        const processNodes = lob.processes.map(processId => {
            const process = mockupDataCache.processes.find(p => p.process_id === processId);
            if (!process) return null;

            return {
                node_id: process.process_id,
                node_type: "process",
                label: process.process_name,
                metadata: {
                    process_name: process.process_name,
                    description: process.description,
                    key_activities: process.key_activities || []
                }
            };
        }).filter(Boolean);

        return {
            success: true,
            nodes: processNodes
        };
    }

    // Process enrichment endpoint
    if (endpoint.includes('/api/process/enrich')) {
        const processName = params.process_name || params.name;

        // Find process in mockup data
        const process = mockupDataCache.processes.find(p =>
            p.process_name.toLowerCase().includes(processName.toLowerCase())
        );

        if (!process) {
            return {
                success: true,
                enrichment: {
                    process_name: processName,
                    description: `${processName} process for business operations`,
                    key_activities: ["Planning", "Execution", "Monitoring", "Reporting"]
                }
            };
        }

        return {
            success: true,
            enrichment: {
                process_name: process.process_name,
                description: process.description,
                key_activities: process.key_activities || []
            }
        };
    }

    // Default fallback
    console.warn('🎭 MOCKUP MODE: Unhandled endpoint:', endpoint);
    return {
        success: true,
        message: 'Mockup mode active - no backend required'
    };
}

/**
 * Initialize mockup mode
 * Call this on page load
 */
async function initMockupMode() {
    console.log('🎭 MOCKUP MODE: Initializing demo environment');
    const success = await loadMockupData();

    if (success) {
        console.log('✅ MOCKUP MODE: Demo ready!');
        console.log('📊 Available companies:', mockupDataCache.companies.map(c => c.name));
    } else {
        console.error('❌ MOCKUP MODE: Failed to initialize');
    }

    return success;
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', initMockupMode);
}
