/**
 * Chart Library Index
 * Exports all chart types for easy importing
 */

// Base chart
export { BaseChart } from './BaseChart.js';

// Core chart types (only those actually used in the application)
export { PieChart } from './PieChart.js';
export { ChoroplethMap } from './ChoroplethMap.js';
export { AnimatedChoroplethMap } from './AnimatedChoroplethMap.js';
export { ConflictTimelineChart } from './ConflictTimelineChart.js';
export { IntensityComparisonChart } from './IntensityComparisonChart.js';

// Chart registry for dynamic instantiation
export const ChartRegistry = {
    map: 'ChoroplethMap',
    animatedMap: 'AnimatedChoroplethMap',
    conflictTimeline: 'ConflictTimelineChart',
    intensityComparison: 'IntensityComparisonChart',
    pie: 'PieChart',
    'regional-pie': 'PieChart'
};

// Charts namespace for convenient access
export const Charts = {
    BaseChart,
    ChoroplethMap,
    AnimatedChoroplethMap,
    ConflictTimelineChart,
    IntensityComparisonChart,
    PieChart
};

// Factory function to create charts
export function createChart(type, container, data, options = {}) {
    const chartMap = {
        map: ChoroplethMap,
        animatedMap: AnimatedChoroplethMap,
        conflictTimeline: ConflictTimelineChart,
        intensityComparison: IntensityComparisonChart,
        pie: PieChart,
        'regional-pie': PieChart
    };

    const ChartClass = chartMap[type];
    if (!ChartClass) {
        console.error(`Unknown chart type: ${type}`);
        return null;
    }

    return new ChartClass(container, data, options);
}
