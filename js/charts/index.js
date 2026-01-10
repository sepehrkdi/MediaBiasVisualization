/**
 * Chart Library Index
 * Exports all chart types for easy importing
 */

// Base chart
export { BaseChart } from './BaseChart.js';

// Core chart types
export { BarChart, DivergingBarChart, StackedBarChart } from './BarChart.js';
export { LineChart, AreaChart, MultiLineChart } from './LineChart.js';
export { ChoroplethMap } from './ChoroplethMap.js';
export { NetworkGraph } from './NetworkGraph.js';
export { ConflictTimelineChart } from './ConflictTimelineChart.js';

// Additional chart types
export { 
    ScatterPlot,
    TreeMap,
    RadarChart,
    Histogram,
    ParallelCoordinates,
    UncertaintyChart,
    FlowDiagram
} from './OtherCharts.js';

// Chart registry for dynamic instantiation
export const ChartRegistry = {
    bar: 'BarChart',
    diverging: 'DivergingBarChart',
    stacked: 'StackedBarChart',
    line: 'LineChart',
    area: 'AreaChart',
    multiline: 'MultiLineChart',
    map: 'ChoroplethMap',
    network: 'NetworkGraph',
    scatter: 'ScatterPlot',
    treemap: 'TreeMap',
    radar: 'RadarChart',
    histogram: 'Histogram',
    parallel: 'ParallelCoordinates',
    uncertainty: 'UncertaintyChart',
    flow: 'FlowDiagram',
    conflictTimeline: 'ConflictTimelineChart'
};

// Charts namespace for convenient access
export const Charts = {
    BaseChart,
    BarChart,
    DivergingBarChart,
    StackedBarChart,
    LineChart,
    AreaChart,
    MultiLineChart,
    ChoroplethMap,
    NetworkGraph,
    ScatterPlot,
    TreeMap,
    RadarChart,
    Histogram,
    ParallelCoordinates,
    UncertaintyChart,
    FlowDiagram,
    ConflictTimelineChart
};

// Factory function to create charts
export function createChart(type, container, data, options = {}) {
    const chartMap = {
        bar: BarChart,
        diverging: DivergingBarChart,
        stacked: StackedBarChart,
        line: LineChart,
        area: AreaChart,
        multiline: MultiLineChart,
        map: ChoroplethMap,
        network: NetworkGraph,
        scatter: ScatterPlot,
        treemap: TreeMap,
        radar: RadarChart,
        histogram: Histogram,
        parallel: ParallelCoordinates,
        uncertainty: UncertaintyChart,
        flow: FlowDiagram,
        conflictTimeline: ConflictTimelineChart
    };
    
    const ChartClass = chartMap[type];
    if (!ChartClass) {
        console.error(`Unknown chart type: ${type}`);
        return null;
    }
    
    return new ChartClass(container, data, options);
}
