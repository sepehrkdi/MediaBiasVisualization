/**
 * Base Chart Class
 * Foundation for all D3.js visualizations
 */

export class BaseChart {
    constructor(container, data, options = {}) {
        // Handle container
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!this.container) {
            console.error('Chart container not found');
            return;
        }
        
        this.data = data;
        this.options = {
            margin: { top: 40, right: 30, bottom: 50, left: 60 },
            animate: true,
            animationDuration: 750,
            responsive: true,
            ...options
        };
        
        this.tooltip = options.tooltip;
        this.svg = null;
        this.chartGroup = null;
        
        // Initialize
        this.setup();
        if (this.data) {
            this.render();
        }
        
        // Setup resize observer
        if (this.options.responsive) {
            this.setupResizeObserver();
        }
    }
    
    /**
     * Setup SVG and chart group
     */
    setup() {
        // Clear container
        this.container.innerHTML = '';
        
        // Get dimensions
        this.updateDimensions();
        
        // Create SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
        
        // Create main group with margin transform
        this.chartGroup = this.svg.append('g')
            .attr('class', 'chart-group')
            .attr('transform', `translate(${this.options.margin.left}, ${this.options.margin.top})`);
        
        // Create standard groups
        this.axisGroup = this.chartGroup.append('g').attr('class', 'axes');
        this.gridGroup = this.chartGroup.append('g').attr('class', 'grid');
        this.dataGroup = this.chartGroup.append('g').attr('class', 'data');
        this.annotationGroup = this.chartGroup.append('g').attr('class', 'annotations');
        this.legendGroup = this.svg.append('g').attr('class', 'legend');
    }
    
    /**
     * Update chart dimensions based on container
     */
    updateDimensions() {
        const containerRect = this.container.getBoundingClientRect();
        this.width = (containerRect.width || 600) - this.options.margin.left - this.options.margin.right;
        this.height = (containerRect.height || 400) - this.options.margin.top - this.options.margin.bottom;
        
        // Ensure minimum dimensions
        this.width = Math.max(this.width, 200);
        this.height = Math.max(this.height, 150);
    }
    
    /**
     * Setup resize observer for responsive charts
     */
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(entries => {
            // Debounce resize
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.resize();
            }, 100);
        });
        
        this.resizeObserver.observe(this.container);
    }
    
    /**
     * Handle resize
     */
    resize() {
        this.updateDimensions();
        
        // Update SVG dimensions
        this.svg
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`);
        
        // Re-render
        if (this.data) {
            this.render();
        }
    }
    
    /**
     * Main render method - override in subclasses
     */
    render() {
        // To be implemented by subclasses
    }
    
    /**
     * Update chart with new data
     */
    update(newData, options = {}) {
        this.data = newData;
        Object.assign(this.options, options);
        this.render();
    }
    
    /**
     * Create X axis
     */
    createXAxis(scale, options = {}) {
        const {
            tickCount = null,
            tickFormat = null,
            label = '',
            position = 'bottom'
        } = options;
        
        let axis = position === 'top' ? d3.axisTop(scale) : d3.axisBottom(scale);
        
        if (tickCount) axis.ticks(tickCount);
        if (tickFormat) axis.tickFormat(tickFormat);
        
        // Remove existing axis
        this.axisGroup.select('.axis-x').remove();
        
        // Add axis
        const axisG = this.axisGroup.append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', `translate(0, ${position === 'top' ? 0 : this.height})`)
            .call(axis);
        
        // Add label
        if (label) {
            axisG.append('text')
                .attr('class', 'axis-label axis-label-x')
                .attr('x', this.width / 2)
                .attr('y', position === 'top' ? -30 : 40)
                .text(label);
        }
        
        return axisG;
    }
    
    /**
     * Create Y axis
     */
    createYAxis(scale, options = {}) {
        const {
            tickCount = null,
            tickFormat = null,
            label = '',
            position = 'left'
        } = options;
        
        let axis = position === 'right' ? d3.axisRight(scale) : d3.axisLeft(scale);
        
        if (tickCount) axis.ticks(tickCount);
        if (tickFormat) axis.tickFormat(tickFormat);
        
        // Remove existing axis
        this.axisGroup.select('.axis-y').remove();
        
        // Add axis
        const axisG = this.axisGroup.append('g')
            .attr('class', 'axis axis-y')
            .attr('transform', `translate(${position === 'right' ? this.width : 0}, 0)`)
            .call(axis);
        
        // Add label
        if (label) {
            axisG.append('text')
                .attr('class', 'axis-label axis-label-y')
                .attr('transform', 'rotate(-90)')
                .attr('x', -this.height / 2)
                .attr('y', position === 'right' ? 45 : -45)
                .text(label);
        }
        
        return axisG;
    }
    
    /**
     * Create grid lines
     */
    createGrid(xScale, yScale, options = {}) {
        const { showX = true, showY = true } = options;
        
        // Clear existing grid
        this.gridGroup.selectAll('*').remove();
        
        if (showY && xScale) {
            this.gridGroup.append('g')
                .attr('class', 'grid grid-x')
                .attr('transform', `translate(0, ${this.height})`)
                .call(d3.axisBottom(xScale)
                    .tickSize(-this.height)
                    .tickFormat('')
                );
        }
        
        if (showX && yScale) {
            this.gridGroup.append('g')
                .attr('class', 'grid grid-y')
                .call(d3.axisLeft(yScale)
                    .tickSize(-this.width)
                    .tickFormat('')
                );
        }
    }
    
    /**
     * Add chart title
     */
    addTitle(title, subtitle = '') {
        const titleGroup = this.svg.append('g')
            .attr('class', 'chart-title')
            .attr('transform', `translate(${this.options.margin.left}, 20)`);
        
        titleGroup.append('text')
            .attr('class', 'chart-title-text')
            .text(title);
        
        if (subtitle) {
            titleGroup.append('text')
                .attr('class', 'chart-subtitle-text')
                .attr('y', 18)
                .text(subtitle);
        }
    }
    
    /**
     * Show tooltip
     */
    showTooltip(content, event) {
        if (this.tooltip) {
            this.tooltip.show(content, event);
        }
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.hide();
        }
    }
    
    /**
     * Move tooltip
     */
    moveTooltip(event) {
        if (this.tooltip) {
            this.tooltip.move(event);
        }
    }
    
    /**
     * Get color scale
     */
    getColorScale(type, domain) {
        const colorSchemes = {
            categorical: d3.schemeTableau10,
            sequential: d3.interpolateMagma,
            diverging: d3.interpolateRdYlGn,
            sentiment: ['#C62828', '#757575', '#2E7D32']
        };
        
        if (type === 'categorical') {
            return d3.scaleOrdinal(colorSchemes.categorical).domain(domain);
        } else if (type === 'sequential') {
            return d3.scaleSequential(colorSchemes.sequential).domain(domain);
        } else if (type === 'diverging') {
            return d3.scaleDiverging(colorSchemes.diverging).domain(domain);
        } else if (type === 'sentiment') {
            return d3.scaleLinear()
                .domain([-1, 0, 1])
                .range(colorSchemes.sentiment);
        }
        
        return d3.scaleOrdinal(colorSchemes.categorical);
    }
    
    /**
     * Add annotation
     */
    addAnnotation(options) {
        const {
            x, y,
            text,
            dx = 0, dy = 0,
            connector = true
        } = options;
        
        const annotationG = this.annotationGroup.append('g')
            .attr('class', 'annotation');
        
        if (connector) {
            annotationG.append('line')
                .attr('class', 'annotation-line')
                .attr('x1', x)
                .attr('y1', y)
                .attr('x2', x + dx)
                .attr('y2', y + dy);
        }
        
        annotationG.append('text')
            .attr('class', 'annotation-text')
            .attr('x', x + dx)
            .attr('y', y + dy)
            .text(text);
        
        return annotationG;
    }
    
    /**
     * Highlight elements
     */
    highlight(selector, highlight = true) {
        this.dataGroup.selectAll(selector)
            .classed('is-highlighted', highlight);
        
        // Dim non-highlighted elements
        this.dataGroup.selectAll(`*:not(${selector})`)
            .classed('is-dimmed', highlight);
    }
    
    /**
     * Clear highlights
     */
    clearHighlight() {
        this.dataGroup.selectAll('*')
            .classed('is-highlighted', false)
            .classed('is-dimmed', false);
    }
    
    /**
     * Transition helper
     */
    transition(duration) {
        return d3.transition()
            .duration(this.options.animate ? (duration || this.options.animationDuration) : 0)
            .ease(d3.easeCubicOut);
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        clearTimeout(this.resizeTimeout);
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
