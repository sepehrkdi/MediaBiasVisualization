/**
 * Bar Chart
 * Horizontal and vertical bar charts
 */

import { BaseChart } from './BaseChart.js';

export class BarChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            orientation: 'vertical',
            padding: 0.2,
            showValues: true,
            sortBy: null, // 'value', 'label', or null
            sortOrder: 'desc',
            colorScale: 'categorical',
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.bars) return;
        
        // Process data
        let bars = [...this.data.bars];
        
        // Sort if needed
        if (this.options.sortBy === 'value') {
            bars.sort((a, b) => this.options.sortOrder === 'desc' 
                ? b.value - a.value 
                : a.value - b.value);
        } else if (this.options.sortBy === 'label') {
            bars.sort((a, b) => this.options.sortOrder === 'desc'
                ? b.label.localeCompare(a.label)
                : a.label.localeCompare(b.label));
        }
        
        const isVertical = this.options.orientation === 'vertical';
        
        // Create scales
        const categoryScale = d3.scaleBand()
            .domain(bars.map(d => d.label))
            .range(isVertical ? [0, this.width] : [0, this.height])
            .padding(this.options.padding);
        
        const valueScale = d3.scaleLinear()
            .domain([0, d3.max(bars, d => d.value) * 1.1])
            .range(isVertical ? [this.height, 0] : [0, this.width])
            .nice();
        
        const colorScale = this.getColorScale(
            this.options.colorScale,
            bars.map(d => d.category || d.label)
        );
        
        // Create axes
        if (isVertical) {
            this.createXAxis(categoryScale, { label: this.options.xLabel });
            this.createYAxis(valueScale, { label: this.options.yLabel });
            this.createGrid(null, valueScale, { showX: true, showY: false });
        } else {
            this.createXAxis(valueScale, { label: this.options.xLabel });
            this.createYAxis(categoryScale, { label: this.options.yLabel });
            this.createGrid(valueScale, null, { showX: false, showY: true });
        }
        
        // Bind data
        const barGroups = this.dataGroup.selectAll('.bar-group')
            .data(bars, d => d.label);
        
        // Exit
        barGroups.exit()
            .transition(this.transition())
            .style('opacity', 0)
            .remove();
        
        // Enter
        const barGroupsEnter = barGroups.enter()
            .append('g')
            .attr('class', 'bar-group');
        
        barGroupsEnter.append('rect')
            .attr('class', 'bar');
        
        if (this.options.showValues) {
            barGroupsEnter.append('text')
                .attr('class', 'bar-value');
        }
        
        // Merge and update
        const allBarGroups = barGroupsEnter.merge(barGroups);
        
        // Update bars
        const barsSelection = allBarGroups.select('.bar');
        
        if (isVertical) {
            barsSelection
                .transition(this.transition())
                .attr('x', d => categoryScale(d.label))
                .attr('y', d => valueScale(d.value))
                .attr('width', categoryScale.bandwidth())
                .attr('height', d => this.height - valueScale(d.value))
                .attr('fill', d => colorScale(d.category || d.label))
                .attr('rx', 2);
        } else {
            barsSelection
                .transition(this.transition())
                .attr('x', 0)
                .attr('y', d => categoryScale(d.label))
                .attr('width', d => valueScale(d.value))
                .attr('height', categoryScale.bandwidth())
                .attr('fill', d => colorScale(d.category || d.label))
                .attr('rx', 2);
        }
        
        // Update value labels
        if (this.options.showValues) {
            const valueLabels = allBarGroups.select('.bar-value');
            
            if (isVertical) {
                valueLabels
                    .transition(this.transition())
                    .attr('x', d => categoryScale(d.label) + categoryScale.bandwidth() / 2)
                    .attr('y', d => valueScale(d.value) - 5)
                    .attr('text-anchor', 'middle')
                    .text(d => this.formatValue(d.value));
            } else {
                valueLabels
                    .transition(this.transition())
                    .attr('x', d => valueScale(d.value) + 5)
                    .attr('y', d => categoryScale(d.label) + categoryScale.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .attr('text-anchor', 'start')
                    .text(d => this.formatValue(d.value));
            }
        }
        
        // Interactivity
        barsSelection
            .on('mouseenter', (event, d) => {
                d3.select(event.currentTarget).classed('is-highlighted', true);
                this.showTooltip({
                    title: d.label,
                    value: d.value,
                    format: 'number',
                    secondary: d.description
                }, event);
            })
            .on('mousemove', (event) => {
                this.moveTooltip(event);
            })
            .on('mouseleave', (event) => {
                d3.select(event.currentTarget).classed('is-highlighted', false);
                this.hideTooltip();
            });
        
        // Add title
        if (this.options.title) {
            this.addTitle(this.options.title, this.options.subtitle);
        }
    }
    
    formatValue(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toLocaleString();
    }
}


/**
 * Diverging Bar Chart
 * For sentiment or comparison data
 */
