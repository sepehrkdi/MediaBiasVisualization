/**
 * Additional Chart Types
 * TreeMap, Scatter Plot, Radar Chart, etc.
 */

import { BaseChart } from './BaseChart.js';

/**
 * Scatter Plot
 */
export class ScatterPlot extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            pointRadius: 6,
            showRegression: false,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.points) return;
        
        const points = this.data.points;
        
        // Scales
        const xExtent = d3.extent(points, d => d.x);
        const yExtent = d3.extent(points, d => d.y);
        
        const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        
        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([0, this.width])
            .nice();
        
        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([this.height, 0])
            .nice();
        
        const categories = [...new Set(points.map(d => d.category))];
        const colorScale = this.getColorScale('categorical', categories);
        
        // Axes
        this.createXAxis(xScale, { label: this.options.xLabel });
        this.createYAxis(yScale, { label: this.options.yLabel });
        this.createGrid(xScale, yScale);
        
        // Reference lines at zero
        if (xExtent[0] < 0 && xExtent[1] > 0) {
            this.dataGroup.append('line')
                .attr('class', 'reference-line')
                .attr('x1', xScale(0))
                .attr('x2', xScale(0))
                .attr('y1', 0)
                .attr('y2', this.height);
        }
        
        if (yExtent[0] < 0 && yExtent[1] > 0) {
            this.dataGroup.append('line')
                .attr('class', 'reference-line')
                .attr('x1', 0)
                .attr('x2', this.width)
                .attr('y1', yScale(0))
                .attr('y2', yScale(0));
        }
        
        // Draw points
        const pointElements = this.dataGroup.selectAll('.scatter-point')
            .data(points)
            .join('circle')
            .attr('class', 'scatter-point')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 0)
            .attr('fill', d => colorScale(d.category));
        
        // Animate entrance
        pointElements.transition(this.transition())
            .attr('r', this.options.pointRadius);
        
        // Interactivity
        pointElements
            .on('mouseenter', (event, d) => {
                d3.select(event.currentTarget).attr('r', this.options.pointRadius * 1.5);
                this.showTooltip({
                    title: d.label,
                    rows: [
                        { label: this.options.xLabel || 'X', value: d.x, format: 'decimal' },
                        { label: this.options.yLabel || 'Y', value: d.y, format: 'decimal' },
                        { label: 'Category', value: d.category }
                    ]
                }, event);
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', (event) => {
                d3.select(event.currentTarget).attr('r', this.options.pointRadius);
                this.hideTooltip();
            });
        
        // Legend
        if (categories.length > 1) {
            this.createLegend(categories, colorScale);
        }
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
    
    createLegend(categories, colorScale) {
        const legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width + this.options.margin.left - 100}, ${this.options.margin.top})`);
        
        const items = legendGroup.selectAll('.legend-item')
            .data(categories)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`);
        
        items.append('circle')
            .attr('cx', 6)
            .attr('cy', 6)
            .attr('r', 5)
            .attr('fill', d => colorScale(d));
        
        items.append('text')
            .attr('class', 'legend-label')
            .attr('x', 18)
            .attr('y', 10)
            .text(d => d);
    }
}


/**
 * TreeMap
 */
