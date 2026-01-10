/**
 * Line Chart & Area Chart
 * Time series visualizations
 */

import { BaseChart } from './BaseChart.js';

export class LineChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            showDots: true,
            showArea: false,
            curve: d3.curveMonotoneX,
            strokeWidth: 2,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.timeline) return;
        
        const timeline = this.data.timeline;
        
        // Parse dates
        const parseDate = d3.timeParse('%Y-%m-%d');
        const processedData = timeline.map(d => ({
            ...d,
            date: parseDate(d.date) || new Date(d.date)
        }));
        
        // Scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(processedData, d => d.date))
            .range([0, this.width]);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => d.coverage) * 1.1])
            .range([this.height, 0])
            .nice();
        
        // Axes
        this.createXAxis(xScale, { 
            label: this.options.xLabel,
            tickFormat: d3.timeFormat('%b %Y')
        });
        this.createYAxis(yScale, { label: this.options.yLabel || 'Articles' });
        this.createGrid(xScale, yScale);
        
        // Line generator
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.coverage))
            .curve(this.options.curve);
        
        // Area generator (if showing area)
        if (this.options.showArea) {
            const area = d3.area()
                .x(d => xScale(d.date))
                .y0(this.height)
                .y1(d => yScale(d.coverage))
                .curve(this.options.curve);
            
            this.dataGroup.selectAll('.area').remove();
            this.dataGroup.append('path')
                .datum(processedData)
                .attr('class', 'area color-1')
                .attr('d', area);
        }
        
        // Draw line
        this.dataGroup.selectAll('.line').remove();
        const linePath = this.dataGroup.append('path')
            .datum(processedData)
            .attr('class', 'line color-1')
            .attr('d', line);
        
        // Animate line drawing
        if (this.options.animate) {
            const totalLength = linePath.node().getTotalLength();
            linePath
                .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
                .attr('stroke-dashoffset', totalLength)
                .transition(this.transition(1500))
                .attr('stroke-dashoffset', 0);
        }
        
        // Data points
        if (this.options.showDots) {
            // Use Voronoi for better hover detection on dense time series
            const voronoi = d3.Delaunay
                .from(processedData, d => xScale(d.date), d => yScale(d.coverage))
                .voronoi([0, 0, this.width, this.height]);
            
            // Invisible hover targets
            this.dataGroup.selectAll('.voronoi').remove();
            this.dataGroup.selectAll('.voronoi')
                .data(processedData)
                .join('path')
                .attr('class', 'voronoi')
                .attr('d', (d, i) => voronoi.renderCell(i))
                .on('mouseenter', (event, d) => {
                    this.showDot(xScale(d.date), yScale(d.coverage));
                    this.showTooltip({
                        title: d3.timeFormat('%B %d, %Y')(d.date),
                        value: d.coverage,
                        format: 'number',
                        rows: d.sentiment !== undefined ? [
                            { label: 'Sentiment', value: d.sentiment, format: 'sentiment' }
                        ] : []
                    }, event);
                })
                .on('mousemove', (event) => this.moveTooltip(event))
                .on('mouseleave', () => {
                    this.hideDot();
                    this.hideTooltip();
                });
        }
        
        // Hover dot
        this.dataGroup.selectAll('.hover-dot').remove();
        this.hoverDot = this.dataGroup.append('circle')
            .attr('class', 'hover-dot dot color-1')
            .attr('r', 5)
            .style('opacity', 0);
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
    
    showDot(x, y) {
        this.hoverDot
            .attr('cx', x)
            .attr('cy', y)
            .style('opacity', 1);
    }
    
    hideDot() {
        this.hoverDot.style('opacity', 0);
    }
}


/**
 * Area Chart with Confidence Bands
 */
