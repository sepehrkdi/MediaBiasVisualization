/**
 * PieChart / Donut Chart
 * Interactive pie chart for regional conflict data
 * Features: exploded highlighted slices, click-to-isolate, pulsing glow animation
 */

import { BaseChart } from './BaseChart.js';

export class PieChart extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            margin: { top: 50, right: 180, bottom: 80, left: 20 },
            innerRadiusRatio: 0.45,  // Donut hole size (0 = pie, 0.5 = half donut)
            outerRadiusRatio: 0.85,  // How much of container to use
            explodeOffset: 12,       // Pixels to offset highlighted slices
            showLabels: true,
            showLegend: true,
            showSummary: true,
            animatePulse: true,      // Pulsing glow on highlighted slices
            ...options
        });
        
        this.selectedSlice = null;  // Track isolated slice
        this.arcGenerator = null;
        this.arcHoverGenerator = null;
        this.pieGenerator = null;
    }
    
    /**
     * Main render method
     */
    render() {
        if (!this.data || !this.data.countries) {
            console.warn('PieChart: No valid data provided');
            return;
        }
        
        // Clear previous content
        this.dataGroup.selectAll('*').remove();
        this.legendGroup.selectAll('*').remove();
        this.annotationGroup.selectAll('*').remove();
        
        // Remove any existing summary group
        this.chartGroup.select('.pie-summary-group').remove();
        
        // Calculate dimensions
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.width, this.height) / 2 * this.options.outerRadiusRatio;
        const innerRadius = radius * this.options.innerRadiusRatio;
        
        // Create arc generators
        this.arcGenerator = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius);
        
        this.arcHoverGenerator = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius * 1.05);
        
        // Create pie generator
        this.pieGenerator = d3.pie()
            .value(d => d.events)
            .sort(null)  // Maintain data order
            .padAngle(0.02);
        
        // Generate pie data
        const pieData = this.pieGenerator(this.data.countries);
        
        // Create center group for the pie
        const pieGroup = this.dataGroup
            .append('g')
            .attr('class', 'pie-group')
            .attr('transform', `translate(${centerX}, ${centerY})`);
        
        // Draw arcs
        const arcs = pieGroup.selectAll('.pie-arc')
            .data(pieData)
            .enter()
            .append('path')
            .attr('class', d => {
                let classes = 'pie-arc';
                if (d.data.highlighted) classes += ' is-highlighted';
                return classes;
            })
            .attr('d', this.arcGenerator)
            .attr('fill', d => d.data.color)
            .attr('transform', d => this.getExplodeTransform(d))
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => this.handleMouseEnter(event, d))
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', (event, d) => this.handleMouseLeave(event, d))
            .on('click', (event, d) => this.handleClick(event, d));
        
        // Animate entrance
        if (this.options.animate) {
            arcs
                .attr('d', d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(innerRadius))
                .transition()
                .duration(this.options.animationDuration)
                .ease(d3.easeCubicOut)
                .attrTween('d', d => {
                    const interpolate = d3.interpolate(
                        { startAngle: d.startAngle, endAngle: d.startAngle },
                        { startAngle: d.startAngle, endAngle: d.endAngle }
                    );
                    return t => this.arcGenerator(interpolate(t));
                });
        }
        
        // Add donut center text
        this.renderCenterText(pieGroup);
        
        // Add title
        this.renderTitle();
        
        // Add legend
        if (this.options.showLegend) {
            this.renderLegend();
        }
        
        // Add summary box
        if (this.options.showSummary && this.data.summary) {
            this.renderSummaryBox();
        }
        
        // Start pulse animation for highlighted slices
        if (this.options.animatePulse) {
            this.startPulseAnimation();
        }
    }
    
    /**
     * Calculate transform for exploded slices
     */
    getExplodeTransform(d) {
        if (!d.data.highlighted) return 'translate(0, 0)';
        
        // Get centroid direction
        const [x, y] = this.arcGenerator.centroid(d);
        const distance = Math.sqrt(x * x + y * y);
        
        if (distance === 0) return 'translate(0, 0)';
        
        // Normalize and multiply by offset
        const offsetX = (x / distance) * this.options.explodeOffset;
        const offsetY = (y / distance) * this.options.explodeOffset;
        
        return `translate(${offsetX}, ${offsetY})`;
    }
    
    /**
     * Handle mouse enter on slice
     */
    handleMouseEnter(event, d) {
        const arc = d3.select(event.currentTarget);
        
        // Scale up if not dimmed
        if (!arc.classed('is-dimmed')) {
            arc.transition()
                .duration(200)
                .attr('d', this.arcHoverGenerator);
        }
        
        // Show tooltip
        this.showTooltip({
            title: d.data.name,
            rows: [
                { label: 'Events', value: d.data.events, format: 'number' },
                { label: 'Share', value: d.data.percentage / 100, format: 'percent' },
                { label: 'Rank', value: `#${d.data.rank}` }
            ],
            secondary: d.data.highlighted ? '⭐ Highlighted Country' : null
        }, event);
    }
    
    /**
     * Handle mouse leave on slice
     */
    handleMouseLeave(event, d) {
        const arc = d3.select(event.currentTarget);
        
        // Scale back down
        arc.transition()
            .duration(200)
            .attr('d', this.arcGenerator);
        
        this.hideTooltip();
    }
    
    /**
     * Handle click to isolate slice
     */
    handleClick(event, d) {
        const clickedArc = d3.select(event.currentTarget);
        const isCurrentlyIsolated = clickedArc.classed('is-isolated');
        
        // Get all arcs
        const allArcs = this.dataGroup.selectAll('.pie-arc');
        
        if (isCurrentlyIsolated) {
            // Clear isolation - restore all slices
            allArcs
                .classed('is-dimmed', false)
                .classed('is-isolated', false)
                .transition()
                .duration(300)
                .style('opacity', 1);
            
            this.selectedSlice = null;
        } else {
            // Isolate this slice - dim others
            allArcs
                .classed('is-dimmed', arc => arc !== d)
                .classed('is-isolated', arc => arc === d)
                .transition()
                .duration(300)
                .style('opacity', arc => arc === d ? 1 : 0.25);
            
            this.selectedSlice = d;
        }
    }
    
    /**
     * Render center text for donut chart
     */
    renderCenterText(pieGroup) {
        if (this.options.innerRadiusRatio === 0) return;  // No center for pie chart
        
        const centerGroup = pieGroup.append('g')
            .attr('class', 'donut-center');
        
        // Total events
        centerGroup.append('text')
            .attr('class', 'donut-center-value')
            .attr('dy', '-0.2em')
            .text(this.formatNumber(this.data.total_events));
        
        // Label
        centerGroup.append('text')
            .attr('class', 'donut-center-label')
            .attr('dy', '1.2em')
            .text('Total Events');
    }
    
    /**
     * Render chart title with region and time period
     */
    renderTitle() {
        const titleGroup = this.svg.append('g')
            .attr('class', 'chart-title')
            .attr('transform', `translate(${this.options.margin.left + this.width / 2}, 25)`);
        
        // Main title - region name
        titleGroup.append('text')
            .attr('class', 'chart-title-text')
            .attr('text-anchor', 'middle')
            .text(this.data.region || 'Regional Conflict Distribution');
        
        // Subtitle - time period
        if (this.data.time_period) {
            titleGroup.append('text')
                .attr('class', 'chart-subtitle-text')
                .attr('text-anchor', 'middle')
                .attr('dy', '1.4em')
                .text(`${this.data.time_period.start_year} - ${this.data.time_period.end_year}`);
        }
    }
    
    /**
     * Render legend
     */
    renderLegend() {
        const legendX = this.width + this.options.margin.left + 10;
        const legendY = this.options.margin.top + 20;
        const itemHeight = 22;
        const maxItems = Math.min(this.data.countries.length, 10);
        
        this.legendGroup.attr('transform', `translate(${legendX}, ${legendY})`);
        
        // Only show top items by events
        const legendData = this.data.countries
            .slice(0, maxItems);
        
        const legendItems = this.legendGroup.selectAll('.legend-item')
            .data(legendData)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * itemHeight})`)
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => this.highlightSlice(d, true))
            .on('mouseleave', (event, d) => this.highlightSlice(d, false));
        
        // Color swatch
        legendItems.append('rect')
            .attr('width', 14)
            .attr('height', 14)
            .attr('rx', 2)
            .attr('fill', d => d.color)
            .attr('class', d => d.highlighted ? 'legend-swatch is-highlighted' : 'legend-swatch');
        
        // Country name
        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 11)
            .attr('class', 'legend-text')
            .text(d => d.name);
        
        // Event count
        legendItems.append('text')
            .attr('x', 150)
            .attr('y', 11)
            .attr('class', 'legend-value')
            .attr('text-anchor', 'end')
            .text(d => this.formatNumber(d.events));
        
        // Show "and X more" if truncated
        if (this.data.countries.length > maxItems) {
            this.legendGroup.append('text')
                .attr('class', 'legend-more')
                .attr('x', 0)
                .attr('y', maxItems * itemHeight + 10)
                .text(`+ ${this.data.countries.length - maxItems} more countries`);
        }
    }
    
    /**
     * Highlight a slice from legend hover
     */
    highlightSlice(data, highlight) {
        const arcs = this.dataGroup.selectAll('.pie-arc');
        
        if (highlight && !this.selectedSlice) {
            arcs
                .transition()
                .duration(200)
                .style('opacity', d => d.data.name === data.name ? 1 : 0.4);
        } else if (!this.selectedSlice) {
            arcs
                .transition()
                .duration(200)
                .style('opacity', 1);
        }
    }
    
    /**
     * Render summary box for highlighted countries
     */
    renderSummaryBox() {
        const summary = this.data.summary;
        const highlighted = this.data.highlighted_countries || [];
        
        if (!summary || highlighted.length === 0) return;
        
        // Calculate position - bottom right corner inside the chart
        const boxWidth = 180;
        const boxHeight = 75;
        const boxX = this.width - boxWidth + 10;
        const boxY = this.height - boxHeight + 15;
        
        // Create summary box group inside the chart
        const summaryGroup = this.chartGroup.append('g')
            .attr('class', 'pie-summary-group')
            .attr('transform', `translate(${boxX}, ${boxY})`);
        
        // Background rectangle
        summaryGroup.append('rect')
            .attr('class', 'pie-summary-bg')
            .attr('width', boxWidth)
            .attr('height', boxHeight)
            .attr('rx', 6)
            .attr('ry', 6);
        
        // Title
        summaryGroup.append('text')
            .attr('class', 'pie-summary-title')
            .attr('x', boxWidth / 2)
            .attr('y', 16)
            .attr('text-anchor', 'middle')
            .text(`Highlighted: ${highlighted.join(' & ')}`);
        
        // Stats row
        const statsY = 42;
        
        // Percentage stat
        summaryGroup.append('text')
            .attr('class', 'pie-summary-value')
            .attr('x', boxWidth * 0.25)
            .attr('y', statsY)
            .attr('text-anchor', 'middle')
            .text(`${summary.highlighted_percentage.toFixed(1)}%`);
        
        summaryGroup.append('text')
            .attr('class', 'pie-summary-label')
            .attr('x', boxWidth * 0.25)
            .attr('y', statsY + 14)
            .attr('text-anchor', 'middle')
            .text('of events');
        
        // Events count stat
        summaryGroup.append('text')
            .attr('class', 'pie-summary-value')
            .attr('x', boxWidth * 0.75)
            .attr('y', statsY)
            .attr('text-anchor', 'middle')
            .text(this.formatNumber(summary.highlighted_total_events));
        
        summaryGroup.append('text')
            .attr('class', 'pie-summary-label')
            .attr('x', boxWidth * 0.75)
            .attr('y', statsY + 14)
            .attr('text-anchor', 'middle')
            .text('incidents');
    }
    
    /**
     * Start pulsing glow animation for highlighted slices
     */
    startPulseAnimation() {
        // Add CSS animation class to highlighted arcs
        this.dataGroup.selectAll('.pie-arc.is-highlighted')
            .classed('pulse-glow', true);
    }
    
    /**
     * Update chart with new data (for region switching)
     */
    updateData(newData) {
        if (!newData || !newData.countries) return;
        
        this.data = newData;
        this.selectedSlice = null;
        
        // Re-render with new data
        this.render();
    }
    
    /**
     * Format numbers with K/M suffixes
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }
}