export class TreeMap extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            padding: 2,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.types) return;
        
        // Transform data for treemap
        const hierarchyData = {
            name: 'root',
            children: this.data.types.map(d => ({
                name: d.name,
                value: d.count,
                code: d.code,
                percent: d.percent
            }))
        };
        
        // Create hierarchy
        const root = d3.hierarchy(hierarchyData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);
        
        // Create treemap layout
        d3.treemap()
            .size([this.width, this.height])
            .padding(this.options.padding)
            (root);
        
        // Color scale
        const colorScale = d3.scaleOrdinal(d3.schemeTableau10);
        
        // Draw cells
        const cells = this.dataGroup.selectAll('.treemap-cell')
            .data(root.leaves())
            .join('g')
            .attr('class', 'treemap-cell-group')
            .attr('transform', d => `translate(${d.x0}, ${d.y0})`);
        
        cells.append('rect')
            .attr('class', 'treemap-cell')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', (d, i) => colorScale(i));
        
        // Labels (only for cells large enough)
        cells.filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30)
            .append('text')
            .attr('class', 'treemap-label')
            .attr('x', 5)
            .attr('y', 18)
            .text(d => d.data.name)
            .each(function(d) {
                // Truncate text if needed
                const textWidth = d.x1 - d.x0 - 10;
                const text = d3.select(this);
                let textContent = d.data.name;
                
                while (this.getComputedTextLength() > textWidth && textContent.length > 3) {
                    textContent = textContent.slice(0, -4) + '...';
                    text.text(textContent);
                }
            });
        
        // Percentage labels
        cells.filter(d => (d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 45)
            .append('text')
            .attr('class', 'treemap-label')
            .attr('x', 5)
            .attr('y', 35)
            .style('font-size', '10px')
            .style('fill-opacity', 0.8)
            .text(d => `${d.data.percent?.toFixed(1) || ''}%`);
        
        // Interactivity
        cells.selectAll('rect')
            .on('mouseenter', (event, d) => {
                d3.select(event.currentTarget.parentNode).raise();
                this.showTooltip({
                    title: d.data.name,
                    rows: [
                        { label: 'Count', value: d.data.value, format: 'number' },
                        { label: 'Percentage', value: d.data.percent / 100, format: 'percent' },
                        { label: 'Code', value: d.data.code }
                    ]
                }, event);
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', () => this.hideTooltip());
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
}


/**
 * Radar Chart
 */
export class RadarChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            levels: 5,
            maxValue: 1,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.dimensions || !this.data.series) return;
        
        const { dimensions, series } = this.data;
        const numDimensions = dimensions.length;
        const radius = Math.min(this.width, this.height) / 2 - 40;
        
        // Center the chart
        this.dataGroup.attr('transform', 
            `translate(${this.width / 2 + this.options.margin.left}, ${this.height / 2 + this.options.margin.top})`);
        
        // Angle scale
        const angleSlice = (Math.PI * 2) / numDimensions;
        
        // Radius scale
        const rScale = d3.scaleLinear()
            .domain([0, this.options.maxValue])
            .range([0, radius]);
        
        // Color scale
        const colorScale = this.getColorScale('categorical', series.map(s => s.name));
        
        // Draw circular grid
        const levels = d3.range(1, this.options.levels + 1);
        
        this.dataGroup.selectAll('.grid-circle')
            .data(levels)
            .join('circle')
            .attr('class', 'grid-circle')
            .attr('r', d => radius * d / this.options.levels)
            .style('fill', 'none')
            .style('stroke', '#ccc')
            .style('stroke-dasharray', '3,3');
        
        // Draw axes
        const axes = this.dataGroup.selectAll('.axis-line')
            .data(dimensions)
            .join('g')
            .attr('class', 'axis-line');
        
        axes.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', (d, i) => rScale(this.options.maxValue) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr('y2', (d, i) => rScale(this.options.maxValue) * Math.sin(angleSlice * i - Math.PI / 2))
            .style('stroke', '#ccc')
            .style('stroke-width', 1);
        
        // Axis labels
        axes.append('text')
            .attr('class', 'axis-label')
            .attr('x', (d, i) => (rScale(this.options.maxValue) + 15) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr('y', (d, i) => (rScale(this.options.maxValue) + 15) * Math.sin(angleSlice * i - Math.PI / 2))
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .text(d => d);
        
        // Line generator
        const radarLine = d3.lineRadial()
            .radius(d => rScale(d))
            .angle((d, i) => i * angleSlice)
            .curve(d3.curveLinearClosed);
        
        // Draw series
        const seriesGroups = this.dataGroup.selectAll('.radar-series')
            .data(series)
            .join('g')
            .attr('class', 'radar-series');
        
        // Area
        seriesGroups.append('path')
            .attr('class', 'radar-area')
            .attr('d', d => radarLine(d.values))
            .style('fill', d => colorScale(d.name))
            .style('fill-opacity', 0.2)
            .style('stroke', d => colorScale(d.name))
            .style('stroke-width', 2);
        
        // Points
        seriesGroups.selectAll('.radar-point')
            .data(d => d.values.map((v, i) => ({ value: v, index: i, name: d.name })))
            .join('circle')
            .attr('class', 'radar-point scatter-point')
            .attr('cx', d => rScale(d.value) * Math.cos(angleSlice * d.index - Math.PI / 2))
            .attr('cy', d => rScale(d.value) * Math.sin(angleSlice * d.index - Math.PI / 2))
            .attr('r', 4)
            .attr('fill', d => colorScale(d.name))
            .on('mouseenter', (event, d) => {
                this.showTooltip({
                    title: d.name,
                    rows: [
                        { label: dimensions[d.index], value: d.value, format: 'decimal' }
                    ]
                }, event);
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', () => this.hideTooltip());
        
        // Legend
        this.createLegend(series.map(s => s.name), colorScale);
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
    
    createLegend(names, colorScale) {
        const legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.options.margin.left}, ${this.height + this.options.margin.top + 30})`);
        
        const items = legendGroup.selectAll('.legend-item')
            .data(names)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * 100}, 0)`);
        
        items.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', d => colorScale(d));
        
        items.append('text')
            .attr('class', 'legend-label')
            .attr('x', 18)
            .attr('y', 10)
            .text(d => d);
    }
}


