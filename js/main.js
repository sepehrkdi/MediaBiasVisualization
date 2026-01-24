/**
 * Main Application Entry Point
 * Media Bias Visualization - Data-driven storytelling website
 */

// Import modules
import { DataManager } from './modules/dataManager.js';
import { ScrollytellingController } from './modules/scrollytelling.js';
import { Tooltip } from './modules/tooltip.js';
import { setupNavigation } from './modules/navigation.js';

// Import charts (only those actually used in the application)
import { ChoroplethMap } from './charts/ChoroplethMap.js';
import { AnimatedChoroplethMap } from './charts/AnimatedChoroplethMap.js';
import { ConflictTimelineChart } from './charts/ConflictTimelineChart.js';
import { IntensityComparisonChart } from './charts/IntensityComparisonChart.js';
import { PieChart } from './charts/PieChart.js';

// Create Charts namespace for backward compatibility
const Charts = {
    ChoroplethMap,
    AnimatedChoroplethMap,
    ConflictTimelineChart,
    IntensityComparisonChart,
    PieChart
};

// Application state
const state = {
    currentStep: 0,
    data: null,
    charts: {},
    isLoading: true
};

// DOM Elements
const elements = {
    loadingOverlay: document.getElementById('loading-overlay'),
    mainChart: document.getElementById('main-chart'),
    tooltip: document.getElementById('tooltip'),
    statEvents: document.getElementById('stat-events'),
    statSources: document.getElementById('stat-sources'),
    statCountries: document.getElementById('stat-countries')
};

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing Media Bias Visualization...');

    try {
        // Setup navigation
        try {
            setupNavigation();
        } catch (e) {
            console.warn('Navigation setup failed:', e);
        }

        // Initialize tooltip
        try {
            state.tooltip = new Tooltip(elements.tooltip);
        } catch (e) {
            console.warn('Tooltip initialization failed:', e);
        }

        // Load data
        state.dataManager = new DataManager();
        await loadAllData();

        // Update statistics
        try {
            updateStatistics();
        } catch (e) {
            console.warn('Statistics update failed:', e);
        }

        // Initialize charts
        try {
            await initializeCharts();
        } catch (e) {
            console.warn('Chart initialization failed:', e);
        }

        // Setup scrollytelling
        try {
            setupScrollytelling();
        } catch (e) {
            console.warn('Scrollytelling setup failed:', e);
        }

        // Hide loading overlay
        hideLoading();

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Still hide loading even on error
        hideLoading();
        showError('Some visualizations failed to load. Please refresh the page.');
    }
}

/**
 * Load all required data files
 */
async function loadAllData() {
    const dataFiles = [
        { key: 'choroplethYearly', path: 'data/choropleth_yearly.json' },
        { key: 'conflictTimeline', path: 'data/conflict_timeline.json' },
        { key: 'yemenMyanmarTimeline', path: 'data/yemen_myanmar_timeline.json' },
        { key: 'bosniaAfghanistanTimeline', path: 'data/bosnia_afghanistan_timeline.json' },
        // Regional pie chart data
        { key: 'westAfricaPie', path: 'data/west_africa_piechart_data.json' },
        { key: 'balkansPie', path: 'data/balkans_piechart_data.json' },
        { key: 'centralAfricaPie', path: 'data/central_africa_piechart_data.json' },
        { key: 'middleEastPie', path: 'data/middle_east_piechart_data.json' },
        { key: 'southAsiaPie', path: 'data/south_asia_piechart_data.json' },
        { key: 'southeastAsiaPie', path: 'data/southeast_asia_piechart_data.json' }
    ];

    state.data = {};

    for (const file of dataFiles) {
        try {
            state.data[file.key] = await state.dataManager.loadJSON(file.path);
        } catch (error) {
            console.warn(`Failed to load ${file.key}:`, error);
            // Use sample data if file doesn't exist
            state.data[file.key] = generateSampleData(file.key);
        }
    }
}

/**
 * Generate sample data for development/demo purposes
 */
function generateSampleData(key) {
    // Fallback sample data is no longer needed - all data comes from JSON files
    console.warn(`No sample data available for key: ${key}`);
    return {};
}

/**
 * Update statistics in the intro section
 */
function updateStatistics() {
    // Use UCDP conflict data statistics for consistency with choropleth
    // Total across 1989-2024: 385,918 events, 124 unique countries, 36 years
    const choroplethData = state.data.choroplethYearly;
    if (choroplethData && choroplethData.metadata) {
        animateNumber(elements.statEvents, 385918);
        animateNumber(elements.statSources, choroplethData.metadata.totalYears || 36);
        animateNumber(elements.statCountries, 124);
    } else {
        // Fallback values based on UCDP data
        animateNumber(elements.statEvents, 385918);
        animateNumber(elements.statSources, 36);
        animateNumber(elements.statCountries, 124);
    }
}

