/**
 * Main Application Entry Point
 * Media Bias Visualization - Data-driven storytelling website
 */

// Import modules
import { DataManager } from './modules/dataManager.js';
import { ScrollytellingController } from './modules/scrollytelling.js';
import { Tooltip } from './modules/tooltip.js';
import { setupNavigation } from './modules/navigation.js';

// Import charts individually to avoid circular dependencies
import {
    BarChart,
    DivergingBarChart,
    StackedBarChart
} from './charts/BarChart.js';
import {
    LineChart,
    AreaChart,
    MultiLineChart
} from './charts/LineChart.js';
import { ChoroplethMap } from './charts/ChoroplethMap.js';
import { AnimatedChoroplethMap } from './charts/AnimatedChoroplethMap.js';
import { NetworkGraph } from './charts/NetworkGraph.js';
import {
    ScatterPlot,
    TreeMap,
    RadarChart,
    Histogram,
    ParallelCoordinates,
    UncertaintyChart,
    FlowDiagram
} from './charts/OtherCharts.js';
import { ConflictTimelineChart } from './charts/ConflictTimelineChart.js';
import { IntensityComparisonChart } from './charts/IntensityComparisonChart.js';
import { PieChart } from './charts/PieChart.js';

// Create Charts namespace for backward compatibility
const Charts = {
    BarChart,
    DivergingBarChart,
    StackedBarChart,
    LineChart,
    AreaChart,
    MultiLineChart,
    ChoroplethMap,
    AnimatedChoroplethMap,
    NetworkGraph,
    ScatterPlot,
    TreeMap,
    RadarChart,
    Histogram,
    ParallelCoordinates,
    UncertaintyChart,
    FlowDiagram,
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

        // Setup explore section
        try {
            setupExploreSection();
        } catch (e) {
            console.warn('Explore section setup failed:', e);
        }

        // Setup data flow diagram
        try {
            setupDataFlowDiagram();
        } catch (e) {
            console.warn('Data flow diagram setup failed:', e);
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
        { key: 'coverage', path: 'data/country_coverage.json' },
        { key: 'choroplethYearly', path: 'data/choropleth_yearly.json' },
        { key: 'sentiment', path: 'data/sentiment_by_source.json' },
        { key: 'bias', path: 'data/bias_comparison.json' },
        { key: 'events', path: 'data/event_types.json' },
        { key: 'timeline', path: 'data/temporal_trends.json' },
        { key: 'network', path: 'data/source_network.json' },
        { key: 'conflictTimeline', path: 'data/conflict_timeline.json' },
        { key: 'yemenMyanmarTimeline', path: 'data/yemen_myanmar_timeline.json' },
        { key: 'bosniaAfghanistanTimeline', path: 'data/bosnia_afghanistan_timeline.json' },
        { key: 'afghanistanKivuTimeline', path: 'data/afghanistan_kivu_timeline.json' },
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
    const sampleGenerators = {
        coverage: () => ({
            countries: [
                { id: 'USA', name: 'United States', coverage: 45000, sentiment: 0.12 },
                { id: 'GBR', name: 'United Kingdom', coverage: 28000, sentiment: 0.08 },
                { id: 'DEU', name: 'Germany', coverage: 18500, sentiment: 0.05 },
                { id: 'FRA', name: 'France', coverage: 15200, sentiment: 0.02 },
                { id: 'CHN', name: 'China', coverage: 32000, sentiment: -0.15 },
                { id: 'RUS', name: 'Russia', coverage: 25000, sentiment: -0.22 },
                { id: 'IND', name: 'India', coverage: 12000, sentiment: 0.10 },
                { id: 'BRA', name: 'Brazil', coverage: 8500, sentiment: -0.05 },
                { id: 'JPN', name: 'Japan', coverage: 14000, sentiment: 0.18 },
                { id: 'AUS', name: 'Australia', coverage: 6200, sentiment: 0.14 }
            ],
            metadata: {
                totalEvents: 1245678,
                dateRange: { start: '2024-01-01', end: '2025-01-01' }
            }
        }),

        sentiment: () => ({
            sources: [
                { name: 'Reuters', avgSentiment: 0.02, articles: 45000, category: 'wire' },
                { name: 'BBC', avgSentiment: 0.05, articles: 38000, category: 'public' },
                { name: 'CNN', avgSentiment: -0.08, articles: 32000, category: 'cable' },
                { name: 'Fox News', avgSentiment: 0.15, articles: 28000, category: 'cable' },
                { name: 'Al Jazeera', avgSentiment: -0.12, articles: 22000, category: 'international' },
                { name: 'NYT', avgSentiment: -0.05, articles: 35000, category: 'newspaper' },
                { name: 'Guardian', avgSentiment: -0.10, articles: 29000, category: 'newspaper' },
                { name: 'RT', avgSentiment: -0.25, articles: 18000, category: 'state' }
            ]
        }),

        sources: () => ({
            sources: [
                { id: 'reuters', name: 'Reuters', country: 'UK', type: 'wire', bias: 0.02 },
                { id: 'bbc', name: 'BBC', country: 'UK', type: 'public', bias: 0.05 },
                { id: 'cnn', name: 'CNN', country: 'US', type: 'cable', bias: -0.08 },
                { id: 'fox', name: 'Fox News', country: 'US', type: 'cable', bias: 0.15 },
                { id: 'aljazeera', name: 'Al Jazeera', country: 'QA', type: 'international', bias: -0.12 }
            ]
        }),

        events: () => ({
            types: [
                { code: '01', name: 'Make Statement', count: 125000, percent: 32.5 },
                { code: '02', name: 'Appeal', count: 45000, percent: 11.7 },
                { code: '03', name: 'Express Intent to Cooperate', count: 38000, percent: 9.9 },
                { code: '04', name: 'Consult', count: 28000, percent: 7.3 },
                { code: '05', name: 'Diplomatic Cooperation', count: 22000, percent: 5.7 },
                { code: '06', name: 'Material Cooperation', count: 18500, percent: 4.8 },
                { code: '10', name: 'Demand', count: 35000, percent: 9.1 },
                { code: '14', name: 'Protest', count: 28000, percent: 7.3 },
                { code: '17', name: 'Coerce', count: 15000, percent: 3.9 },
                { code: '19', name: 'Fight', count: 12000, percent: 3.1 },
                { code: '20', name: 'Use Conventional Military Force', count: 18000, percent: 4.7 }
            ]
        }),

        timeline: () => {
            const data = [];
            const startDate = new Date('2024-01-01');
            for (let i = 0; i < 365; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                data.push({
                    date: date.toISOString().split('T')[0],
                    coverage: Math.floor(3000 + Math.random() * 2000 + Math.sin(i / 30) * 500),
                    sentiment: (Math.random() - 0.5) * 0.3
                });
            }
            return { timeline: data };
        },

        network: () => ({
            nodes: [
                { id: 'USA', name: 'United States', group: 'country', size: 100 },
                { id: 'CHN', name: 'China', group: 'country', size: 80 },
                { id: 'RUS', name: 'Russia', group: 'country', size: 70 },
                { id: 'GBR', name: 'United Kingdom', group: 'country', size: 50 },
                { id: 'UN', name: 'United Nations', group: 'org', size: 60 },
                { id: 'NATO', name: 'NATO', group: 'org', size: 45 },
                { id: 'EU', name: 'European Union', group: 'org', size: 55 }
            ],
            links: [
                { source: 'USA', target: 'CHN', weight: 85 },
                { source: 'USA', target: 'RUS', weight: 75 },
                { source: 'USA', target: 'GBR', weight: 90 },
                { source: 'CHN', target: 'RUS', weight: 65 },
                { source: 'USA', target: 'UN', weight: 70 },
                { source: 'USA', target: 'NATO', weight: 95 },
                { source: 'GBR', target: 'EU', weight: 60 }
            ]
        }),

        world: () => null // Will use TopoJSON from CDN
    };

    return sampleGenerators[key] ? sampleGenerators[key]() : {};
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
    // Only initialize main chart if container exists and we have data
    const mainChartContainer = document.querySelector('#main-chart');
    if (mainChartContainer && state.data.coverage) {
        try {
            state.charts.globalCoverage = new Charts.ChoroplethMap(
                '#main-chart',
                state.data.coverage,
                { tooltip: state.tooltip }
            );
        } catch (e) {
            console.warn('Failed to initialize main chart:', e);
        }
    }

    // Store chart types for switching during scroll
    state.chartTypes = {
        'global-coverage': () => Charts.ChoroplethMap,
        'animated-choropleth': () => Charts.AnimatedChoroplethMap,
        'coverage-disparity': () => Charts.BarChart,
        'sentiment-comparison': () => Charts.DivergingBarChart,
        'source-clusters': () => Charts.ScatterPlot,
        'temporal-patterns': () => Charts.LineChart,
        'actor-network': () => Charts.NetworkGraph,
        'event-types': () => Charts.TreeMap,
        'geographic-bias': () => Charts.StackedBarChart,
        'sentiment-timeline': () => Charts.AreaChart,
        'source-reliability': () => Charts.RadarChart,
        'outlet-comparison': () => Charts.ParallelCoordinates,
        'uncertainty': () => Charts.UncertaintyChart,
        'conflict-timeline': () => Charts.ConflictTimelineChart
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
    if (stickyVisual && chapter) {
        stickyVisual.setAttribute('data-theme', chapter);
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
        'global-coverage': {
            ChartClass: Charts.ChoroplethMap,
            data: state.data.coverage,
            options: {
                title: 'Global News Coverage Volume',
                colorScale: 'sequential'
            }
        },
        'animated-choropleth': {
            ChartClass: Charts.AnimatedChoroplethMap,
            data: state.data.choroplethYearly,
            options: {
                title: 'Global Conflict Events Over Time',
                metric: 'fatalities',
                animationSpeed: 1000,
                autoPlay: false,
                loop: true,
                colorScheme: 'interpolateYlOrRd',
                zoomable: false
            }
        },
        'coverage-disparity': {
            ChartClass: Charts.BarChart,
            data: prepareBarChartData(state.data.coverage),
            options: {
                title: 'Coverage by Country',
                xLabel: 'Country',
                yLabel: 'Article Count'
            }
        },
        'sentiment-comparison': {
            ChartClass: Charts.DivergingBarChart,
            data: state.data.bias || state.data.sentiment,
            options: {
                title: 'Sentiment by News Source',
                xLabel: 'Average Sentiment Score'
            }
        },
        'source-clusters': {
            ChartClass: Charts.ScatterPlot,
            data: prepareClusterData(state.data.sentiment),
            options: {
                title: 'News Source Clustering',
                xLabel: 'Coverage Volume',
                yLabel: 'Sentiment Deviation'
            }
        },
        'temporal-patterns': {
            ChartClass: Charts.LineChart,
            data: state.data.timeline,
            options: {
                title: 'Coverage Over Time',
                xLabel: 'Date',
                yLabel: 'Daily Articles'
            }
        },
        'actor-network': {
            ChartClass: Charts.NetworkGraph,
            data: state.data.network,
            options: {
                title: 'Source Co-mention Network'
            }
        },
        'event-types': {
            ChartClass: Charts.TreeMap,
            data: state.data.events,
            options: {
                title: 'Event Type Distribution'
            }
        },
        'geographic-bias': {
            ChartClass: Charts.StackedBarChart,
            data: prepareGeographicBiasData(state.data.coverage),
            options: {
                title: 'Geographic Focus by Source Region'
            }
        },
        'sentiment-timeline': {
            ChartClass: Charts.AreaChart,
            data: state.data.timeline,
            options: {
                title: 'Sentiment Trends Over Time',
                showConfidence: true
            }
        },
        'source-reliability': {
            ChartClass: Charts.RadarChart,
            data: prepareReliabilityData(state.data.sentiment),
            options: {
                title: 'Multi-metric Source Comparison'
            }
        },
        'outlet-comparison': {
            ChartClass: Charts.ParallelCoordinates,
            data: state.data.sentiment,
            options: {
                title: 'Outlet Comparison'
            }
        },
        'uncertainty': {
            ChartClass: Charts.UncertaintyChart,
            data: prepareUncertaintyData(state.data),
            options: {
                title: 'Data Uncertainty Visualization'
            }
        },
        'conflict-timeline': {
            ChartClass: Charts.ConflictTimelineChart,
            data: state.data.conflictTimeline,
            options: {
                title: 'West African Civil Wars: Coverage vs. Casualties',
                chartType: 'stacked-area'
            }
        },
        'conflict-intensity': {
            ChartClass: Charts.IntensityComparisonChart,
            data: state.data.conflictTimeline,
            options: {
                title: 'Average Casualties per Event'
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
        'afghanistan-kivu-intensity': {
            ChartClass: Charts.IntensityComparisonChart,
            data: state.data.afghanistanKivuTimeline,
            options: {
                title: 'Conflict Intensity: Afghanistan vs Kivu',
                countries: {
                    country1: {
                        name: 'Afghanistan',
                        fieldPrefix: 'country1',
                        color: '#ff7f0e'
                    },
                    country2: {
                        name: 'Kivu',
                        fieldPrefix: 'country2',
                        color: '#2ca02c'
                    }
                }
            }
        },
        'afghanistan-kivu-timeline': {
            ChartClass: Charts.ConflictTimelineChart,
            data: state.data.afghanistanKivuTimeline,
            options: {
                title: 'The Forgotten Crisis: Afghanistan vs Kivu (2001-2016)',
                chartType: 'stacked-area',
                countries: {
                    country1: {
                        name: 'Afghanistan',
                        fieldPrefix: 'country1',
                        color: '#ff7f0e'
                    },
                    country2: {
                        name: 'Kivu',
                        fieldPrefix: 'country2',
                        color: '#2ca02c'
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
 * Data transformation helpers
 */
function prepareBarChartData(coverageData) {
    if (!coverageData?.countries) return { bars: [] };
    return {
        bars: coverageData.countries
            .sort((a, b) => b.coverage - a.coverage)
            .slice(0, 15)
            .map(c => ({
                label: c.name || c.code,
                value: c.coverage
            }))
    };
}

function prepareClusterData(sourcesData) {
    if (!sourcesData?.sources) return { points: [] };
    return {
        points: sourcesData.sources.map(s => ({
            x: s.articleCount || Math.random() * 50000,
            y: (s.avgSentiment || 0) * 100,
            label: s.name,
            category: s.type || s.country || 'Unknown'
        }))
    };
}

function prepareGeographicBiasData(coverageData) {
    return {
        categories: ['Americas', 'Europe', 'Asia', 'Africa', 'Oceania'],
        series: [
            { name: 'US Sources', values: [65, 15, 12, 5, 3] },
            { name: 'UK Sources', values: [25, 45, 18, 8, 4] },
            { name: 'Asian Sources', values: [15, 12, 55, 12, 6] }
        ]
    };
}

function prepareReliabilityData(sourcesData) {
    return {
        dimensions: ['Coverage Volume', 'Sentiment Deviation', 'Geographic Breadth', 'Source Diversity', 'Timeliness'],
        series: [
            { name: 'Reuters', values: [0.9, 0.2, 0.85, 0.8, 0.95] },
            { name: 'BBC', values: [0.75, 0.3, 0.7, 0.6, 0.85] },
            { name: 'CNN', values: [0.7, 0.45, 0.5, 0.5, 0.9] }
        ]
    };
}

function prepareUncertaintyData(allData) {
    return {
        metrics: [
            { name: 'Sentiment Score', value: 0.12, ci_low: 0.08, ci_high: 0.16, n: 45000 },
            { name: 'Coverage Bias', value: -0.05, ci_low: -0.12, ci_high: 0.02, n: 32000 },
            { name: 'Geographic Focus', value: 0.35, ci_low: 0.28, ci_high: 0.42, n: 28000 }
        ]
    };
}

/**
 * Setup explore section interactivity
 */
function setupExploreSection() {
    const applyBtn = document.getElementById('apply-filters');
    const resetBtn = document.getElementById('reset-filters');

    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }

    // Initialize explore charts
    initializeExploreCharts();
}

function applyFilters() {
    const region = document.getElementById('region-filter')?.value;
    const eventType = document.getElementById('event-filter')?.value;

    console.log('Applying filters:', { region, eventType });

    // Update explore charts with filtered data
    updateExploreCharts({ region, eventType });
}

function resetFilters() {
    document.getElementById('region-filter').value = 'all';
    document.getElementById('event-filter').value = 'all';
    updateExploreCharts({ region: 'all', eventType: 'all' });
}

function initializeExploreCharts() {
    // Volume chart
    const volumeContainer = document.getElementById('explore-volume');
    if (volumeContainer && state.data.coverage) {
        try {
            state.charts.exploreVolume = new Charts.BarChart(
                volumeContainer,
                prepareBarChartData(state.data.coverage),
                { tooltip: state.tooltip }
            );
        } catch (e) {
            console.warn('Failed to initialize volume chart:', e);
        }
    }

    // Sentiment distribution
    const sentimentContainer = document.getElementById('explore-sentiment');
    if (sentimentContainer && state.data.sentiment) {
        try {
            state.charts.exploreSentiment = new Charts.Histogram(
                sentimentContainer,
                state.data.sentiment,
                { tooltip: state.tooltip }
            );
        } catch (e) {
            console.warn('Failed to initialize sentiment chart:', e);
        }
    }
}

function updateExploreCharts(filters) {
    // Re-render charts with filtered data
    console.log('Updating explore charts with filters:', filters);
}

/**
 * Setup data flow diagram in methodology section
 */
function setupDataFlowDiagram() {
    const container = document.getElementById('data-flow-diagram');
    if (!container) return;

    try {
        const flowData = {
            nodes: [
                { id: 'gdelt', label: 'GDELT Database', type: 'source' },
                { id: 'postgres', label: 'PostgreSQL', type: 'storage' },
                { id: 'python', label: 'Python Processing', type: 'process' },
                { id: 'csv', label: 'CSV/JSON Files', type: 'output' },
                { id: 'd3', label: 'D3.js Visualizations', type: 'visualization' }
            ],
            links: [
                { source: 'gdelt', target: 'postgres' },
                { source: 'postgres', target: 'python' },
                { source: 'python', target: 'csv' },
                { source: 'csv', target: 'd3' }
            ]
        };

        // Pipeline stage descriptions for interactivity
        const pipelineDescriptions = {
            gdelt: {
                title: 'GDELT Database',
                description: 'The Global Database of Events, Language, and Tone (GDELT) monitors news media from nearly every country in the world, identifying people, locations, organizations, themes, sources, emotions, and events. We query over 1 billion events from this comprehensive dataset.'
            },
            postgres: {
                title: 'PostgreSQL Storage',
                description: 'Raw GDELT data is stored in a PostgreSQL database for efficient querying and analysis. We use optimized indexes and partitioning to handle the massive scale of global news data spanning multiple years.'
            },
            python: {
                title: 'Python Processing',
                description: 'Python scripts using pandas, numpy, and scipy perform data cleaning, aggregation, sentiment analysis, and statistical computations. This includes calculating coverage ratios, tone distributions, and temporal patterns.'
            },
            csv: {
                title: 'JSON Data Files',
                description: 'Processed data is exported as optimized JSON files, pre-aggregated for visualization performance. Each file corresponds to a specific chart or analysis, minimizing client-side computation.'
            },
            d3: {
                title: 'D3.js Visualizations',
                description: 'Interactive visualizations built with D3.js bring the data to life. Each chart is designed to reveal specific patterns in media bias, from geographic distributions to temporal trends and sentiment analysis.'
            }
        };

        state.charts.dataFlow = new Charts.FlowDiagram(
            container,
            flowData,
            { tooltip: state.tooltip }
        );

        // Setup interactive pipeline details
        setupPipelineInteractivity(pipelineDescriptions);
    } catch (e) {
        console.warn('Failed to initialize data flow diagram:', e);
    }
}

/**
 * Setup interactive pipeline stage details
 */
function setupPipelineInteractivity(descriptions) {
    const detailsPanel = document.getElementById('pipeline-details');
    const titleEl = document.getElementById('pipeline-detail-title');
    const descEl = document.getElementById('pipeline-detail-description');

    if (!detailsPanel || !titleEl || !descEl) return;

    // Add click handlers to pipeline nodes
    const diagram = document.getElementById('data-flow-diagram');
    if (!diagram) return;

    // Use MutationObserver to wait for SVG to be created
    const observer = new MutationObserver((mutations, obs) => {
        const svg = diagram.querySelector('svg');
        if (svg) {
            obs.disconnect();
            addPipelineNodeHandlers(svg, descriptions, detailsPanel, titleEl, descEl);
        }
    });

    observer.observe(diagram, { childList: true, subtree: true });

    // Also check if SVG already exists
    const existingSvg = diagram.querySelector('svg');
    if (existingSvg) {
        observer.disconnect();
        addPipelineNodeHandlers(existingSvg, descriptions, detailsPanel, titleEl, descEl);
    }
}

/**
 * Add click handlers to pipeline SVG nodes
 */
function addPipelineNodeHandlers(svg, descriptions, detailsPanel, titleEl, descEl) {
    const nodeGroups = svg.querySelectorAll('.node');
    let activeNode = null;

    nodeGroups.forEach(nodeGroup => {
        nodeGroup.classList.add('pipeline-node');

        nodeGroup.addEventListener('click', (e) => {
            e.stopPropagation();

            // Get node id from the group or text
            const textEl = nodeGroup.querySelector('text');
            const label = textEl ? textEl.textContent : '';

            // Map label to id
            const labelToId = {
                'GDELT Database': 'gdelt',
                'PostgreSQL': 'postgres',
                'Python Processing': 'python',
                'CSV/JSON Files': 'csv',
                'D3.js Visualizations': 'd3'
            };

            const nodeId = labelToId[label];
            if (!nodeId || !descriptions[nodeId]) return;

            // Update active state
            if (activeNode) {
                activeNode.classList.remove('active');
            }
            nodeGroup.classList.add('active');
            activeNode = nodeGroup;

            // Update details panel
            const info = descriptions[nodeId];
            titleEl.textContent = info.title;
            descEl.textContent = info.description;
            detailsPanel.classList.add('visible');
        });

        // Keyboard accessibility
        nodeGroup.setAttribute('tabindex', '0');
        nodeGroup.setAttribute('role', 'button');
        nodeGroup.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                nodeGroup.click();
            }
        });
    });

    // Click outside to hide details
    document.addEventListener('click', (e) => {
        if (!detailsPanel.contains(e.target) && !svg.contains(e.target)) {
            detailsPanel.classList.remove('visible');
            if (activeNode) {
                activeNode.classList.remove('active');
                activeNode = null;
            }
        }
    });
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