/**
 * Histogram
 */
export class Histogram extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            bins: 20,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.sources) return;
        
        const values = this.data.sources.map(d => d.avgSentiment);
        
        // Create histogram generator
        const histogram = d3.histogram()
            .domain(d3.extent(values))
            .thresholds(this.options.bins);
        
        const bins = histogram(values);
        
        // Scales
        const xScale = d3.scaleLinear()
            .domain([bins[0].x0, bins[bins.length - 1].x1])
            .range([0, this.width]);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([this.height, 0])
            .nice();
        
        // Axes
        this.createXAxis(xScale, { label: 'Sentiment Score' });
        this.createYAxis(yScale, { label: 'Frequency' });
        
        // Color scale based on sentiment
        const colorScale = d3.scaleLinear()
            .domain([-0.5, 0, 0.5])
            .range(['#C62828', '#757575', '#2E7D32']);
        
        // Draw bars
        this.dataGroup.selectAll('.histogram-bar')
            .data(bins)
            .join('rect')
            .attr('class', 'bar histogram-bar')
            .attr('x', d => xScale(d.x0) + 1)
            .attr('y', d => yScale(d.length))
            .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
            .attr('height', d => this.height - yScale(d.length))
            .attr('fill', d => colorScale((d.x0 + d.x1) / 2))
            .on('mouseenter', (event, d) => {
                this.showTooltip({
                    title: `${d.x0.toFixed(2)} to ${d.x1.toFixed(2)}`,
                    rows: [
                        { label: 'Count', value: d.length, format: 'number' },
                        { label: 'Sources', value: d.map(v => 
                            this.data.sources.find(s => s.avgSentiment === v)?.name
                        ).filter(Boolean).slice(0, 3).join(', ') }
                    ]
                }, event);
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', () => this.hideTooltip());
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
}


/**
 * Parallel Coordinates
 */
export class ParallelCoordinates extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.sources) return;
        
        const sources = this.data.sources;
        const dimensions = ['bias', 'coverage', 'sentiment'];
        
        // Create scales for each dimension
        const yScales = {};
        dimensions.forEach(dim => {
            const extent = d3.extent(sources, d => d[dim] || Math.random());
            yScales[dim] = d3.scaleLinear()
                .domain(extent)
                .range([this.height, 0]);
        });
        
        // X scale for dimensions
        const xScale = d3.scalePoint()
            .domain(dimensions)
            .range([0, this.width]);
        
        // Color scale
        const colorScale = this.getColorScale('categorical', sources.map(s => s.type));
        
        // Draw axes
        dimensions.forEach(dim => {
            const axis = d3.axisLeft(yScales[dim]).ticks(5);
            this.axisGroup.append('g')
                .attr('class', 'axis')
                .attr('transform', `translate(${xScale(dim)}, 0)`)
                .call(axis);
            
            this.axisGroup.append('text')
                .attr('class', 'axis-label')
                .attr('x', xScale(dim))
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .text(dim);
        });
        
        // Line generator
        const line = d3.line();
        
        // Draw lines
        this.dataGroup.selectAll('.parallel-line')
            .data(sources)
            .join('path')
            .attr('class', 'line parallel-line')
            .attr('d', d => line(dimensions.map(dim => [
                xScale(dim),
                yScales[dim](d[dim] || Math.random())
            ])))
            .attr('stroke', d => colorScale(d.type))
            .attr('fill', 'none')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.6)
            .on('mouseenter', (event, d) => {
                d3.select(event.currentTarget)
                    .attr('stroke-width', 3)
                    .attr('opacity', 1);
                this.showTooltip({ title: d.name, secondary: d.type }, event);
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', (event) => {
                d3.select(event.currentTarget)
                    .attr('stroke-width', 1.5)
                    .attr('opacity', 0.6);
                this.hideTooltip();
            });
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
}


/**
 * Uncertainty Visualization
 */