/**
 * Animate a number counting up
 */
function animateNumber(element, target) {
    if (!element) return;

    const duration = 2000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (target - start) * easeOutQuart);

        element.textContent = formatNumber(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * Format large numbers with suffixes
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Initialize all chart instances
 */
async function initializeCharts() {
    // Store chart types for switching during scroll
    state.chartTypes = {
        'animated-choropleth': () => Charts.AnimatedChoroplethMap,
        'conflict-timeline': () => Charts.ConflictTimelineChart,
        'conflict-intensity': () => Charts.IntensityComparisonChart,
        'yemen-myanmar-intensity': () => Charts.IntensityComparisonChart,
        'yemen-myanmar-timeline': () => Charts.ConflictTimelineChart,
        'bosnia-afghanistan-intensity': () => Charts.IntensityComparisonChart,
        'bosnia-afghanistan-timeline': () => Charts.ConflictTimelineChart,
        'regional-pie-west-africa': () => Charts.PieChart,
        'regional-pie-balkans': () => Charts.PieChart,
        'regional-pie-central-africa': () => Charts.PieChart,
        'regional-pie-middle-east': () => Charts.PieChart,
        'regional-pie-south-asia': () => Charts.PieChart,
        'regional-pie-southeast-asia': () => Charts.PieChart
    };
}

/**
 * Setup scrollytelling functionality
 */
function setupScrollytelling() {
    state.scrollController = new ScrollytellingController({
        container: '.scrollytelling',
        steps: '.scroll-step',
        sticky: '.sticky-visual',
        onStepEnter: handleStepEnter,
        onStepExit: handleStepExit,
        onProgress: handleScrollProgress
    });
}

/**
 * Handle step enter during scrolling
 */
function handleStepEnter(step, direction) {
    const stepNumber = parseInt(step.dataset.step);
    const chartType = step.dataset.chart;
    const chapter = step.dataset.chapter;

    console.log(`Entering step ${stepNumber}: ${chartType} (chapter: ${chapter})`);

    // Mark step as active
    step.classList.add('is-active');

    // Update chapter theme on sticky visual
    updateChapterTheme(chapter);

    // Update chart
    updateMainChart(chartType, stepNumber);

    state.currentStep = stepNumber;
}

/**
 * Update the visual theme based on the current chapter
 */
function updateChapterTheme(chapter) {
    const stickyVisual = document.querySelector('.sticky-visual');
    const scrollSections = document.querySelector('.scroll-sections');
    const stickyContainer = document.querySelector('.sticky-container');

    if (chapter) {
        if (stickyVisual) {
            stickyVisual.setAttribute('data-theme', chapter);
        }
        if (scrollSections) {
            scrollSections.setAttribute('data-theme', chapter);
        }
        if (stickyContainer) {
            stickyContainer.setAttribute('data-theme', chapter);
        }
    }
}

/**
 * Handle step exit during scrolling
 */
function handleStepExit(step, direction) {
    step.classList.remove('is-active');
}

/**
 * Handle scroll progress
 */
function handleScrollProgress(progress) {
    // Update progress bar if present
    const progressBar = document.querySelector('.scroll-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
    }
}

/**
 * Update the main chart based on current step
 */
function updateMainChart(chartType, stepNumber) {
    const container = elements.mainChart;
    if (!container) return;

    // Clear existing chart
    container.innerHTML = '';

    // Get appropriate chart class and data
    try {
        const chartConfig = getChartConfig(chartType, stepNumber);

        if (chartConfig && chartConfig.ChartClass && chartConfig.data) {
            const { ChartClass, data, options } = chartConfig;
            const chart = new ChartClass(container, data, {
                ...options,
                tooltip: state.tooltip,
                animate: true
            });
            state.charts.main = chart;
        }
    } catch (e) {
        console.warn(`Failed to create chart for step ${stepNumber}:`, e);
    }
}

/**
 * Get chart configuration for a given chart type
 */
function getChartConfig(chartType, stepNumber) {
    const configs = {
        'animated-choropleth': {
            ChartClass: Charts.AnimatedChoroplethMap,
            data: state.data.choroplethYearly,
            options: {
                title: 'Global Conflict Events Over Time',
                metric: 'fatalities',
                animationSpeed: 1000,
                autoPlay: true,
                loop: true,
                colorScheme: 'interpolateYlOrRd',
                zoomable: false
            }
        },
        'conflict-timeline': {
            ChartClass: Charts.ConflictTimelineChart,
            data: state.data.conflictTimeline,
            options: {
                title: 'West African Civil Wars: Coverage vs. Casualties',
                chartType: 'stacked-area',
                countries: {
                    country1: {
                        name: 'Liberia',
                        fieldPrefix: 'liberia',
                        color: '#ff7f0e'
                    },
                    country2: {
                        name: 'Sierra Leone',
                        fieldPrefix: 'sierraLeone',
                        color: '#1f77b4'
                    }
                }
            }
        },
        'conflict-intensity': {
            ChartClass: Charts.IntensityComparisonChart,
            data: state.data.conflictTimeline,
            options: {
                title: 'Average Casualties per Event',
                countries: {
                    country1: {
                        name: 'Liberia',
                        fieldPrefix: 'liberia',
                        color: '#ff7f0e'
                    },
                    country2: {
                        name: 'Sierra Leone',
                        fieldPrefix: 'sierraLeone',
                        color: '#1f77b4'
                    }
                }
            }
        },
        'yemen-myanmar-intensity': {
            ChartClass: Charts.IntensityComparisonChart,
            data: state.data.yemenMyanmarTimeline,
            options: {
                title: 'Conflict Intensity: Yemen vs Myanmar'
            }
        },
        'yemen-myanmar-timeline': {
            ChartClass: Charts.ConflictTimelineChart,
            data: state.data.yemenMyanmarTimeline,
            options: {
                title: 'The Shifting Spotlight: Yemen vs Myanmar',
                chartType: 'stacked-area'
            }
        },
        'bosnia-afghanistan-intensity': {
            ChartClass: Charts.IntensityComparisonChart,
            data: state.data.bosniaAfghanistanTimeline,
            options: {
                title: 'Conflict Intensity: Bosnia vs Afghanistan',
                countries: {
                    country1: {
                        name: 'Bosnia',
                        fieldPrefix: 'country1',
                        color: '#1f77b4'
                    },
                    country2: {
                        name: 'Afghanistan',
                        fieldPrefix: 'country2',
                        color: '#ff7f0e'
                    }
                }
            }
        },
        'bosnia-afghanistan-timeline': {
            ChartClass: Charts.ConflictTimelineChart,
            data: state.data.bosniaAfghanistanTimeline,
            options: {
                title: 'The 1990s Coverage Gap: Europe vs Central Asia',
                chartType: 'stacked-area',
                countries: {
                    country1: {
                        name: 'Bosnia',
                        fieldPrefix: 'country1',
                        color: '#1f77b4'
                    },
                    country2: {
                        name: 'Afghanistan',
                        fieldPrefix: 'country2',
                        color: '#ff7f0e'
                    }
                }
            }
        },
        // Regional Pie Charts
        'regional-pie-west-africa': {
            ChartClass: Charts.PieChart,
            data: state.data.westAfricaPie,
            options: {
                title: 'West Africa Conflict Distribution',
                innerRadiusRatio: 0.45,
                showLegend: true,
                showSummary: true,
                animatePulse: true
            }
        },
        'regional-pie-balkans': {
            ChartClass: Charts.PieChart,
            data: state.data.balkansPie,
            options: {
                title: 'Balkans Conflict Distribution',
                innerRadiusRatio: 0.45,
                showLegend: true,
                showSummary: true,
                animatePulse: true
            }
        },
        'regional-pie-central-africa': {
            ChartClass: Charts.PieChart,
            data: state.data.centralAfricaPie,
            options: {
                title: 'Central Africa Conflict Distribution',
                innerRadiusRatio: 0.45,
                showLegend: true,
                showSummary: true,
                animatePulse: true
            }
        },
        'regional-pie-middle-east': {
            ChartClass: Charts.PieChart,
            data: state.data.middleEastPie,
            options: {
                title: 'Middle East Conflict Distribution',
                innerRadiusRatio: 0.45,
                showLegend: true,
                showSummary: true,
                animatePulse: true
            }
        },
        'regional-pie-south-asia': {
            ChartClass: Charts.PieChart,
            data: state.data.southAsiaPie,
            options: {
                title: 'South Asia Conflict Distribution',
                innerRadiusRatio: 0.45,
                showLegend: true,
                showSummary: true,
                animatePulse: true
            }
        },
        'regional-pie-southeast-asia': {
            ChartClass: Charts.PieChart,
            data: state.data.southeastAsiaPie,
            options: {
                title: 'Southeast Asia Conflict Distribution',
                innerRadiusRatio: 0.45,
                showLegend: true,
                showSummary: true,
                animatePulse: true
            }
        }
    };

    return configs[chartType];
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    state.isLoading = false;
    elements.loadingOverlay?.classList.add('is-hidden');
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <p>${message}</p>
        <button onclick="location.reload()">Reload Page</button>
    `;
    document.body.appendChild(errorDiv);
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.MediaBiasApp = { state, init };
