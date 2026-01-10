/**
 * Conflict Timeline Chart
 * Stacked dual-panel visualization comparing media coverage vs. conflict intensity
 * for Liberia and Sierra Leone civil wars (1989-1997)
 */

export class ConflictTimelineChart {
    constructor(container, data, options = {}) {
        // Handle container
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!this.container) {
            console.error('ConflictTimelineChart: Container not found');
            return;
        }
        
        this.data = data;
        this.options = {
            margin: { top: 60, right: 100, bottom: 50, left: 70 },
            panelGap: 60,
            animate: true,
            animationDuration: 1500,
            responsive: true,
            ...options
        };
        
        this.tooltip = options.tooltip;
        
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

    setup() {
        // Clear container
        this.container.innerHTML = '';
        
        // Get dimensions
        this.updateDimensions();
        
        // Calculate panel heights (two stacked panels)
        this.panelHeight = (this.height - this.options.panelGap) / 2;
        
        // Create SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('class', 'conflict-timeline-svg')
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Defs for gradients and patterns
        this.defs = this.svg.append('defs');
        this.createGradients();

        // Main chart group
        this.chartGroup = this.svg.append('g')
            .attr('class', 'chart-group')
            .attr('transform', `translate(${this.options.margin.left}, ${this.options.margin.top})`);

        // Create panel groups
        this.topPanel = this.chartGroup.append('g')
            .attr('class', 'panel panel-top');
        
        this.bottomPanel = this.chartGroup.append('g')
            .attr('class', 'panel panel-bottom')
            .attr('transform', `translate(0, ${this.panelHeight + this.options.panelGap})`);

        // Legend group
        this.legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.options.margin.left + this.width - 200}, 25)`);
        
        // Title group
        this.titleGroup = this.svg.append('g')
            .attr('class', 'chart-title-group')
            .attr('transform', `translate(${this.options.margin.left}, 25)`);
    }
    
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(entries => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.resize();
            }, 100);
        });
        this.resizeObserver.observe(this.container);
    }

    createGradients() {
        // Disparity zone gradient
        const disparityGradient = this.defs.append('linearGradient')
            .attr('id', 'disparity-gradient')
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '100%');
        
        disparityGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#FFC107')
            .attr('stop-opacity', 0.15);
        
        disparityGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#FFC107')
            .attr('stop-opacity', 0.05);
    }

    render() {
        if (!this.data || !this.data.timeline) return;

        const timeline = this.data.timeline;
        const annotations = this.data.annotations || [];
        const disparityZone = this.data.disparityZone;

        // Create scales
        this.xScale = d3.scaleLinear()
            .domain(d3.extent(timeline, d => d.year))
            .range([0, this.width]);

        // Y scales for each panel
        const maxEvents = d3.max(timeline, d => Math.max(d.liberiaEvents, d.sierraLeoneEvents));
        const maxIntensity = d3.max(timeline, d => Math.max(d.liberiaCasualtiesPerEvent, d.sierraLeoneCasualtiesPerEvent));

        this.yScaleEvents = d3.scaleLinear()
            .domain([0, maxEvents * 1.1])
            .range([this.panelHeight, 0])
            .nice();

        this.yScaleIntensity = d3.scaleLinear()
            .domain([0, maxIntensity * 1.1])
            .range([this.panelHeight, 0])
            .nice();

        // Clear previous content
        this.topPanel.selectAll('*').remove();
        this.bottomPanel.selectAll('*').remove();

        // Add title
        this.addChartTitle();

        // Render both panels
        this.renderPanel(this.topPanel, timeline, 'events', this.yScaleEvents, 
            'Media Coverage (Documented Events)', 'Events');
        this.renderPanel(this.bottomPanel, timeline, 'intensity', this.yScaleIntensity, 
            'Conflict Intensity (Casualties per Event)', 'Deaths/Event');

        // Add disparity zone highlight
        if (disparityZone) {
            this.renderDisparityZone(disparityZone);
        }

        // Add conflict start annotations
        this.renderAnnotations(annotations);

        // Add legend
        this.renderLegend();
    }

    addChartTitle() {
        // Clear existing title
        this.titleGroup.selectAll('*').remove();

        this.titleGroup.append('text')
            .attr('class', 'chart-title-text')
            .text('West African Civil Wars: Coverage vs. Casualties');
        
        this.titleGroup.append('text')
            .attr('class', 'chart-subtitle-text')
            .attr('y', 20)
            .text('Liberia & Sierra Leone (1989-1997)');
    }

    renderPanel(panel, data, type, yScale, title, yLabel) {
        const valueKey = type === 'events' 
            ? { liberia: 'liberiaEvents', sierraLeone: 'sierraLeoneEvents' }
            : { liberia: 'liberiaCasualtiesPerEvent', sierraLeone: 'sierraLeoneCasualtiesPerEvent' };

        // Panel background
        panel.append('rect')
            .attr('class', 'panel-background')
            .attr('width', this.width)
            .attr('height', this.panelHeight)
            .attr('fill', 'transparent');

        // Panel title
        panel.append('text')
            .attr('class', 'panel-title')
            .attr('x', 0)
            .attr('y', -15)
            .text(title);

        // Grid
        this.renderGrid(panel, yScale);

        // X Axis
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.format('d'))
            .ticks(9);

        panel.append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', `translate(0, ${this.panelHeight})`)
            .call(xAxis);

        // Y Axis
        const yAxis = d3.axisLeft(yScale)
            .ticks(5);

        const yAxisGroup = panel.append('g')
            .attr('class', 'axis axis-y')
            .call(yAxis);

        // Y Axis label
        yAxisGroup.append('text')
            .attr('class', 'axis-label axis-label-y')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.panelHeight / 2)
            .attr('y', -50)
            .text(yLabel);

        // Line generators
        const liberiaLine = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => yScale(d[valueKey.liberia]))
            .curve(d3.curveMonotoneX);

        const sierraLeoneLine = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => yScale(d[valueKey.sierraLeone]))
            .curve(d3.curveMonotoneX);

        // Draw Liberia line
        const liberiaPath = panel.append('path')
            .datum(data)
            .attr('class', 'line liberia-line')
            .attr('d', liberiaLine)
            .attr('fill', 'none')
            .attr('stroke', '#d62728')
            .attr('stroke-width', 2.5);

        // Draw Sierra Leone line
        const sierraLeonePath = panel.append('path')
            .datum(data)
            .attr('class', 'line sierra-leone-line')
            .attr('d', sierraLeoneLine)
            .attr('fill', 'none')
            .attr('stroke', '#2ca02c')
            .attr('stroke-width', 2.5);

        // Animate lines
        if (this.options.animate) {
            this.animateLine(liberiaPath);
            this.animateLine(sierraLeonePath);
        }

        // Add data points with hover
        this.addDataPoints(panel, data, valueKey, yScale, type);
    }

    renderGrid(panel, yScale) {
        const gridGroup = panel.append('g')
            .attr('class', 'grid');

        // Horizontal grid lines
        gridGroup.append('g')
            .attr('class', 'grid grid-y')
            .call(d3.axisLeft(yScale)
                .tickSize(-this.width)
                .tickFormat('')
                .ticks(5)
            );
    }

    animateLine(path) {
        const totalLength = path.node().getTotalLength();
        
        // Set initial state for animation
        path
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength);
        
        // Animate the line
        path.transition()
            .duration(this.options.animationDuration || 1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0)
            .on('end', () => {
                // Clean up after animation
                path.attr('stroke-dasharray', null);
            });
    }

    addDataPoints(panel, data, valueKey, yScale, type) {
        const countries = [
            { key: 'liberia', class: 'liberia-dot', valueKey: valueKey.liberia, color: '#d62728' },
            { key: 'sierraLeone', class: 'sierra-leone-dot', valueKey: valueKey.sierraLeone, color: '#2ca02c' }
        ];

        countries.forEach(country => {
            panel.selectAll(`.${country.class}`)
                .data(data.filter(d => d[country.valueKey] > 0))
                .join('circle')
                .attr('class', `dot ${country.class}`)
                .attr('cx', d => this.xScale(d.year))
                .attr('cy', d => yScale(d[country.valueKey]))
                .attr('r', 5)
                .attr('fill', country.color)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseenter', (event, d) => this.handleDotHover(event, d, country.key, type))
                .on('mousemove', (event) => this.moveTooltip(event))
                .on('mouseleave', () => this.hideTooltip());
        });
    }

    handleDotHover(event, d, country, type) {
        const countryNames = { liberia: 'Liberia', sierraLeone: 'Sierra Leone' };
        const countryName = countryNames[country];
        
        let content;
        if (type === 'events') {
            const events = country === 'liberia' ? d.liberiaEvents : d.sierraLeoneEvents;
            const deaths = country === 'liberia' ? d.liberiaDeaths : d.sierraLeoneDeaths;
            content = {
                title: `${countryName} - ${d.year}`,
                rows: [
                    { label: 'Documented Events', value: events, format: 'number' },
                    { label: 'Total Deaths', value: deaths.toLocaleString(), format: 'text' }
                ]
            };
        } else {
            const intensity = country === 'liberia' ? d.liberiaCasualtiesPerEvent : d.sierraLeoneCasualtiesPerEvent;
            const deaths = country === 'liberia' ? d.liberiaDeaths : d.sierraLeoneDeaths;
            const events = country === 'liberia' ? d.liberiaEvents : d.sierraLeoneEvents;
            content = {
                title: `${countryName} - ${d.year}`,
                rows: [
                    { label: 'Casualties per Event', value: intensity.toFixed(1), format: 'text' },
                    { label: 'Total Deaths', value: deaths.toLocaleString(), format: 'text' },
                    { label: 'Events', value: events, format: 'number' }
                ]
            };
        }

        // Add disparity insight for 1991-1993
        if (d.year >= 1991 && d.year <= 1993 && type === 'intensity') {
            const liberiaIntensity = d.liberiaCasualtiesPerEvent;
            const slIntensity = d.sierraLeoneCasualtiesPerEvent;
            if (liberiaIntensity > 0 && slIntensity > 0) {
                const ratio = (liberiaIntensity / slIntensity).toFixed(1);
                content.rows.push({
                    label: '⚠️ Intensity Ratio',
                    value: `Liberia ${ratio}× deadlier`,
                    format: 'text',
                    highlight: true
                });
            }
        }

        this.showTooltip(content, event);
    }

    renderDisparityZone(zone) {
        const x1 = this.xScale(zone.start);
        const x2 = this.xScale(zone.end);
        const zoneWidth = x2 - x1;

        // Top panel disparity zone
        this.topPanel.insert('rect', ':first-child')
            .attr('class', 'disparity-zone')
            .attr('x', x1)
            .attr('y', 0)
            .attr('width', zoneWidth)
            .attr('height', this.panelHeight)
            .attr('fill', 'url(#disparity-gradient)')
            .attr('stroke', '#FFC107')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,2')
            .attr('opacity', 0)
            .transition()
            .delay(this.options.animationDuration)
            .duration(500)
            .attr('opacity', 1);

        // Bottom panel disparity zone
        this.bottomPanel.insert('rect', ':first-child')
            .attr('class', 'disparity-zone')
            .attr('x', x1)
            .attr('y', 0)
            .attr('width', zoneWidth)
            .attr('height', this.panelHeight)
            .attr('fill', 'url(#disparity-gradient)')
            .attr('stroke', '#FFC107')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,2')
            .attr('opacity', 0)
            .transition()
            .delay(this.options.animationDuration)
            .duration(500)
            .attr('opacity', 1);

        // Disparity label (positioned between panels)
        const labelY = this.panelHeight + this.options.panelGap / 2;
        
        const labelGroup = this.chartGroup.append('g')
            .attr('class', 'disparity-label-group')
            .attr('transform', `translate(${x1 + zoneWidth / 2}, ${labelY})`)
            .style('opacity', 0);

        labelGroup.append('rect')
            .attr('class', 'disparity-label-bg')
            .attr('x', -140)
            .attr('y', -12)
            .attr('width', 280)
            .attr('height', 24)
            .attr('rx', 4)
            .attr('fill', '#FFF8E1')
            .attr('stroke', '#FFC107');

        labelGroup.append('text')
            .attr('class', 'disparity-label-text')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .text('⚠️ Coverage Gap: High deaths, low documentation');

        labelGroup.transition()
            .delay(this.options.animationDuration + 500)
            .duration(500)
            .style('opacity', 1);
    }

    renderAnnotations(annotations) {
        annotations.forEach(annotation => {
            const x = this.xScale(annotation.year);
            const color = annotation.country === 'liberia' ? '#d62728' : '#2ca02c';

            // Vertical line spanning both panels
            [this.topPanel, this.bottomPanel].forEach(panel => {
                panel.append('line')
                    .attr('class', `annotation-line annotation-${annotation.country}`)
                    .attr('x1', x)
                    .attr('x2', x)
                    .attr('y1', 0)
                    .attr('y2', this.panelHeight)
                    .attr('stroke', color)
                    .attr('stroke-width', 1.5)
                    .attr('stroke-dasharray', '6,3')
                    .attr('opacity', 0.7);
            });

            // Annotation label at top
            this.topPanel.append('g')
                .attr('class', 'annotation-label-group')
                .attr('transform', `translate(${x}, -30)`)
                .call(g => {
                    g.append('rect')
                        .attr('x', -60)
                        .attr('y', -10)
                        .attr('width', 120)
                        .attr('height', 20)
                        .attr('rx', 3)
                        .attr('fill', color)
                        .attr('opacity', 0.1);
                    
                    g.append('text')
                        .attr('class', 'annotation-text')
                        .attr('text-anchor', 'middle')
                        .attr('dy', 4)
                        .attr('fill', color)
                        .attr('font-weight', 500)
                        .text(annotation.label);
                });
        });
    }

    renderLegend() {
        this.legendGroup.selectAll('*').remove();

        const legendItems = [
            { label: 'Liberia', color: '#d62728' },
            { label: 'Sierra Leone', color: '#2ca02c' }
        ];

        const legendItem = this.legendGroup.selectAll('.legend-item')
            .data(legendItems)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * 100}, 0)`);

        legendItem.append('line')
            .attr('x1', 0)
            .attr('x2', 25)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', d => d.color)
            .attr('stroke-width', 2.5);

        legendItem.append('circle')
            .attr('cx', 12.5)
            .attr('cy', 0)
            .attr('r', 4)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

        legendItem.append('text')
            .attr('x', 30)
            .attr('y', 4)
            .attr('class', 'legend-text')
            .text(d => d.label);
    }

    updateDimensions() {
        const containerRect = this.container.getBoundingClientRect();
        this.width = (containerRect.width || 800) - this.options.margin.left - this.options.margin.right;
        this.height = (containerRect.height || 600) - this.options.margin.top - this.options.margin.bottom;
        
        // Ensure minimum dimensions
        this.width = Math.max(this.width, 400);
        this.height = Math.max(this.height, 400);
        
        // Recalculate panel height
        this.panelHeight = (this.height - this.options.panelGap) / 2;
    }
    
    resize() {
        this.updateDimensions();
        this.setup();
        if (this.data) {
            this.render();
        }
    }
    
    showTooltip(content, event) {
        if (this.tooltip) {
            this.tooltip.show(content, event);
        }
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.hide();
        }
    }
    
    moveTooltip(event) {
        if (this.tooltip) {
            this.tooltip.move(event);
        }
    }
    
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.container.innerHTML = '';
    }
}