export class UncertaintyChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.metrics) return;
        
        const metrics = this.data.metrics;
        
        // Scales
        const yScale = d3.scaleBand()
            .domain(metrics.map(d => d.name))
            .range([0, this.height])
            .padding(0.4);
        
        const xExtent = [
            d3.min(metrics, d => d.ci_low),
            d3.max(metrics, d => d.ci_high)
        ];
        const padding = (xExtent[1] - xExtent[0]) * 0.2;
        
        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - padding, xExtent[1] + padding])
            .range([0, this.width])
            .nice();
        
        // Sample size scale for opacity
        const opacityScale = d3.scaleLinear()
            .domain(d3.extent(metrics, d => d.n))
            .range([0.4, 1]);
        
        // Axes
        this.createXAxis(xScale, { label: 'Value' });
        
        // Draw confidence intervals
        const groups = this.dataGroup.selectAll('.ci-group')
            .data(metrics)
            .join('g')
            .attr('class', 'ci-group')
            .attr('transform', d => `translate(0, ${yScale(d.name) + yScale.bandwidth() / 2})`);
        
        // CI line
        groups.append('line')
            .attr('class', 'error-bar')
            .attr('x1', d => xScale(d.ci_low))
            .attr('x2', d => xScale(d.ci_high))
            .attr('y1', 0)
            .attr('y2', 0);
        
        // CI caps
        groups.append('line')
            .attr('class', 'error-bar-cap')
            .attr('x1', d => xScale(d.ci_low))
            .attr('x2', d => xScale(d.ci_low))
            .attr('y1', -5)
            .attr('y2', 5);
        
        groups.append('line')
            .attr('class', 'error-bar-cap')
            .attr('x1', d => xScale(d.ci_high))
            .attr('x2', d => xScale(d.ci_high))
            .attr('y1', -5)
            .attr('y2', 5);
        
        // Point estimate
        groups.append('circle')
            .attr('class', 'scatter-point')
            .attr('cx', d => xScale(d.value))
            .attr('cy', 0)
            .attr('r', 8)
            .attr('fill', '#CF0063')
            .attr('opacity', d => opacityScale(d.n));
        
        // Labels
        groups.append('text')
            .attr('class', 'bar-label')
            .attr('x', -10)
            .attr('y', 4)
            .attr('text-anchor', 'end')
            .text(d => d.name);
        
        // Sample size indicators
        groups.append('text')
            .attr('class', 'data-label-text')
            .attr('x', d => xScale(d.ci_high) + 10)
            .attr('y', 4)
            .text(d => `n=${d.n.toLocaleString()}`);
        
        // Zero line
        if (xExtent[0] < 0 && xExtent[1] > 0) {
            this.dataGroup.append('line')
                .attr('class', 'reference-line')
                .attr('x1', xScale(0))
                .attr('x2', xScale(0))
                .attr('y1', 0)
                .attr('y2', this.height);
        }
        
        // Interactivity
        groups.on('mouseenter', (event, d) => {
            this.showTooltip({
                title: d.name,
                value: d.value,
                format: 'decimal',
                ci: { lower: d.ci_low, upper: d.ci_high },
                n: d.n
            }, event);
        })
        .on('mousemove', (event) => this.moveTooltip(event))
        .on('mouseleave', () => this.hideTooltip());
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
}


/**
 * Flow Diagram
 * For data pipeline visualization
 */
export class FlowDiagram extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            nodeWidth: 120,
            nodeHeight: 50,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.nodes || !this.data.links) return;
        
        const { nodes, links } = this.data;
        const nodeWidth = this.options.nodeWidth;
        const nodeHeight = this.options.nodeHeight;
        
        // Position nodes horizontally
        const xSpacing = this.width / (nodes.length + 1);
        nodes.forEach((node, i) => {
            node.x = xSpacing * (i + 1) - nodeWidth / 2;
            node.y = this.height / 2 - nodeHeight / 2;
        });
        
        // Color by type
        const typeColors = {
            source: '#CF0063',
            storage: '#003366',
            process: '#FF6B35',
            output: '#2E7D32',
            visualization: '#7B1FA2'
        };
        
        // Draw links
        const linkGenerator = d3.linkHorizontal()
            .x(d => d.x)
            .y(d => d.y);
        
        this.dataGroup.selectAll('.flow-link')
            .data(links)
            .join('path')
            .attr('class', 'flow-link')
            .attr('d', d => {
                const source = nodes.find(n => n.id === d.source);
                const target = nodes.find(n => n.id === d.target);
                return linkGenerator({
                    source: { x: source.x + nodeWidth, y: source.y + nodeHeight / 2 },
                    target: { x: target.x, y: target.y + nodeHeight / 2 }
                });
            })
            .style('fill', 'none')
            .style('stroke', '#999')
            .style('stroke-width', 2);
        
        // Draw nodes
        const nodeGroups = this.dataGroup.selectAll('.flow-node')
            .data(nodes)
            .join('g')
            .attr('class', 'flow-node')
            .attr('transform', d => `translate(${d.x}, ${d.y})`);
        
        nodeGroups.append('rect')
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('rx', 8)
            .style('fill', d => typeColors[d.type] || '#999')
            .style('stroke', 'none');
        
        nodeGroups.append('text')
            .attr('x', nodeWidth / 2)
            .attr('y', nodeHeight / 2 + 5)
            .attr('text-anchor', 'middle')
            .style('fill', 'white')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .text(d => d.label);
        
        // Arrows on links
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');
        
        this.dataGroup.selectAll('.flow-link')
            .attr('marker-end', 'url(#arrowhead)');
    }
}