export class DivergingBarChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            padding: 0.2,
            showValues: true,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.sources) return;
        
        const sources = [...this.data.sources].sort((a, b) => a.avgSentiment - b.avgSentiment);
        
        // Scales
        const yScale = d3.scaleBand()
            .domain(sources.map(d => d.name))
            .range([0, this.height])
            .padding(this.options.padding);
        
        const maxAbsValue = d3.max(sources, d => Math.abs(d.avgSentiment));
        const xScale = d3.scaleLinear()
            .domain([-maxAbsValue * 1.2, maxAbsValue * 1.2])
            .range([0, this.width])
            .nice();
        
        // Color scale for sentiment
        const colorScale = d3.scaleLinear()
            .domain([-1, 0, 1])
            .range(['#C62828', '#757575', '#2E7D32']);
        
        // Axes
        this.createXAxis(xScale, { label: 'Average Sentiment Score' });
        this.axisGroup.select('.axis-y').remove();
        
        // Grid
        this.createGrid(xScale, null, { showX: false, showY: true });
        
        // Center line
        this.dataGroup.selectAll('.center-line').remove();
        this.dataGroup.append('line')
            .attr('class', 'center-line reference-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', this.height);
        
        // Bars
        const bars = this.dataGroup.selectAll('.bar')
            .data(sources, d => d.name);
        
        bars.exit().remove();
        
        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'bar');
        
        barsEnter.merge(bars)
            .transition(this.transition())
            .attr('x', d => d.avgSentiment < 0 ? xScale(d.avgSentiment) : xScale(0))
            .attr('y', d => yScale(d.name))
            .attr('width', d => Math.abs(xScale(d.avgSentiment) - xScale(0)))
            .attr('height', yScale.bandwidth())
            .attr('fill', d => colorScale(d.avgSentiment))
            .attr('rx', 2);
        
        // Labels
        const labels = this.dataGroup.selectAll('.bar-label')
            .data(sources, d => d.name);
        
        labels.exit().remove();
        
        labels.enter()
            .append('text')
            .attr('class', 'bar-label')
            .merge(labels)
            .transition(this.transition())
            .attr('x', d => d.avgSentiment < 0 ? xScale(0) + 5 : xScale(0) - 5)
            .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.avgSentiment < 0 ? 'start' : 'end')
            .text(d => d.name);
        
        // Value labels
        if (this.options.showValues) {
            const valueLabels = this.dataGroup.selectAll('.bar-value')
                .data(sources, d => d.name);
            
            valueLabels.exit().remove();
            
            valueLabels.enter()
                .append('text')
                .attr('class', 'bar-value data-label-text')
                .merge(valueLabels)
                .transition(this.transition())
                .attr('x', d => d.avgSentiment < 0 
                    ? xScale(d.avgSentiment) - 5 
                    : xScale(d.avgSentiment) + 5)
                .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', d => d.avgSentiment < 0 ? 'end' : 'start')
                .text(d => d.avgSentiment >= 0 ? `+${d.avgSentiment.toFixed(2)}` : d.avgSentiment.toFixed(2));
        }
        
        // Interactivity
        this.dataGroup.selectAll('.bar')
            .on('mouseenter', (event, d) => {
                this.showTooltip({
                    title: d.name,
                    value: d.avgSentiment,
                    format: 'sentiment',
                    rows: [
                        { label: 'Articles', value: d.articles, format: 'number' },
                        { label: 'Category', value: d.category }
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
 * Stacked Bar Chart
 */
export class StackedBarChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            padding: 0.2,
            ...options
        });
    }
    
    render() {
        if (!this.data || !this.data.categories || !this.data.series) return;
        
        const { categories, series } = this.data;
        
        // Stack the data
        const stack = d3.stack()
            .keys(series.map(s => s.name));
        
        // Transform data for stacking
        const transformedData = categories.map((cat, i) => {
            const obj = { category: cat };
            series.forEach(s => {
                obj[s.name] = s.values[i];
            });
            return obj;
        });
        
        const stackedData = stack(transformedData);
        
        // Scales
        const xScale = d3.scaleBand()
            .domain(categories)
            .range([0, this.width])
            .padding(this.options.padding);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])
            .range([this.height, 0])
            .nice();
        
        const colorScale = this.getColorScale('categorical', series.map(s => s.name));
        
        // Axes
        this.createXAxis(xScale);
        this.createYAxis(yScale, { label: 'Percentage' });
        
        // Create groups for each series
        const seriesGroups = this.dataGroup.selectAll('.bar-stack')
            .data(stackedData)
            .join('g')
            .attr('class', 'bar-stack')
            .attr('fill', d => colorScale(d.key));
        
        // Create bars
        seriesGroups.selectAll('.bar')
            .data(d => d)
            .join('rect')
            .attr('class', 'bar')
            .transition(this.transition())
            .attr('x', d => xScale(d.data.category))
            .attr('y', d => yScale(d[1]))
            .attr('height', d => yScale(d[0]) - yScale(d[1]))
            .attr('width', xScale.bandwidth());
        
        // Legend
        this.createLegend(series.map(s => s.name), colorScale);
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
    
    createLegend(labels, colorScale) {
        this.legendGroup.selectAll('*').remove();
        
        const legendItems = this.legendGroup.selectAll('.legend-item')
            .data(labels)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${this.options.margin.left + i * 100}, ${this.height + this.options.margin.top + 40})`);
        
        legendItems.append('rect')
            .attr('class', 'legend-swatch')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', d => colorScale(d));
        
        legendItems.append('text')
            .attr('class', 'legend-label')
            .attr('x', 18)
            .attr('y', 10)
            .text(d => d);
    }
}