export class AreaChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            showConfidence: false,
            curve: d3.curveMonotoneX,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.timeline) return;
        
        const timeline = this.data.timeline;
        
        const parseDate = d3.timeParse('%Y-%m-%d');
        const processedData = timeline.map(d => ({
            ...d,
            date: parseDate(d.date) || new Date(d.date)
        }));
        
        // Scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(processedData, d => d.date))
            .range([0, this.width]);
        
        // Use sentiment for y-axis
        const yExtent = d3.extent(processedData, d => d.sentiment);
        const yPadding = (yExtent[1] - yExtent[0]) * 0.2;
        
        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([this.height, 0])
            .nice();
        
        // Axes
        this.createXAxis(xScale, { tickFormat: d3.timeFormat('%b') });
        this.createYAxis(yScale, { label: 'Sentiment' });
        
        // Zero line
        this.dataGroup.selectAll('.zero-line').remove();
        this.dataGroup.append('line')
            .attr('class', 'zero-line reference-line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
        
        // Confidence band (if showing)
        if (this.options.showConfidence) {
            const bandArea = d3.area()
                .x(d => xScale(d.date))
                .y0(d => yScale(d.sentiment - 0.1)) // Simulated CI
                .y1(d => yScale(d.sentiment + 0.1))
                .curve(this.options.curve);
            
            this.dataGroup.selectAll('.ci-band').remove();
            this.dataGroup.append('path')
                .datum(processedData)
                .attr('class', 'ci-band confidence-band color-1')
                .attr('d', bandArea);
        }
        
        // Area
        const positiveArea = d3.area()
            .x(d => xScale(d.date))
            .y0(yScale(0))
            .y1(d => d.sentiment >= 0 ? yScale(d.sentiment) : yScale(0))
            .curve(this.options.curve);
        
        const negativeArea = d3.area()
            .x(d => xScale(d.date))
            .y0(yScale(0))
            .y1(d => d.sentiment < 0 ? yScale(d.sentiment) : yScale(0))
            .curve(this.options.curve);
        
        this.dataGroup.selectAll('.area-positive, .area-negative').remove();
        
        this.dataGroup.append('path')
            .datum(processedData)
            .attr('class', 'area area-positive sentiment-positive')
            .attr('d', positiveArea)
            .style('fill-opacity', 0.3);
        
        this.dataGroup.append('path')
            .datum(processedData)
            .attr('class', 'area area-negative sentiment-negative')
            .attr('d', negativeArea)
            .style('fill-opacity', 0.3);
        
        // Line
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.sentiment))
            .curve(this.options.curve);
        
        this.dataGroup.selectAll('.line').remove();
        this.dataGroup.append('path')
            .datum(processedData)
            .attr('class', 'line')
            .attr('d', line)
            .style('stroke', '#333')
            .style('stroke-width', 1.5);
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
}


/**
 * Multi-line Chart
 * For comparing multiple series
 */
export class MultiLineChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            showDots: false,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.series) return;
        
        const { series, dates } = this.data;
        
        const parseDate = d3.timeParse('%Y-%m-%d');
        const processedDates = dates.map(d => parseDate(d) || new Date(d));
        
        // Scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(processedDates))
            .range([0, this.width]);
        
        const yMax = d3.max(series, s => d3.max(s.values));
        const yScale = d3.scaleLinear()
            .domain([0, yMax * 1.1])
            .range([this.height, 0])
            .nice();
        
        const colorScale = this.getColorScale('categorical', series.map(s => s.name));
        
        // Axes
        this.createXAxis(xScale, { tickFormat: d3.timeFormat('%b %Y') });
        this.createYAxis(yScale, { label: this.options.yLabel });
        
        // Line generator
        const line = d3.line()
            .x((d, i) => xScale(processedDates[i]))
            .y(d => yScale(d))
            .curve(d3.curveMonotoneX);
        
        // Draw lines
        const lines = this.dataGroup.selectAll('.line-series')
            .data(series, d => d.name);
        
        lines.exit().remove();
        
        lines.enter()
            .append('path')
            .attr('class', 'line-series line')
            .merge(lines)
            .transition(this.transition())
            .attr('d', d => line(d.values))
            .attr('stroke', d => colorScale(d.name));
        
        // Interactive highlighting
        this.dataGroup.selectAll('.line-series')
            .on('mouseenter', (event, d) => {
                this.highlight(`.line-series[data-name="${d.name}"]`);
            })
            .on('mouseleave', () => {
                this.clearHighlight();
            });
        
        // Legend
        this.createLegend(series.map(s => s.name), colorScale);
    }
    
    createLegend(labels, colorScale) {
        this.legendGroup.selectAll('*').remove();
        
        const legendItems = this.legendGroup.selectAll('.legend-item')
            .data(labels)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${this.width + this.options.margin.left - 100}, ${this.options.margin.top + i * 20})`);
        
        legendItems.append('line')
            .attr('class', 'legend-line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 5)
            .attr('y2', 5)
            .attr('stroke', d => colorScale(d))
            .attr('stroke-width', 2);
        
        legendItems.append('text')
            .attr('class', 'legend-label')
            .attr('x', 25)
            .attr('y', 9)
            .text(d => d);
    }
}
